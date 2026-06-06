/**
 * cover-letter.ts
 * ---------------
 * Generates a 3-paragraph cover letter PDF from base.json + JD.
 *
 * Usage:
 *   npx ts-node agent/cover-letter.ts jd/company-role.txt
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { callOllama } from "./lib/ollama";
import { loadResume, parseJDFromArgs, OUTPUT_DIR } from "./lib/resume";
import { esc, escUrl } from "./lib/latex";
import type { Resume } from "./lib/types";

function buildPrompt(resume: Resume, jd: string): string {
	const experienceSummary = resume.experience
		.map(
			(role) =>
				`${role.title} at ${role.company} (${role.period}):\n` +
				role.bullets.map((b) => `  - ${b.verb} ${b.text}`).join("\n"),
		)
		.join("\n\n");

	const projectSummary = resume.projects
		.map(
			(proj) =>
				`${proj.name}:\n` +
				proj.bullets.map((b) => `  - ${b.verb} ${b.text}`).join("\n"),
		)
		.join("\n\n");

	return `You are writing a professional cover letter body for a software engineer.

## RULES

1. Write exactly 3 paragraphs. No more, no less.
2. Para 1: Strong opening statement about fit. No "I am writing to express my interest".
3. Para 2: 2-3 specific accomplishments from the experience below that match the JD. Be concrete.
4. Para 3: 1-2 sentence close. Mention availability for a conversation.
5. Do NOT mention salary, relocation, or visa.
6. Do NOT use: "I am passionate", "I am excited to", "dynamic team", "fast-paced".
7. Keep total length to 200-250 words.
8. Return ONLY the 3 paragraphs — no salutation, no sign-off, no preamble.

## CANDIDATE

Name: ${resume.header.name}
Title: ${resume.header.title}
Skills: ${resume.skills.flatMap((c) => c.items).join(", ")}

Experience:
${experienceSummary}

Projects:
${projectSummary}

## JOB DESCRIPTION

${jd}

Write the 3 paragraphs now:`;
}

function buildCoverLetterTex(resume: Resume, bodyText: string): string {
	const { name, title } = resume.header;
	const { email, phone, linkedin, portfolio } = resume.contact;

	const paragraphs = bodyText
		.split(/\n\n+/)
		.map((p) => p.trim())
		.filter((p) => p.length > 0)
		.map((p) => esc(p))
		.join("\n\n\\vspace{8pt}\n");

	return `\\documentclass[10pt,a4paper]{article}
\\usepackage[margin=0.8in]{geometry}
\\usepackage{xcolor}
\\usepackage[hidelinks]{hyperref}
\\usepackage{parskip}
\\usepackage{changepage}
\\usepackage[default]{roboto}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{10pt}
\\begin{document}

\\begin{center}
    {\\Huge \\textbf{${esc(name)}}}\\\\
    \\vspace{2pt}
    {\\large ${esc(title)}}
\\end{center}

\\begin{adjustwidth}{-1.5in}{-1in}
\\noindent
\\colorbox{gray!20}{%
  \\parbox{\\dimexpr\\paperwidth+2in-2\\fboxsep\\relax}{%
    \\centering
    \\small \\href{mailto:${email}}{${esc(email)}} \\quad\\quad
    ${esc(phone)} \\quad\\quad
    \\href{${linkedin}}{${esc(linkedin.replace("https://", ""))}} \\quad\\quad
    \\href{${portfolio}}{${esc(portfolio.replace("https://", ""))}}
  }%
}
\\end{adjustwidth}

\\vspace{16pt}
${paragraphs}
\\vspace{16pt}

${esc(name)}\\\\
\\href{mailto:${email}}{${esc(email)}} \\quad | \\quad ${esc(phone)}

\\end{document}`;
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error(
			"Usage:\n  npx ts-node agent/cover-letter.ts jd/company-role.txt",
		);
		process.exit(1);
	}

	const jdText = parseJDFromArgs(args);
	const resume = loadResume();
	const prompt = buildPrompt(resume, jdText);

	console.log("\n⏳ Generating cover letter via Ollama...\n");
	const bodyText = await callOllama(prompt, {
		temperature: 0.5,
		numPredict: 1024,
	});

	fs.mkdirSync(OUTPUT_DIR, { recursive: true });

	const txtPath = path.join(OUTPUT_DIR, "cover_letter.txt");
	fs.writeFileSync(
		txtPath,
		`${resume.header.name}\n${resume.contact.email} | ${resume.contact.phone}\n\n${bodyText}`,
	);
	console.log("✅ Cover letter text → output/cover_letter.txt\n");
	console.log("─────────────────────────────────────────");
	console.log(bodyText);
	console.log("─────────────────────────────────────────\n");

	const texPath = path.join(OUTPUT_DIR, "cover_letter.tex");
	const pdfPath = path.join(OUTPUT_DIR, "cover_letter.pdf");
	fs.writeFileSync(texPath, buildCoverLetterTex(resume, bodyText));

	console.log("⏳ Compiling cover letter PDF...");
	const cmd = `pdflatex -interaction=nonstopmode -output-directory="${OUTPUT_DIR}" "${texPath}"`;
	try {
		execSync(cmd, { stdio: "pipe" });
	} catch {
		/* check PDF below */
	}

	if (!fs.existsSync(pdfPath)) {
		console.error("❌ PDF compile failed. Check output/cover_letter.log");
		process.exit(1);
	}

	[".aux", ".log", ".out"].forEach((ext) => {
		const f = path.join(OUTPUT_DIR, `cover_letter${ext}`);
		if (fs.existsSync(f)) fs.unlinkSync(f);
	});

	console.log("✅ PDF → output/cover_letter.pdf\n");
}

main().catch((err) => {
	console.error("Fatal:", err);
	process.exit(1);
});
