// Pipeline service
// Orchestrates:
//   1. analyzeJD()
//   2. extractMatches()
//   3. buildCandidatePositioning()
//   4. generate recruiter email, cover letter, and tailored resume

import fs from "fs";
import path from "path";
import { callOllama, extractJSON } from "./ollama.service";
import { buildPrompt } from "./prompt-loader.service";
import { calculateYearsOfExperience } from "../utils/resume.utils";
import type {
	Bullet,
	CandidatePositioning,
	CoverLetterOutput,
	JDAnalysis,
	MatchResult,
	PipelineOptions,
	PipelineResult,
	Project,
	RecruiterEmailOutput,
	Resume,
	Role,
	ScoredBullet,
	TailoredResumeOutput,
	TopMatch,
} from "../types";

export const OUTPUT_DIR = path.resolve(process.cwd(), "output");

interface ResumeEvidenceLine {
	source: string;
	sentence: string;
	tags: string[];
	tech: string[];
}

// Step 1: Analyze JD

export async function analyzeJD(jd: string): Promise<JDAnalysis> {
	console.log("  [1/4] Analyzing JD...");
	const prompt = buildPrompt("extraction/analyze-jd.txt", { jd });
	const raw = await callOllama(prompt, {
		temperature: 0.2,
		numPredict: 1024,
	});

	try {
		return normalizeJDAnalysis(extractJSON<Partial<JDAnalysis>>(raw), jd);
	} catch {
		console.warn("  JD analysis parse failed; using fallback");
		return normalizeJDAnalysis({}, jd);
	}
}

// Step 2: Extract matching experience

export async function extractMatches(
	resume: Resume,
	jdAnalysis: JDAnalysis,
	_jd?: string,
): Promise<MatchResult> {
	console.log("  [2/4] Extracting matching experience...");

	const resumeEvidence = formatResumeEvidence(resume);
	const prompt = buildPrompt("extraction/extract-matching-experience.txt", {
		jd_analysis: stringify(jdAnalysis),
		resume_evidence: resumeEvidence,
	});

	const fallback = buildLocalMatchResult(resume, jdAnalysis);
	try {
		const raw = await callOllama(prompt, {
			temperature: 0.2,
			numPredict: 1536,
		});
		return normalizeMatchResult(
			extractJSON<Partial<MatchResult>>(raw),
			fallback,
		);
	} catch {
		console.warn("  Match extraction parse failed; using local fallback");
		return fallback;
	}
}

// Step 3: Candidate positioning

export async function buildCandidatePositioning(
	resume: Resume,
	jdAnalysis: JDAnalysis,
	matches: MatchResult,
): Promise<CandidatePositioning> {
	console.log("  [3/4] Building candidate positioning...");

	const prompt = buildPrompt("extraction/candidate-positioning.txt", {
		jd_analysis: stringify(jdAnalysis),
		matches: stringify(matches),
		resume_evidence: formatResumeEvidence(resume),
	});

	const fallback = buildLocalCandidatePositioning(
		resume,
		jdAnalysis,
		matches,
	);

	try {
		const raw = await callOllama(prompt, {
			temperature: 0.2,
			numPredict: 1024,
		});
		return normalizeCandidatePositioning(
			extractJSON<Partial<CandidatePositioning>>(raw),
			fallback,
		);
	} catch {
		console.warn(
			"  Candidate positioning parse failed; using local fallback",
		);
		return fallback;
	}
}

// Output generators

