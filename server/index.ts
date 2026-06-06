/**
 * server/index.ts
 * ---------------
 * Express backend for the Resume Agent UI.
 * - POST /api/run     — runs the apply pipeline, streams progress via SSE
 * - GET  /api/output  — returns all output files (email, tailored JSON, base JSON)
 * - GET  /api/pdf/:name — serves a PDF from the output directory
 */

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";

const app = express();
const PORT = 3001;
const ROOT = path.resolve(__dirname, "..");
const OUTPUT = path.join(ROOT, "output");

app.use(cors());
app.use(express.json());

// ─── Types ────────────────────────────────────────────────────────────────────

interface RunRequest {
	jdText: string;
	recruiterName?: string;
	companyName?: string;
	includeCover?: boolean;
}

interface PipelineStep {
	id: string;
	label: string;
	status: "pending" | "running" | "done" | "failed" | "skipped";
	duration?: string;
}

// ─── POST /api/run ────────────────────────────────────────────────────────────
// Writes the JD to a temp file, runs apply.ts step by step,
// and streams SSE events to the frontend.

app.post("/api/run", async (req, res) => {
	const { jdText, recruiterName, companyName, includeCover } =
		req.body as RunRequest;

	if (!jdText?.trim()) {
		res.status(400).json({ error: "JD text is required" });
		return;
	}

	// SSE headers
	res.setHeader("Content-Type", "text/event-stream");
	res.setHeader("Cache-Control", "no-cache");
	res.setHeader("Connection", "keep-alive");
	res.flushHeaders();

	const send = (event: string, data: unknown) => {
		res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
	};

	// Write JD to temp file
	fs.mkdirSync(OUTPUT, { recursive: true });
	const jdPath = path.join(OUTPUT, "_current_jd.txt");
	fs.writeFileSync(jdPath, jdText, "utf-8");

	// Define pipeline steps
	const steps: PipelineStep[] = [
		{ id: "tailor", label: "Tailoring resume to JD", status: "pending" },
		{ id: "compile", label: "Compiling resume PDF", status: "pending" },
		{ id: "email", label: "Generating recruiter email", status: "pending" },
		{
			id: "coverletter",
			label: "Generating cover letter",
			status: includeCover ? "pending" : "skipped",
		},
	];

	send("steps", steps);

	// Build commands
	const tsnode = "npx ts-node";
	const emailFlags = [
		recruiterName ? `--name "${recruiterName}"` : "",
		companyName ? `--company "${companyName}"` : "",
	]
		.filter(Boolean)
		.join(" ");

	const commands: Record<string, string> = {
		tailor: `${tsnode} agent/tailor.ts "${jdPath}"`,
		compile: `${tsnode} agent/compile.ts`,
		email: `${tsnode} agent/email.ts "${jdPath}" ${emailFlags}`.trim(),
		coverletter: `${tsnode} agent/cover-letter.ts "${jdPath}"`,
	};

	// Run each step sequentially
	for (const step of steps) {
		if (step.status === "skipped") {
			send("step_update", { id: step.id, status: "skipped" });
			continue;
		}

		send("step_update", { id: step.id, status: "running" });
		const start = Date.now();

		const success = await new Promise<boolean>((resolve) => {
			const [cmd, ...args] = commands[step.id].split(" ");
			const proc = spawn(cmd, args, {
				cwd: ROOT,
				shell: true,
				env: { ...process.env },
			});

			let stderr = "";
			proc.stderr.on("data", (d) => {
				stderr += d.toString();
			});
			proc.on("close", (code) => {
				if (code !== 0) {
					send("step_error", {
						id: step.id,
						error: stderr.slice(-500),
					});
				}
				resolve(code === 0);
			});
		});

		const duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;

		if (success) {
			send("step_update", { id: step.id, status: "done", duration });
		} else {
			send("step_update", { id: step.id, status: "failed", duration });
			send("pipeline_error", {
				message: `Pipeline stopped at: ${step.label}`,
			});
			res.end();
			return;
		}
	}

	send("pipeline_done", { message: "All steps completed" });
	res.end();
});

// ─── GET /api/output ──────────────────────────────────────────────────────────
// Returns all output files the UI needs to display results.

app.get("/api/output", (_req, res) => {
	const read = (file: string): string | null => {
		const p = path.join(OUTPUT, file);
		return fs.existsSync(p) ? fs.readFileSync(p, "utf-8") : null;
	};

	const readJSON = (file: string) => {
		const content = read(file);
		return content ? JSON.parse(content) : null;
	};

	// Find the generated resume PDF (name varies by role title)
	const pdfFiles = fs.existsSync(OUTPUT)
		? fs
				.readdirSync(OUTPUT)
				.filter((f) => f.endsWith(".pdf") && f !== "cover_letter.pdf")
		: [];

	res.json({
		base: readJSON("../resume/base.json"),
		tailored: readJSON("tailored.json"),
		email: read("email.txt"),
		coverLetter: read("cover_letter.txt"),
		resumePdf: pdfFiles[0] ?? null,
		coverPdf: fs.existsSync(path.join(OUTPUT, "cover_letter.pdf"))
			? "cover_letter.pdf"
			: null,
	});
});

// ─── GET /api/pdf/:name ───────────────────────────────────────────────────────
// Serves a PDF file from the output directory.

app.get("/api/pdf/:name", (req, res) => {
	const name = path.basename(req.params.name); // prevent path traversal
	const pdfPath = path.join(OUTPUT, name);
	if (!fs.existsSync(pdfPath)) {
		res.status(404).json({ error: "PDF not found" });
		return;
	}
	res.setHeader("Content-Type", "application/pdf");
	res.sendFile(pdfPath);
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
	console.log(`\n✅ Resume Agent server running at http://localhost:${PORT}`);
	console.log("   Open http://localhost:3000 in your browser\n");
});
