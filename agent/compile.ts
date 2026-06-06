/**
 * compile.ts
 * ----------
 * Injects tailored.json (or base.json) into template.tex and compiles to PDF.
 * Output filename is derived from name + role title: Raghunandan_Sharma_ReactJS_Developer.pdf
 *
 * Usage:
 *   npx ts-node agent/compile.ts
 *   npx ts-node agent/compile.ts --base
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import {
	loadResume,
	OUTPUT_DIR,
	BASE_RESUME_PATH,
	TAILORED_PATH,
} from "./lib/resume";
import { injectIntoTemplate, buildOutputFilename } from "./lib/latex";

const TEMPLATE_PATH = path.resolve(__dirname, "../resume/template.tex");

function main() {
	const useBase = process.argv.includes("--base");
	const jsonPath = useBase ? BASE_RESUME_PATH : TAILORED_PATH;
	const label = useBase ? "base.json" : "tailored.json";

	if (!fs.existsSync(jsonPath)) {
		console.error(`❌ ${label} not found at ${jsonPath}`);
		console.error(
			useBase
				? "Make sure resume/base.json exists."
				: "Run 'npm run tailor' first.",
		);
		process.exit(1);
	}
	if (!fs.existsSync(TEMPLATE_PATH)) {
		console.error(`❌ template.tex not found at ${TEMPLATE_PATH}`);
		process.exit(1);
	}

	const resume = loadResume(jsonPath);
	const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
	const baseName = buildOutputFilename(
		resume.header.name,
		resume.header.title,
	);
	const TEX_OUT = path.join(OUTPUT_DIR, `${baseName}.tex`);
	const PDF_OUT = path.join(OUTPUT_DIR, `${baseName}.pdf`);

	console.log(`\n📄 Compiling from ${label}...`);
	console.log(`   Output: ${baseName}.pdf\n`);

	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	fs.writeFileSync(TEX_OUT, injectIntoTemplate(template, resume), "utf-8");

	const cmd = `pdflatex -interaction=nonstopmode -output-directory="${OUTPUT_DIR}" "${TEX_OUT}"`;

	console.log("⏳ Running pdflatex (pass 1)...");
	try {
		execSync(cmd, { stdio: "pipe" });
	} catch {
		/* check PDF below */
	}

	console.log("⏳ Running pdflatex (pass 2)...");
	try {
		execSync(cmd, { stdio: "pipe" });
	} catch {
		/* check PDF below */
	}

	if (!fs.existsSync(PDF_OUT)) {
		console.error(
			"❌ pdflatex failed. Check the .log file in output/ for details.",
		);
		const logPath = path.join(OUTPUT_DIR, `${baseName}.log`);
		if (fs.existsSync(logPath)) {
			const lines = fs.readFileSync(logPath, "utf-8").split("\n");
			console.error("\n--- Last 30 lines ---");
			console.error(lines.slice(-30).join("\n"));
		}
		process.exit(1);
	}

	// Clean auxiliary files
	[".aux", ".log", ".out", ".tex"].forEach((ext) => {
		const f = path.join(OUTPUT_DIR, `${baseName}${ext}`);
		if (fs.existsSync(f)) fs.unlinkSync(f);
	});

	console.log(`\n✅ PDF ready: ${PDF_OUT}\n`);
}

main();