export async function tailorResume(
	resume: Resume,
	jdAnalysis: JDAnalysis,
	matches: MatchResult,
	positioning: CandidatePositioning,
): Promise<TailoredResumeOutput> {
	console.log("     Tailoring resume...");

	const editableResume = {
		header: resume.header,
		skills: resume.skills,
		experience: resume.experience,
		projects: resume.projects,
	};

	const prompt = buildPrompt("tailoring/tailor-resume.txt", {
		role_title: jdAnalysis.roleTitle,
		jd_analysis: stringify(jdAnalysis),
		matches: stringify(matches),
		candidate_positioning: stringify(positioning),
		resume: stringify(editableResume),
	});

	const raw = await callOllama(prompt, {
		temperature: 0.25,
		numPredict: 4096,
	});

	try {
		return restoreLockedResumeFacts(
			resume,
			extractJSON<Partial<TailoredResumeOutput>>(raw),
			jdAnalysis.roleTitle,
		);
	} catch (err) {
		throw new Error(`Resume tailoring failed: ${(err as Error).message}`);
	}
}

// ─── generateRecruiterEmail (TypeScript only, no model call) ──────────────────
// Replace the existing generateRecruiterEmail function in pipeline.service.ts.
//
// Rationale: every model tested (qwen2.5, qwen3, mistral) hallucinated the
// role title, company name, or seniority when generating email prose.
// The pipeline already has all the data needed — no AI call required.

export function generateRecruiterEmail(
	resume: Resume,
	jdAnalysis: JDAnalysis,
	matches: MatchResult,
	positioning: CandidatePositioning,
	opts: PipelineOptions,
): RecruiterEmailOutput {
	console.log("     Generating recruiter email (TypeScript)...");

	const roleTitle = jdAnalysis.roleTitle || resume.header.title;
	const years = calculateYearsOfExperience(resume.experience);
	const topBullet = matches.topBullets[0] ?? firstResumeBullet(resume);

	// Top 3 matched skills — never more, never fabricated
	const skillsText =
		matches.matchedSkills.slice(0, 3).join(", ") ||
		resume.skills
			.flatMap((c) => c.items)
			.slice(0, 3)
			.join(", ");

	// Subject — always "Application for <exact JD role title>"
	const subject = `Application for ${roleTitle} — ${resume.header.name}`;

	// Opening — years + skills + role title, all from known data
	const opening = `I'm applying for the ${roleTitle} role with ${years} years of experience in ${skillsText}.`;

	// Experience line — verb and text from top bullet verbatim
	// extractSpecificWork() stops at first comma to avoid run-on sentences
	let experienceLine: string;
	if (topBullet) {
		const verb = topBullet.sentence.split(" ")[0].toLowerCase();
		const specificWork = topBullet.sentence
			.split(" ")
			.slice(1)
			.join(" ") // drop verb
			.split(",")[0] // stop at first comma
			.split(" ")
			.slice(0, 8)
			.join(" ") // max 8 words
			.trim();
		const source = topBullet.source.includes("Project")
			? topBullet.source.replace("Project: ", "on ")
			: `at ${topBullet.source.replace(/^.*?at\s+/i, "")}`; // "Associate at Srijan" → "at Srijan"
		experienceLine = `${source.charAt(0).toUpperCase() + source.slice(1)}, I ${verb} ${specificWork}.`;
	} else {
		experienceLine =
			positioning.secondaryNarrative ||
			`I have experience building ${skillsText} applications.`;
	}

	const closing =
		"I've attached my resume and would welcome the chance to connect.";

	return { subject, opening, experienceLine, closing };
}

export async function generateCoverLetter(
	resume: Resume,
	jdAnalysis: JDAnalysis,
	matches: MatchResult,
	positioning: CandidatePositioning,
): Promise<CoverLetterOutput> {
	console.log("     Generating cover letter...");

	const topBulletsText = matches.topBullets
		.map((b, i) => `${i + 1}. [${b.source}] ${b.sentence}`)
		.join("\n");

	const prompt = buildPrompt("generation/cover-letter.txt", {
		name: resume.header.name,
		role_title: jdAnalysis.roleTitle,
		matched_skills: matches.matchedSkills.join(", "),
		candidate_positioning: stringify(positioning),
		top_matches: stringify(matches.topMatches),
		top_bullets: topBulletsText,
		jd_analysis: stringify(jdAnalysis),
	});

	const body = stripModelFences(
		await callOllama(prompt, { temperature: 0.45, numPredict: 1024 }),
	);
	return { body };
}

