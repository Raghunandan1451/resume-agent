// ─── LaTeX utilities ──────────────────────────────────────────────────────────
// Escaping and section builders used by compile.ts and cover-letter.ts.

import type { Resume, Role, Project } from "./types";

// ─── Escaping ─────────────────────────────────────────────────────────────────

// Escapes special LaTeX characters in plain text content.
export function esc(str: string): string {
	return str
		.replace(/\\/g, "\\textbackslash{}")
		.replace(/&/g, "\\&")
		.replace(/%/g, "\\%")
		.replace(/\$/g, "\\$")
		.replace(/#/g, "\\#")
		.replace(/_/g, "\\_")
		.replace(/\{/g, "\\{")
		.replace(/\}/g, "\\}")
		.replace(/~/g, "\\textasciitilde{}")
		.replace(/\^/g, "\\textasciicircum{}");
}

// URLs go inside \href{} and must NOT be LaTeX-escaped.
export function escUrl(url: string): string {
	return url;
}

// ─── Section builders ─────────────────────────────────────────────────────────

// Builds the 2-column skills tabular from the skills array.
// Categories are paired left/right: [0,1], [2,3], [4,5]
export function buildSkillsTable(skills: Resume["skills"]): string {
	const rows: string[] = [];
	for (let i = 0; i < skills.length; i += 2) {
		const left = skills[i];
		const right = skills[i + 1];
		const leftCell = `\\textbf{${esc(left.label)}:} ${left.items.map(esc).join(", ")}`;
		const rightCell = right
			? `\\textbf{${esc(right.label)}:} ${right.items.map(esc).join(", ")}`
			: "";
		rows.push(`    ${leftCell} &\n    ${rightCell} \\\\`);
	}
	return rows.join("\n");
}

// Builds the Work Experience section.
// Skips company name for consecutive roles at the same company.
export function buildExperience(experience: Role[]): string {
	return experience
		.map((role, index) => {
			const bullets = role.bullets
				.map(
					(b) => `    \\item \\textbf{${esc(b.verb)}} ${esc(b.text)}`,
				)
				.join("\n\n");
			const techStack = role.tech.map(esc).join(" \\textbullet{} ");
			const prevRole = experience[index - 1];
			const showCompany = !prevRole || prevRole.company !== role.company;
			const companyLine = showCompany
				? `\\noindent\n\\textbf{${esc(role.company)}} \\\\\n`
				: "";

			return `${companyLine}\\textbf{${esc(role.title)}} \\hfill \\textit{${esc(role.period)}} \\\\
\\textit{\\small \\textbf{Tech:} ${techStack}}
\\vspace{-4pt}
\\begin{itemize}
${bullets}
\\end{itemize}`;
		})
		.join("\n\n");
}

// Builds the Projects section.
export function buildProjects(projects: Project[]): string {
	return projects
		.map((proj) => {
			const bullets = proj.bullets
				.map(
					(b) => `    \\item \\textbf{${esc(b.verb)}} ${esc(b.text)}`,
				)
				.join("\n\n");
			const techStack = proj.tech.map(esc).join(" \\textbullet{} ");

			return `\\textbf{${esc(proj.name)}} \\textcolor{blue}{\\href{${escUrl(proj.url)}}{${esc(proj.urlLabel)}}} \\hfill \\textit{${esc(proj.period)}} \\\\
\\textit{\\small \\textbf{Tech:} ${techStack}}
\\vspace{-4pt}
\\begin{itemize}
${bullets}
\\end{itemize}`;
		})
		.join("\n\n");
}

// ─── Full template injector ───────────────────────────────────────────────────
// Replaces all {{PLACEHOLDERS}} in the .tex template with escaped resume data.

export function injectIntoTemplate(template: string, resume: Resume): string {
	const { header, contact, skills, experience, projects, education } = resume;
	const linkedinLabel = contact.linkedin.replace("https://", "");
	const portfolioLabel = contact.portfolio.replace("https://", "");

	return template
		.replace("{{NAME}}", esc(header.name))
		.replace("{{TITLE}}", esc(header.title))
		.replace("{{SUMMARY}}", esc(header.summary))
		.replace(/\{\{EMAIL\}\}/g, esc(contact.email))
		.replace("{{PHONE}}", esc(contact.phone))
		.replace("{{LINKEDIN_URL}}", escUrl(contact.linkedin))
		.replace("{{LINKEDIN_LABEL}}", esc(linkedinLabel))
		.replace("{{PORTFOLIO_URL}}", escUrl(contact.portfolio))
		.replace("{{PORTFOLIO_LABEL}}", esc(portfolioLabel))
		.replace("{{SKILLS_TABLE}}", buildSkillsTable(skills))
		.replace("{{EXPERIENCE}}", buildExperience(experience))
		.replace("{{PROJECTS}}", buildProjects(projects))
		.replace("{{EDU_DEGREE}}", esc(education.degree))
		.replace("{{EDU_INSTITUTION}}", esc(education.institution))
		.replace("{{EDU_CGPA}}", esc(education.cgpa))
		.replace(
			"{{EDU_COURSEWORK}}",
			education.coursework.map(esc).join(", "),
		);
}

// ─── Output filename builder ──────────────────────────────────────────────────
// "Raghunandan Sharma" + "ReactJS Developer" → "Raghunandan_Sharma_ReactJS_Developer"

export function buildOutputFilename(name: string, roleTitle: string): string {
	const sanitise = (str: string) =>
		str
			.trim()
			.replace(/[^a-zA-Z0-9 ]/g, "")
			.replace(/\s+/g, "_");
	return `${sanitise(name)}_${sanitise(roleTitle)}`;
}
