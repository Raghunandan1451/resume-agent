// ─── Resume utilities ─────────────────────────────────────────────────────────
// Loading, reading, and analysing resume data from base.json / tailored.json.

import fs from "fs";
import path from "path";
import type { Resume, Bullet, Role, Project } from "./types";

const ROOT = path.resolve(__dirname, "../..");

export const BASE_RESUME_PATH = path.join(ROOT, "resume", "base.json");
export const OUTPUT_DIR = path.join(ROOT, "output");
export const TAILORED_PATH = path.join(OUTPUT_DIR, "tailored.json");

// ─── Loader ───────────────────────────────────────────────────────────────────

export function loadResume(filePath: string = BASE_RESUME_PATH): Resume {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Resume file not found: ${filePath}`);
	}
	return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Resume;
}

// ─── Years of experience ──────────────────────────────────────────────────────
// Parses "Aug 2022 -- Present" style period strings.
// Returns e.g. "3.8" as a string to prevent models rounding to whole numbers.

export function calculateYearsOfExperience(experience: Role[]): string {
	const months: Record<string, number> = {
		jan: 0,
		feb: 1,
		mar: 2,
		apr: 3,
		may: 4,
		jun: 5,
		jul: 6,
		aug: 7,
		sep: 8,
		oct: 9,
		nov: 10,
		dec: 11,
	};

	let earliestDate: Date | null = null;

	for (const role of experience) {
		const startPart = role.period
			.split("--")[0]
			.trim()
			.toLowerCase()
			.split(" ");
		if (startPart.length === 2) {
			const month = months[startPart[0].slice(0, 3)];
			const year = parseInt(startPart[1]);
			if (!isNaN(month) && !isNaN(year)) {
				const date = new Date(year, month);
				if (!earliestDate || date < earliestDate) earliestDate = date;
			}
		}
	}

	if (!earliestDate) return "3+";
	const diffYears =
		(Date.now() - earliestDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
	return diffYears.toFixed(1);
}

// ─── Relevant bullet selector ─────────────────────────────────────────────────
// Scores each bullet by how many of its tags appear in the JD text.
// Returns the top N bullets with their source role/project for context.

export interface ScoredBullet {
	sentence: string; // "verb text" as a single string
	source: string; // e.g. "Associate at Srijan"
	score: number;
}

export function selectRelevantBullets(
	resume: Resume,
	jdText: string,
	topN: number = 2,
): ScoredBullet[] {
	const jdLower = jdText.toLowerCase();
	const scored: ScoredBullet[] = [];

	const scoreBullet = (bullet: Bullet, source: string) => {
		const score = bullet.tags.filter((tag) =>
			jdLower.includes(tag.toLowerCase()),
		).length;
		scored.push({
			sentence: `${bullet.verb} ${bullet.text}`,
			source,
			score,
		});
	};

	for (const role of resume.experience) {
		role.bullets.forEach((b) =>
			scoreBullet(b, `${role.title} at ${role.company}`),
		);
	}
	for (const proj of resume.projects) {
		proj.bullets.forEach((b) => scoreBullet(b, `Project: ${proj.name}`));
	}

	return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}

// ─── JD role title extractor ─────────────────────────────────────────────────
// Tries to extract the role title from a JD string.
// Falls back to the resume's own title if nothing is found.

export function extractRoleTitleFromJD(
	jdText: string,
	fallback: string,
): string {
	const match =
		jdText.match(/role[:\s]+([^\n]+)/i) ??
		jdText.match(/position[:\s]+([^\n]+)/i) ??
		jdText.match(/job title[:\s]+([^\n]+)/i);
	return match ? match[1].trim() : fallback;
}

// ─── JD parser ────────────────────────────────────────────────────────────────
// Reads JD from a .txt file path or a --text inline string from CLI args.

export function parseJDFromArgs(args: string[]): string {
	if (args[0] === "--text") {
		const text = args.slice(1).join(" ");
		if (!text) throw new Error("No JD text provided after --text flag.");
		return text;
	}

	const jdPath = path.resolve(args[0]);
	if (!fs.existsSync(jdPath)) {
		throw new Error(`JD file not found: ${jdPath}`);
	}
	return fs.readFileSync(jdPath, "utf-8");
}

// ─── Flag parser ──────────────────────────────────────────────────────────────
// Extracts named flags like --name "Priya" or --company "XYZ" from CLI args.

export function getFlag(args: string[], flag: string): string {
	const index = args.indexOf(flag);
	return index !== -1 ? (args[index + 1] ?? "") : "";
}
