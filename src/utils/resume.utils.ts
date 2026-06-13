// ─── Resume utilities ─────────────────────────────────────────────────────────

import fs from "fs";
import path from "path";
import type { Resume, Role } from "../types";

const ROOT = path.resolve(process.cwd());

export const BASE_RESUME_PATH = path.join(ROOT, "resume", "base.json");
export const OUTPUT_DIR = path.join(ROOT, "output");

export function loadResume(filePath: string = BASE_RESUME_PATH): Resume {
	if (!fs.existsSync(filePath)) {
		throw new Error(`Resume file not found: ${filePath}`);
	}
	return JSON.parse(fs.readFileSync(filePath, "utf-8")) as Resume;
}

// Parses "Aug 2022 -- Present" period strings.
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

// Reads JD from a .txt file path or inline --text string from CLI args.
export function parseJDFromArgs(args: string[]): string {
	if (args[0] === "--text") {
		const text = args.slice(1).join(" ");
		if (!text) throw new Error("No JD text provided after --text flag.");
		return text;
	}
	const jdPath = path.resolve(args[0]);
	if (!fs.existsSync(jdPath)) throw new Error(`JD file not found: ${jdPath}`);
	return fs.readFileSync(jdPath, "utf-8");
}

// Extracts a named CLI flag value: --name "Priya" → "Priya"
export function getFlag(args: string[], flag: string): string {
	const index = args.indexOf(flag);
	return index !== -1 ? (args[index + 1] ?? "") : "";
}

// Tries to extract role title from JD text, falls back to resume title.
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
