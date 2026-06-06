// ─── Shared types ─────────────────────────────────────────────────────────────
// Single source of truth for the Resume shape used across all agent scripts.

export interface Bullet {
	verb: string;
	text: string;
	tags: string[];
}

export interface Role {
	company: string;
	title: string;
	period: string;
	tech: string[];
	bullets: Bullet[];
}

export interface Project {
	name: string;
	url: string;
	urlLabel: string;
	period: string;
	tech: string[];
	bullets: Bullet[];
}

export interface SkillCategory {
	label: string;
	items: string[];
}

export interface Education {
	degree: string;
	institution: string;
	cgpa: string;
	coursework: string[];
}

export interface Contact {
	email: string;
	phone: string;
	linkedin: string;
	portfolio: string;
}

export interface Resume {
	header: { name: string; title: string; summary: string };
	contact: Contact;
	skills: SkillCategory[];
	experience: Role[];
	projects: Project[];
	education: Education;
}
