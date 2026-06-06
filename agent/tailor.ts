/**
 * tailor.ts
 * ---------
 * Tailors base.json to a job description using Ollama.
 * Writes output/tailored.json in the same shape as base.json.
 *
 * Usage:
 *   npx ts-node agent/tailor.ts jd/company-role.txt
 *   npx ts-node agent/tailor.ts --text "Paste JD here..."
 */

import fs from "fs";
import path from "path";
import type { Resume } from "./lib/types";
import { callOllama, extractJSON } from "./lib/ollama";
import { loadResume, parseJDFromArgs, OUTPUT_DIR } from "./lib/resume";

function buildPrompt(resume: Resume, jd: string): string {
	const editableResume = {
		header: resume.header,
		skills: resume.skills,
		experience: resume.experience,
		projects: resume.projects,
	};

	return `You are a professional resume tailoring assistant. Adapt the resume to better match the job description — WITHOUT fabricating any experience, tools, or metrics not already present.

## RULES

1. NEVER invent skills, technologies, companies, or metrics not in the resume.
2. NEVER change the "verb" field of a bullet unless the existing verb is weak and a stronger accurate one fits.
3. NEVER alter the "tech" arrays — these are factual and locked.
4. You MAY rewrite bullet "text" using keywords from the JD — only if the underlying facts support it.
5. You MAY reorder items inside skills[].items[] to surface JD-relevant skills first.
6. You MUST rewrite the summary to match the JD's tone, role title, and focus area.
7. You MUST update header.title to exactly match the role title from the JD.
   e.g. if JD says "ReactJS Developer", set header.title to "ReactJS Developer".
8. Update header.summary to open with the role title from the JD.
9. Return ONLY a valid JSON object — no markdown, no explanation, no code fences.
10. The returned JSON must have the exact same structure and keys as the input.
11. Keep bullets concise — one to two sentences max.
12. Update "tags" on each bullet to reflect the new emphasis after rewriting.

## JOB DESCRIPTION

${jd}

## RESUME (editable sections only)

${JSON.stringify(editableResume, null, 2)}

Return ONLY the JSON. No preamble. No explanation. No markdown fences.`;
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error(
			"Usage:\n  npx ts-node agent/tailor.ts jd/company-role.txt",
		);
		process.exit(1);
	}

	const jdText = parseJDFromArgs(args);
	const base = loadResume();
	const prompt = buildPrompt(base, jdText);

	console.log("\n⏳ Tailoring resume via Ollama... (20–60s)\n");
	const rawResponse = await callOllama(prompt, {
		temperature: 0.3,
		numPredict: 4096,
	});

	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	fs.writeFileSync(path.join(OUTPUT_DIR, "raw_response.txt"), rawResponse);

	let tailored: Partial<Resume>;
	try {
		tailored = extractJSON(rawResponse) as Partial<Resume>;
	} catch (err) {
		console.error("❌ JSON parse failed:", (err as Error).message);
		console.error("Raw response saved to output/raw_response.txt");
		process.exit(1);
	}

	const final: Resume = {
		...tailored,
		contact: base.contact,
		education: base.education,
	} as Resume;

	fs.writeFileSync(
		path.join(OUTPUT_DIR, "tailored.json"),
		JSON.stringify(final, null, 2),
	);
	console.log("✅ Tailored resume saved to output/tailored.json");
	console.log(`   Title: ${final.header.title}`);
	console.log(
		`   Summary updated: ${final.header.summary !== base.header.summary ? "yes" : "no"}`,
	);
}

main().catch((err) => {
	console.error("Fatal:", err);
	process.exit(1);
});
