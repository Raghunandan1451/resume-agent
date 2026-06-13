// ─── Resume types ─────────────────────────────────────────────────────────────

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

// ─── JD Analysis ──────────────────────────────────────────────────────────────

export interface JDAnalysis {
	roleTitle: string; // "ReactJS Developer"
	experienceLevel: string; // "junior" | "mid" | "senior"
	requiredSkills: string[]; // must-have skills
	preferredSkills: string[]; // nice-to-have skills
	coreTechnologies: string[]; // all tech mentioned in JD
	responsibilities: string[]; // concrete job duties
	focusAreas: string[]; // higher-level role themes
	industryKeywords: string[]; // domain/product terms
	tone: string; // "formal" | "casual" | "startup"
	// kept for backward compat — maps to responsibilities
	keyResponsibilities: string[];
}

// ─── Match result ─────────────────────────────────────────────────────────────

export interface TopMatch {
	skill: string;
	evidence: string;
	source: string;
	strength: string; // "strong" | "moderate" | "weak"
}

export interface ScoredBullet {
	sentence: string; // "verb text" as a single string
	source: string; // "Associate at Srijan"
	score: number; // 0–5
}

export interface MatchResult {
	topMatches: TopMatch[];
	topBullets: ScoredBullet[];
	matchedSkills: string[];
	summary: string;
}

// ─── Candidate positioning ────────────────────────────────────────────────────

export interface CandidatePositioning {
	primaryNarrative: string;
	secondaryNarrative: string;
	strengths: string[];
	gaps: string[];
	bestProjects: string[];
}

// ─── Output types ─────────────────────────────────────────────────────────────

export interface TailoredResumeOutput {
	header: { name: string; title: string; summary: string };
	contact: Contact;
	skills: SkillCategory[];
	experience: Role[];
	projects: Project[];
	education: Education;
}

export interface RecruiterEmailOutput {
	subject: string;
	opening: string;
	experienceLine: string;
	closing: string;
}

export interface CoverLetterOutput {
	body: string;
}

// ─── Pipeline I/O ─────────────────────────────────────────────────────────────

export interface PipelineOptions {
	recruiterName?: string;
	companyName?: string;
	includeCover?: boolean;
}

export interface PipelineResult {
	jdAnalysis: JDAnalysis;
	matches: MatchResult;
	positioning: CandidatePositioning;
	tailoredResume: TailoredResumeOutput;
	email: RecruiterEmailOutput;
	coverLetter: CoverLetterOutput | null;
}

// ─── Prompt template variable map ─────────────────────────────────────────────

export type TemplateVars = Record<string, string>;