export function formatRecruiterEmail(
	email: RecruiterEmailOutput,
	resume: Resume,
	opts: PipelineOptions = {},
): string {
	const greeting = opts.recruiterName
		? `Hi ${opts.recruiterName},`
		: "Hello Hiring Team,";
	return [
		greeting,
		"",
		ensureTerminalPunctuation(email.opening),
		"",
		ensureTerminalPunctuation(email.experienceLine),
		"",
		ensureTerminalPunctuation(email.closing),
		"",
		resume.header.name,
		resume.contact.email,
		resume.contact.phone,
	]
		.map((line) => line.trim())
		.join("\n")
		.trim();
}

// Main orchestrator

export async function runPipeline(
	jd: string,
	resume: Resume,
	opts: PipelineOptions = {},
): Promise<PipelineResult> {
	console.log("\nStarting pipeline...\n");
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });

	const jdAnalysis = await analyzeJD(jd);
	console.log(`     Role: ${jdAnalysis.roleTitle}`);
	console.log(
		`     Skills: ${jdAnalysis.requiredSkills.slice(0, 5).join(", ")}`,
	);

	const matches = await extractMatches(resume, jdAnalysis, jd);
	console.log(`     Matched: ${matches.matchedSkills.join(", ")}`);
	console.log(`     Summary: ${matches.summary}`);

	const positioning = await buildCandidatePositioning(
		resume,
		jdAnalysis,
		matches,
	);
	console.log(`     Narrative: ${positioning.primaryNarrative}`);

	console.log("\n  [4/4] Generating outputs...");
	const [tailoredResume, email, coverLetter] = await Promise.all([
		tailorResume(resume, jdAnalysis, matches, positioning),
		opts.includeEmail
			? generateRecruiterEmail(
					resume,
					jdAnalysis,
					matches,
					positioning,
					opts,
				)
			: Promise.resolve(null),
		opts.includeCover
			? generateCoverLetter(resume, jdAnalysis, matches, positioning)
			: Promise.resolve(null),
	] as const);

	fs.writeFileSync(
		path.join(OUTPUT_DIR, "tailored.json"),
		JSON.stringify(tailoredResume, null, 2),
	);

	if (email) {
		fs.writeFileSync(
			path.join(OUTPUT_DIR, "email.txt"),
			`SUBJECT: ${email.subject}\n\n${formatRecruiterEmail(email, resume, opts)}`,
		);
	}

	if (coverLetter) {
		fs.writeFileSync(
			path.join(OUTPUT_DIR, "cover_letter.txt"),
			`${resume.header.name}\n${resume.contact.email} | ${resume.contact.phone}\n\n${coverLetter.body}`,
		);
	}

	console.log("\nPipeline complete\n");

	return {
		jdAnalysis,
		matches,
		positioning,
		tailoredResume,
		email,
		coverLetter,
	};
}

// Normalization and fallbacks

function normalizeJDAnalysis(raw: Partial<JDAnalysis>, jd: string): JDAnalysis {
	const responsibilities = toStringArray(raw.responsibilities);

	return {
		roleTitle: cleanString(raw.roleTitle) || inferRoleTitle(jd),
		experienceLevel: cleanString(raw.experienceLevel) || "mid",
		requiredSkills: uniqueStrings(raw.requiredSkills).slice(0, 12),
		preferredSkills: uniqueStrings(raw.preferredSkills).slice(0, 10),
		coreTechnologies: uniqueStrings(raw.coreTechnologies).slice(0, 15),
		responsibilities: uniqueStrings(responsibilities).slice(0, 8),
		keyResponsibilities: uniqueStrings(responsibilities).slice(0, 8), // ← add this
		focusAreas: uniqueStrings(raw.focusAreas).slice(0, 8),
		industryKeywords: uniqueStrings(raw.industryKeywords).slice(0, 10),
		tone: cleanString(raw.tone) || "formal",
	};
}

