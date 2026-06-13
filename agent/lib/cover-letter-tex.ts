// Extracted LaTeX builder for cover letter PDF
// Used by both agent/apply.ts and server/index.ts

import { esc, escUrl } from "../../src/utils/latex.utils";
import type { Resume } from "../../src/types";

export function buildCoverLetterTex(resume: Resume, bodyText: string): string {
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
