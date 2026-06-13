/**
 * agent/compile.ts
 * ----------------
 * Compiles tailored.json (or base.json) into a PDF via pdflatex.
 * No AI involved — pure LaTeX compilation.
 *
 * Usage:
 *   npx ts-node agent/compile.ts
 *   npx ts-node agent/compile.ts --base
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { loadResume } from "../src/utils/resume.utils";
import {
	injectIntoTemplate,
	buildOutputFilename,
} from "../src/utils/latex.utils";

const ROOT = path.resolve(__dirname, "..");
const OUTPUT_DIR = path.join(ROOT, "output");
const TEMPLATE_PATH = path.join(ROOT, "src", "templates", "resume.tex");

function main() {
	const useBase = process.argv.includes("--base");
	const jsonPath = useBase
		? path.join(ROOT, "resume", "base.json")
		: path.join(OUTPUT_DIR, "tailored.json");
	const label = useBase ? "base.json" : "tailored.json";

	if (!fs.existsSync(jsonPath)) {
		console.error(
			`❌ ${label} not found. ${useBase ? "" : "Run npm run apply first."}`,
		);
		process.exit(1);
	}

	const resume = loadResume(jsonPath);
	const template = fs.readFileSync(TEMPLATE_PATH, "utf-8");
	const baseName = buildOutputFilename(
		resume.header.name,
		resume.header.title,
	);
	const texOut = path.join(OUTPUT_DIR, `${baseName}.tex`);
	const pdfOut = path.join(OUTPUT_DIR, `${baseName}.pdf`);

	console.log(`\n📄 Compiling from ${label}...`);
	console.log(`   Output: ${baseName}.pdf\n`);

	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	fs.writeFileSync(texOut, injectIntoTemplate(template, resume));

	const cmd = `pdflatex -interaction=nonstopmode -output-directory="${OUTPUT_DIR}" "${texOut}"`;
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

	if (!fs.existsSync(pdfOut)) {
		console.error("❌ pdflatex failed. Check the .log file in output/");
		process.exit(1);
	}

	[".aux", ".log", ".out", ".tex"].forEach((ext) => {
		const f = path.join(OUTPUT_DIR, `${baseName}${ext}`);
		if (fs.existsSync(f)) fs.unlinkSync(f);
	});

	console.log(`\n✅ PDF ready: ${pdfOut}\n`);
}

main();