function normalizeMatchResult(
	raw: Partial<MatchResult>,
	fallback: MatchResult,
): MatchResult {
	const topMatches = toArray(raw.topMatches)
		.map((match) => normalizeTopMatch(match))
		.filter((match) => match.skill && match.evidence)
		.slice(0, 6);

	const topBullets = toArray(raw.topBullets)
		.map((bullet) => normalizeScoredBullet(bullet))
		.filter((bullet) => bullet.sentence && bullet.source)
		.slice(0, 3);

	const matchedSkills = uniqueStrings(raw.matchedSkills).slice(0, 10);

	return {
		topMatches: topMatches.length ? topMatches : fallback.topMatches,
		topBullets: topBullets.length ? topBullets : fallback.topBullets,
		matchedSkills: matchedSkills.length
			? matchedSkills
			: fallback.matchedSkills,
		summary: cleanString(raw.summary) || fallback.summary,
	};
}

function normalizeTopMatch(raw: unknown): TopMatch {
	const value = asRecord(raw);
	return {
		skill: cleanString(value.skill),
		evidence: stripTrailingPeriod(cleanString(value.evidence)),
		source: cleanString(value.source),
		strength: normalizeStrength(value.strength),
	};
}

function normalizeScoredBullet(raw: unknown): ScoredBullet {
	const value = asRecord(raw);
	return {
		sentence: stripTrailingPeriod(cleanString(value.sentence)),
		source: cleanString(value.source),
		score: normalizeScore(value.score),
	};
}

function normalizeCandidatePositioning(
	raw: Partial<CandidatePositioning>,
	fallback: CandidatePositioning,
): CandidatePositioning {
	const strengths = Array.isArray(raw.strengths)
		? uniqueStrings(raw.strengths).slice(0, 6)
		: fallback.strengths;
	const gaps = Array.isArray(raw.gaps)
		? uniqueStrings(raw.gaps).slice(0, 5)
		: fallback.gaps;
	const bestProjects = Array.isArray(raw.bestProjects)
		? uniqueStrings(raw.bestProjects).slice(0, 4)
		: fallback.bestProjects;

	return {
		primaryNarrative:
			cleanString(raw.primaryNarrative) || fallback.primaryNarrative,
		secondaryNarrative:
			cleanString(raw.secondaryNarrative) || fallback.secondaryNarrative,
		strengths,
		gaps,
		bestProjects,
	};
}

function normalizeRecruiterEmail(
	raw: Partial<RecruiterEmailOutput>,
	fallback: RecruiterEmailOutput,
): RecruiterEmailOutput {
	return {
		subject: cleanString(raw.subject) || fallback.subject,
		opening: cleanString(raw.opening) || fallback.opening,
		experienceLine:
			cleanString(raw.experienceLine) || fallback.experienceLine,
		closing: cleanString(raw.closing) || fallback.closing,
	};
}

function buildLocalMatchResult(
	resume: Resume,
	jdAnalysis: JDAnalysis,
): MatchResult {
	const topBullets = localTagScore(resume, jdAnalysis);
	const matchedSkills = localSkillMatch(resume, jdAnalysis);
	const topMatches = matchedSkills.slice(0, 6).map((skill) => {
		const evidence = findEvidenceForSkill(resume, skill) ?? topBullets[0];
		return {
			skill,
			evidence: evidence?.sentence ?? "",
			source: evidence?.source ?? "",
			strength:
				evidence?.score && evidence.score >= 2 ? "strong" : "moderate",
		};
	});

	return {
		topMatches,
		topBullets,
		matchedSkills,
		summary: matchedSkills.length
			? `Strongest overlap is ${matchedSkills.slice(0, 4).join(", ")}.`
			: "Limited direct overlap found from resume tags and skills.",
	};
}

