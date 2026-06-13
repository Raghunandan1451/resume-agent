/**
 * agent/apply.ts
 * --------------
 * CLI entry point — runs the full pipeline then compiles PDF.
 * Business logic lives in src/services/pipeline.service.ts
 *
 * Usage:
 *   npx ts-node agent/apply.ts jd/role.txt
 *   npx ts-node agent/apply.ts jd/role.txt --name Priya --cover
 */

import path from "path";
import { execSync } from "child_process";
import {
	formatRecruiterEmail,
	runPipeline,
	OUTPUT_DIR,
} from "../src/services/pipeline.service";
import {
	loadResume,
	parseJDFromArgs,
	getFlag,
} from "../src/utils/resume.utils";
import {
	injectIntoTemplate,
	buildOutputFilename,
} from "../src/utils/latex.utils";
import { buildCoverLetterTex } from "./lib/cover-letter-tex";
import fs from "fs";

const TEMPLATE_PATH = path.resolve(__dirname, "../src/templates/resume.tex");

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error(
			"Usage:\n  npx ts-node agent/apply.ts jd/role.txt [--name Priya] [--cover]",
		);
		process.exit(1);
	}

	const recruiterName = getFlag(args, "--name");
	const includeCover = args.includes("--cover");
	const jdArg = args.find((a) => !a.startsWith("--") && a !== recruiterName);
	if (!jdArg) {
		console.error("No JD file provided.");
		process.exit(1);
	}

	const jdText = parseJDFromArgs([jdArg]);
	const resume = loadResume();

	// Run pipeline — all AI calls happen inside here
	const result = await runPipeline(jdText, resume, {
		recruiterName,
		includeCover,
	});

	// Print email to terminal
	console.log("─────────────────────────────────────────");
	console.log("SUBJECT:", result.email.subject);
	console.log("─────────────────────────────────────────");
	console.log(formatRecruiterEmail(result.email, resume, { recruiterName }));
	console.log("─────────────────────────────────────────\n");

	// Compile resume PDF
	console.log("📄 Compiling resume PDF...");
	const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
	const baseName = buildOutputFilename(
		resume.header.name,
		result.jdAnalysis.roleTitle,
	);
	const texOut = path.join(OUTPUT_DIR, `${baseName}.tex`);
	const pdfOut = path.join(OUTPUT_DIR, `${baseName}.pdf`);

	fs.writeFileSync(
		texOut,
		injectIntoTemplate(template, result.tailoredResume),
	);
	const cmd = `pdflatex -interaction=nonstopmode -output-directory="${OUTPUT_DIR}" "${texOut}"`;
	try {
		execSync(cmd, { stdio: "pipe" });
		execSync(cmd, { stdio: "pipe" });
	} catch {
		/* check below */
	}
	if (!fs.existsSync(pdfOut)) {
		console.error("❌ PDF compile failed");
		process.exit(1);
	}
	[".aux", ".log", ".out", ".tex"].forEach((ext) => {
		const f = path.join(OUTPUT_DIR, `${baseName}${ext}`);
		if (fs.existsSync(f)) fs.unlinkSync(f);
	});
	console.log(`✅ Resume PDF → output/${baseName}.pdf`);

	// Compile cover letter PDF if requested
	if (includeCover && result.coverLetter) {
		console.log("📄 Compiling cover letter PDF...");
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
			/* check below */
		}
		if (fs.existsSync(clPdf)) {
			[".aux", ".log", ".out"].forEach((ext) => {
				const f = path.join(OUTPUT_DIR, `cover_letter${ext}`);
				if (fs.existsSync(f)) fs.unlinkSync(f);
			});
			console.log("✅ Cover letter PDF → output/cover_letter.pdf");
		}
	}

	console.log("\n✅ All done. Check the output/ folder.\n");
}

main().catch((err) => {
	console.error("Fatal:", err);
	process.exit(1);
});
