// ─── LaTeX utilities ──────────────────────────────────────────────────────────

import type { Resume, Role, Project } from "../types";

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

export function escUrl(url: string): string {
	return url;
}

export function buildSkillsTable(skills: Resume["skills"]): string {
	const rows: string[] = [];
	for (let i = 0; i < skills.length; i += 2) {
		const left = skills[i];
		const right = skills[i + 1];
		const lCell = `\\textbf{${esc(left.label)}:} ${left.items.map(esc).join(", ")}`;
		const rCell = right
			? `\\textbf{${esc(right.label)}:} ${right.items.map(esc).join(", ")}`
			: "";
		rows.push(`    ${lCell} &\n    ${rCell} \\\\`);
	}
	return rows.join("\n");
}

export function buildExperience(experience: Role[]): string {
	return experience
		.map((role, i) => {
			const bullets = role.bullets
				.map(
					(b) => `    \\item \\textbf{${esc(b.verb)}} ${esc(b.text)}`,
				)
				.join("\n\n");
			const techStack = role.tech.map(esc).join(" \\textbullet{} ");
			const prevRole = experience[i - 1];
			const companyLine =
				!prevRole || prevRole.company !== role.company
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

export function injectIntoTemplate(template: string, resume: Resume): string {
	const { header, contact, skills, experience, projects, education } = resume;
	return template
		.replace("{{NAME}}", esc(header.name))
		.replace("{{TITLE}}", esc(header.title))
		.replace("{{SUMMARY}}", esc(header.summary))
		.replace(/\{\{EMAIL\}\}/g, esc(contact.email))
		.replace("{{PHONE}}", esc(contact.phone))
		.replace("{{LINKEDIN_URL}}", escUrl(contact.linkedin))
		.replace(
			"{{LINKEDIN_LABEL}}",
			esc(contact.linkedin.replace("https://", "")),
		)
		.replace("{{PORTFOLIO_URL}}", escUrl(contact.portfolio))
		.replace(
			"{{PORTFOLIO_LABEL}}",
			esc(contact.portfolio.replace("https://", "")),
		)
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

export function buildOutputFilename(name: string, roleTitle: string): string {
	const sanitise = (s: string) =>
		s
			.trim()
			.replace(/[^a-zA-Z0-9 ]/g, "")
			.replace(/\s+/g, "_");
	return `${sanitise(name)}_${sanitise(roleTitle)}`;
}
