/**
 * server/index.ts
 * ---------------
 * Express backend for the Resume Agent UI.
 * Calls runPipeline() directly — no process spawning.
 *
 * Routes:
 *   POST /api/run      — runs pipeline, streams SSE progress
 *   GET  /api/output   — returns all output files
 *   GET  /api/pdf/:name — serves a PDF
 */

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { execSync } from "child_process";
import { runPipeline, OUTPUT_DIR } from "../src/services/pipeline.service";
import { checkOllama } from "../src/services/ollama.service";
import { loadResume } from "../src/utils/resume.utils";
import {
	injectIntoTemplate,
	buildOutputFilename,
} from "../src/utils/latex.utils";
import { buildCoverLetterTex } from "../agent/lib/cover-letter-tex";

const app = express();
const PORT = 3001;
const ROOT = path.resolve(__dirname, "..");
const TEMPLATE_PATH = path.join(ROOT, "src", "templates", "resume.tex");

app.use(cors());
app.use(express.json());

// ─── POST /api/run ────────────────────────────────────────────────────────────

app.post("/api/run", async (req, res) => {
	const { jdText, recruiterName, companyName, includeCover, includeEmail } =
		req.body;
	const includeEmailFlag = !!includeEmail;
	console.log("Run request options:", {
		recruiterName,
		companyName,
		includeCover,
		includeEmail: includeEmailFlag,
	});

	if (!jdText?.trim()) {
		res.status(400).json({ error: "JD text is required" });
		return;
	}

	// SSE setup
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.flushHeaders();

	// Quick health-check to ensure Ollama is reachable before starting pipeline
	try {
		await checkOllama(3000);
	} catch (err) {
		const send = (event: string, data: unknown) =>
			res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
		send("pipeline_error", { message: (err as Error).message });
		res.end();
		return;
	}

	const send = (event: string, data: unknown) =>
		res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);

	// Initial step definitions — matched to pipeline.service.ts log order
	const steps = [
		{
			id: "analyze",
			label: "Analyzing job description",
			status: "pending",
		},
		{
			id: "match",
			label: "Extracting matching experience",
			status: "pending",
		},
		{
			id: "position",
			label: "Building candidate positioning",
			status: "pending",
		},
		{ id: "generate", label: "Generating outputs", status: "pending" },
		{
			id: "email",
			label: "Generating recruiter email",
			status: includeEmailFlag ? "pending" : "skipped",
		},
		{ id: "compile", label: "Compiling resume PDF", status: "pending" },
		{
			id: "cover",
			label: "Compiling cover letter PDF",
			status: includeCover ? "pending" : "skipped",
		},
	];
	send("steps", steps);

	let restoreConsole: (() => void) | null = null;

	try {
		const resume = loadResume();

		// Monkey-patch console.log to emit SSE step updates
		const originalLog = console.log;
		restoreConsole = () => {
			console.log = originalLog;
		};
		const stepMap: Record<string, string> = {
			"[1/4]": "analyze",
			"[2/4]": "match",
			"[3/4]": "position",
			"[4/4]": "generate",
		};
		const startTimes: Record<string, number> = {};
		let activePipelineStep: string | null = null;

		console.log = (...args: unknown[]) => {
			const msg = args.join(" ");
			const nextStep = Object.entries(stepMap).find(([key]) =>
				msg.includes(key),
			)?.[1];
			if (nextStep && activePipelineStep !== nextStep) {
				if (activePipelineStep) {
					send("step_update", {
						id: activePipelineStep,
						status: "done",
						duration: startTimes[activePipelineStep]
							? `${((Date.now() - startTimes[activePipelineStep]) / 1000).toFixed(1)}s`
							: "",
					});
				}
				activePipelineStep = nextStep;
				startTimes[nextStep] = Date.now();
				send("step_update", { id: nextStep, status: "running" });
			}
			originalLog(...args);
		};

		// Save JD to temp file
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
		fs.writeFileSync(path.join(OUTPUT_DIR, "_current_jd.txt"), jdText);

		// Remove stale outputs so a failed run doesn't expose previous results
		// Always remove tailored.json so UI won't show stale tailored resume
		const safeUnlink = (p: string) => {
			try {
				if (fs.existsSync(p)) fs.unlinkSync(p);
			} catch {
				/* ignore */
			}
		};
		safeUnlink(path.join(OUTPUT_DIR, "tailored.json"));
		// If email generation not requested, remove previous email
		if (!includeEmailFlag) safeUnlink(path.join(OUTPUT_DIR, "email.txt"));
		// If cover not requested, remove previous cover files
		if (!includeCover) {
			safeUnlink(path.join(OUTPUT_DIR, "cover_letter.txt"));
			safeUnlink(path.join(OUTPUT_DIR, "cover_letter.pdf"));
		}

		// Run pipeline
		const result = await runPipeline(jdText, resume, {
			recruiterName,
			companyName,
			includeCover,
			includeEmail: includeEmailFlag,
		});

		// Restore console.log
		restoreConsole();
		restoreConsole = null;

		if (activePipelineStep) {
			send("step_update", {
				id: activePipelineStep,
				status: "done",
				duration: startTimes[activePipelineStep]
					? `${((Date.now() - startTimes[activePipelineStep]) / 1000).toFixed(1)}s`
					: "",
			});
		}

		// Emit email step result (was optional)
		send("step_update", {
			id: "email",
			status: result.email
				? "done"
				: includeEmailFlag
					? "failed"
					: "skipped",
		});

		// Compile resume PDF
		send("step_update", { id: "compile", status: "running" });
		const compileStart = Date.now();
		let compileError = "";
		try {
			// Verify template exists before attempting compile
			if (!fs.existsSync(TEMPLATE_PATH)) {
				throw new Error(`Template not found: ${TEMPLATE_PATH}`);
			}
			const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
			const baseName = buildOutputFilename(
				result.tailoredResume.header.name,
				result.tailoredResume.header.title,
			);
			const texOut = path.join(OUTPUT_DIR, `${baseName}.tex`);
			const pdfOut = path.join(OUTPUT_DIR, `${baseName}.pdf`);
			fs.writeFileSync(
				texOut,
				injectIntoTemplate(template, result.tailoredResume),
			);

			// Pass full PATH so pdflatex is found (MiKTeX adds to user PATH, not system PATH)
			const env = { ...process.env };
			const cmd = `pdflatex -interaction=nonstopmode -output-directory="${OUTPUT_DIR}" "${texOut}"`;
			try {
				execSync(cmd, { stdio: "pipe", env });
			} catch {
				/* non-zero ok if PDF produced */
			}
			try {
				execSync(cmd, { stdio: "pipe", env });
			} catch {
				/* second pass */
			}

			const compiled = fs.existsSync(pdfOut);
			if (compiled) {
				[".aux", ".log", ".out", ".tex"].forEach((ext) => {
					const f = path.join(OUTPUT_DIR, `${baseName}${ext}`);
					if (fs.existsSync(f)) fs.unlinkSync(f);
				});
			} else {
				// Keep .log for diagnosis — print last 20 lines to server console
				const logPath = path.join(OUTPUT_DIR, `${baseName}.log`);
				if (fs.existsSync(logPath)) {
					const logLines = fs
						.readFileSync(logPath, "utf-8")
						.split("\n")
						.slice(-20)
						.join("\n");
					console.error("pdflatex log tail:\n", logLines);
				}
			}
			send("step_update", {
				id: "compile",
				status: compiled ? "done" : "failed",
				duration: `${((Date.now() - compileStart) / 1000).toFixed(1)}s`,
			});
		} catch (err) {
			compileError = (err as Error).message;
			console.error("Compile error:", compileError);
			send("step_update", {
				id: "compile",
				status: "failed",
				duration: `${((Date.now() - compileStart) / 1000).toFixed(1)}s`,
			});
			send("step_error", { id: "compile", error: compileError });
		}

		// Compile cover letter PDF if requested
		if (includeCover && result.coverLetter) {
			send("step_update", { id: "cover", status: "running" });
			const coverStart = Date.now();
			const clTex = path.join(OUTPUT_DIR, "cover_letter.tex");
			const clPdf = path.join(OUTPUT_DIR, "cover_letter.pdf");
			fs.writeFileSync(
				clTex,
				buildCoverLetterTex(resume, result.coverLetter.body),
			);
			try {
				execSync(
					`pdflatex -interaction=nonstopmode -output-directory="${OUTPUT_DIR}" "${clTex}"`,
					{ stdio: "pipe" },
				);
			} catch {
				/* ok */
			}
			[".aux", ".log", ".out"].forEach((ext) => {
				const f = path.join(OUTPUT_DIR, `cover_letter${ext}`);
				if (fs.existsSync(f)) fs.unlinkSync(f);
			});
			send("step_update", {
				id: "cover",
				status: fs.existsSync(clPdf) ? "done" : "failed",
				duration: `${((Date.now() - coverStart) / 1000).toFixed(1)}s`,
			});
		}

		send("pipeline_done", { message: "Pipeline complete" });
	} catch (err) {
		restoreConsole?.();
		console.error("Pipeline error:", err);
		send("pipeline_error", { message: (err as Error).message });
	}

	res.end();
});