function buildLocalCandidatePositioning(
	resume: Resume,
	jdAnalysis: JDAnalysis,
	matches: MatchResult,
): CandidatePositioning {
	const years = calculateYearsOfExperience(resume.experience);
	const matchedSkills = matches.matchedSkills.slice(0, 5);
	const roleTitle = jdAnalysis.roleTitle || resume.header.title;
	const skillsText = matchedSkills.length
		? matchedSkills.join(", ")
		: resume.header.title;
	const jdSkills = getJDSkillTerms(jdAnalysis);
	const matchedLower = new Set(
		matchedSkills.map((skill) => skill.toLowerCase()),
	);
	const gaps = jdSkills
		.filter((skill) => !matchedLower.has(skill.toLowerCase()))
		.slice(0, 5);

	return {
		primaryNarrative: `${resume.header.title} with ${years} years of experience aligned to ${roleTitle} work through ${skillsText}.`,
		secondaryNarrative:
			matches.summary ||
			"Supporting evidence comes from resume bullets with direct technology and workflow overlap.",
		strengths: [
			...matchedSkills,
			...jdAnalysis.focusAreas.filter((area) =>
				matches.summary.toLowerCase().includes(area.toLowerCase()),
			),
		].slice(0, 6),
		gaps,
		bestProjects: matches.topBullets
			.slice(0, 4)
			.map((bullet) => `${bullet.source}: ${bullet.sentence}`),
	};
}

function buildLocalRecruiterEmail(
	resume: Resume,
	jdAnalysis: JDAnalysis,
	matches: MatchResult,
	positioning: CandidatePositioning,
	opts: PipelineOptions,
): RecruiterEmailOutput {
	const roleTitle = jdAnalysis.roleTitle || "Software Engineer";
	const companyText = opts.companyName ? ` at ${opts.companyName}` : "";
	const topBullet = matches.topBullets[0] ?? firstResumeBullet(resume);
	const experienceLine = topBullet
		? `At ${topBullet.source}, I ${lowercaseFirst(topBullet.sentence)}.`
		: positioning.secondaryNarrative;

	return {
		subject: `Application for ${roleTitle}`,
		opening: `I saw the ${roleTitle} role${companyText}, and my background aligns with the work through ${positioning.primaryNarrative}`,
		experienceLine,
		closing:
			"If the background looks relevant, I would be glad to discuss the role in a short conversation",
	};
}

function restoreLockedResumeFacts(
	original: Resume,
	tailored: Partial<TailoredResumeOutput>,
	roleTitle: string,
): TailoredResumeOutput {
	return {
		header: {
			name: original.header.name,
			title: roleTitle || original.header.title,
			summary:
				cleanString(tailored.header?.summary) ||
				original.header.summary,
		},
		contact: original.contact,
		skills: restoreSkills(original.skills, tailored.skills),
		experience: restoreRoles(original.experience, tailored.experience),
		projects: restoreProjects(original.projects, tailored.projects),
		education: original.education,
	};
}

// ─── Drop-in replacements for pipeline.service.ts ────────────────────────────
// Replace restoreSkills, restoreRoles, restoreProjects, and restoreBullets
// with these versions. They guard against the model returning objects instead
// of arrays, which causes "X.find is not a function" errors.

function restoreSkills(
	originalSkills: Resume["skills"],
	tailoredSkills: Resume["skills"] | undefined,
): Resume["skills"] {
	// Guard: model sometimes returns {} instead of [] for skills
	const safeTailored = Array.isArray(tailoredSkills) ? tailoredSkills : [];

	return originalSkills.map((category, index) => {
		const tailoredCategory =
			safeTailored.find((item) => item?.label === category.label) ??
			safeTailored[index];

		const allowed = new Set(
			category.items.map((item) => item.toLowerCase()),
		);

		const reordered = uniqueStrings(tailoredCategory?.items).filter(
			(item) => allowed.has(item.toLowerCase()),
		);
		const seen = new Set(reordered.map((item) => item.toLowerCase()));
		const remaining = category.items.filter(
			(item) => !seen.has(item.toLowerCase()),
		);

		return {
			label: category.label,
			items: [...reordered, ...remaining],
		};
	});
}