// ─── GET /api/output ──────────────────────────────────────────────────────────

app.get("/api/output", (_req, res) => {
	const read = (file: string) => {
		const p = path.join(OUTPUT_DIR, file);
		return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
	};
	const readJSON = (file: string) => {
		const c = read(file);
		return c ? JSON.parse(c) : null;
	};
	// Return most recently modified resume PDF — prevents stale results from old runs
	const resumePdf = fs.existsSync(OUTPUT_DIR)
		? (fs
				.readdirSync(OUTPUT_DIR)
				.filter((f) => f.endsWith(".pdf") && f !== "cover_letter.pdf")
				.map((f) => ({
					name: f,
					mtime: fs.statSync(path.join(OUTPUT_DIR, f)).mtimeMs,
				}))
				.sort((a, b) => b.mtime - a.mtime)[0]?.name ?? null)
		: null;

	res.json({
		base: readJSON("../resume/base.json"),
		tailored: readJSON("tailored.json"),
		email: read("email.txt"),
		coverLetter: read("cover_letter.txt"),
		resumePdf,
		coverPdf: fs.existsSync(path.join(OUTPUT_DIR, "cover_letter.pdf"))
			? "cover_letter.pdf"
			: null,
	});
});

// ─── GET /api/pdf/:name ───────────────────────────────────────────────────────

app.get("/api/pdf/:name", (req, res) => {
	const name = path.basename(req.params.name);
	const pdfPath = path.join(OUTPUT_DIR, name);
	if (!fs.existsSync(pdfPath)) {
		res.status(404).json({ error: "PDF not found" });
		return;
	}
	res.setHeader("Content-Type", "application/pdf");
	res.sendFile(pdfPath);
});

app.listen(PORT, () => {
	console.log(`\n✅ Resume Agent server → http://localhost:${PORT}`);
	console.log("   Open http://localhost:3000\n");
});

// Run a background health-check and log status
// Retry startup health-check once with a longer timeout to accommodate cold starts
checkOllama(8000)
	.then(() => console.log("Ollama health-check: reachable"))
	.catch(async (firstErr) => {
		console.warn(
			"Ollama health-check (first attempt) failed -",
			firstErr.message,
		);
		try {
			await checkOllama(8000);
			console.log("Ollama health-check: reachable (retry)");
		} catch (err) {
			console.warn(
				"Ollama health-check: unreachable after retry -",
				(err as Error).message,
			);
		}
	});