function restoreRoles(
	originalRoles: Role[],
	tailoredRoles: Role[] | undefined,
): Role[] {
	// Guard: model sometimes returns {} or null instead of []
	const safeTailored = Array.isArray(tailoredRoles) ? tailoredRoles : [];

	return originalRoles.map((role, index) => {
		const tailoredRole =
			safeTailored.find(
				(item) =>
					item?.company === role.company &&
					item?.period === role.period,
			) ?? safeTailored[index];

		return {
			company: role.company,
			title: role.title,
			period: role.period,
			tech: role.tech,
			bullets: restoreBullets(role.bullets, tailoredRole?.bullets),
		};
	});
}

function restoreProjects(
	originalProjects: Project[],
	tailoredProjects: Project[] | undefined,
): Project[] {
	// Guard: model sometimes returns {} or null instead of []
	const safeTailored = Array.isArray(tailoredProjects)
		? tailoredProjects
		: [];

	return originalProjects.map((project, index) => {
		const tailoredProject =
			safeTailored.find((item) => item?.name === project.name) ??
			safeTailored[index];

		return {
			name: project.name,
			url: project.url,
			urlLabel: project.urlLabel,
			period: project.period,
			tech: project.tech,
			bullets: restoreBullets(project.bullets, tailoredProject?.bullets),
		};
	});
}

function restoreBullets(
	originalBullets: Bullet[],
	tailoredBullets: Bullet[] | undefined,
): Bullet[] {
	// Guard: model sometimes returns {} or a string instead of []
	if (!Array.isArray(tailoredBullets) || tailoredBullets.length === 0) {
		return originalBullets;
	}

	const originalVerbs = new Set(originalBullets.map((b) => b.verb));

	const restored = tailoredBullets
		.slice(0, originalBullets.length)
		.map((bullet, index) => {
			const fallback = originalBullets[index];
			// Guard: bullet itself might not be an object
			if (!bullet || typeof bullet !== "object") return fallback;
			return {
				verb: originalVerbs.has(bullet.verb)
					? bullet.verb
					: fallback.verb,
				text: cleanString(bullet.text) || fallback.text,
				tags: uniqueStrings(bullet.tags).length
					? uniqueStrings(bullet.tags)
					: fallback.tags,
			};
		});

	// Fill any missing bullets from the original
	while (restored.length < originalBullets.length) {
		restored.push(originalBullets[restored.length]);
	}

	return restored;
}

function formatResumeEvidence(resume: Resume): string {
	return buildResumeEvidence(resume)
		.map((line, index) => {
			const tech = line.tech.length
				? `tech: ${line.tech.join(", ")}`
				: "";
			const tags = line.tags.length
				? `tags: ${line.tags.join(", ")}`
				: "";
			const metadata = [tech, tags].filter(Boolean).join("; ");
			return `[${index + 1}] [${line.source}] ${line.sentence}${
				metadata ? ` (${metadata})` : ""
			}`;
		})
		.join("\n");
}

function buildResumeEvidence(resume: Resume): ResumeEvidenceLine[] {
	return [
		...resume.experience.flatMap((role) =>
			role.bullets.map((bullet) => ({
				source: `${role.title} at ${role.company}`,
				sentence: `${bullet.verb} ${bullet.text}`,
				tags: bullet.tags,
				tech: role.tech,
			})),
		),
		...resume.projects.flatMap((project) =>
			project.bullets.map((bullet) => ({
				source: `Project: ${project.name}`,
				sentence: `${bullet.verb} ${bullet.text}`,
				tags: bullet.tags,
				tech: project.tech,
			})),
		),
	];
}

function localTagScore(resume: Resume, jdAnalysis: JDAnalysis): ScoredBullet[] {
	const jdLower = getJDTerms(jdAnalysis).join(" ").toLowerCase();
	const scored = buildResumeEvidence(resume).map((line) => {
		const evidenceTerms = [...line.tags, ...line.tech, line.sentence];
		const score = evidenceTerms.filter((term) =>
			jdLower.includes(term.toLowerCase()),
		).length;
		return {
			sentence: line.sentence,
			source: line.source,
			score: Math.min(score, 5),
		};
	});

	return scored.sort((a, b) => b.score - a.score).slice(0, 3);
}

function localSkillMatch(resume: Resume, jdAnalysis: JDAnalysis): string[] {
	const candidateTerms = buildCandidateTerms(resume);
	return getJDSkillTerms(jdAnalysis)
		.filter((skill) => candidateTerms.has(skill.toLowerCase()))
		.slice(0, 10);
}

function findEvidenceForSkill(
	resume: Resume,
	skill: string,
): ScoredBullet | undefined {
	const lowerSkill = skill.toLowerCase();
	const line = buildResumeEvidence(resume).find((evidence) =>
		[...evidence.tags, ...evidence.tech, evidence.sentence].some((term) =>
			term.toLowerCase().includes(lowerSkill),
		),
	);
	return line
		? { sentence: line.sentence, source: line.source, score: 3 }
		: undefined;
}

function firstResumeBullet(resume: Resume): ScoredBullet | undefined {
	const first = buildResumeEvidence(resume)[0];
	return first
		? { sentence: first.sentence, source: first.source, score: 1 }
		: undefined;
}

function buildCandidateTerms(resume: Resume): Set<string> {
	return new Set(
		[
			...resume.skills.flatMap((category) => category.items),
			...resume.experience.flatMap((role) => role.tech),
			...resume.projects.flatMap((project) => project.tech),
			...buildResumeEvidence(resume).flatMap((line) => line.tags),
		].map((term) => term.toLowerCase()),
	);
}

function getJDSkillTerms(jdAnalysis: JDAnalysis): string[] {
	return uniqueStrings([
		...jdAnalysis.requiredSkills,
		...jdAnalysis.preferredSkills,
		...jdAnalysis.coreTechnologies,
	]);
}

function getJDTerms(jdAnalysis: JDAnalysis): string[] {
	return uniqueStrings([
		...getJDSkillTerms(jdAnalysis),
		...jdAnalysis.responsibilities,
		...jdAnalysis.focusAreas,
		...jdAnalysis.industryKeywords,
	]);
}

function inferRoleTitle(jd: string): string {
	const match =
		jd.match(/(?:role|position|job title)[:\s]+([^\n]+)/i) ??
		jd.match(/^([^\n]{3,80})/);
	return cleanString(match?.[1]) || "Software Engineer";
}

function cleanString(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

function uniqueStrings(value: unknown): string[] {
	const seen = new Set<string>();
	return toStringArray(value).filter((item) => {
		const key = item.toLowerCase();
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function toStringArray(value: unknown): string[] {
	return Array.isArray(value)
		? value.map((item) => cleanString(item)).filter(Boolean)
		: [];
}

function toArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
	return value && typeof value === "object"
		? (value as Record<string, unknown>)
		: {};
}

function normalizeScore(value: unknown): number {
	const score = typeof value === "number" ? value : Number(value);
	if (!Number.isFinite(score)) return 0;
	return Math.max(0, Math.min(5, Math.round(score)));
}

function normalizeStrength(value: unknown): string {
	const strength = cleanString(value).toLowerCase();
	return ["strong", "moderate", "weak"].includes(strength)
		? strength
		: "moderate";
}

function stringify(value: unknown): string {
	return JSON.stringify(value, null, 2);
}

function stripTrailingPeriod(value: string): string {
	return value.replace(/\s*\.$/, "");
}

function ensureTerminalPunctuation(value: string): string {
	return /[.!?]$/.test(value) ? value : `${value}.`;
}

function lowercaseFirst(value: string): string {
	return value ? `${value.charAt(0).toLowerCase()}${value.slice(1)}` : value;
}

function stripModelFences(value: string): string {
	const fenceMatch = value.match(/```(?:\w+)?\s*([\s\S]*?)```/);
	return (fenceMatch ? fenceMatch[1] : value).trim();
}
