/**
 * email.ts
 * --------
 * Generates a recruiter outreach email from base.json + JD.
 *
 * Structure (mostly static TypeScript, minimal AI):
 *   Para 1 — "I came across the [Role] role you posted..."     ← fully static
 *   Para 2 — "In my current role at Srijan, my background in  ← AI fills 3 slots only:
 *              [TECH_1] and [TECH_2], particularly around        [TECH_1], [TECH_2],
 *              [SPECIFIC_ANGLE], aligns with what you're         [SPECIFIC_ANGLE]
 *              looking for."
 *   Para 3 — "I've attached my resume..."                      ← fully static
 *   Close  — "Happy to connect if there's a fit."              ← fully static
 *
 * Usage:
 *   npx ts-node agent/email.ts jd/company-role.txt
 *   npx ts-node agent/email.ts jd/company-role.txt --name Priya
 */

import fs from "fs";
import path from "path";
import { callOllama } from "./lib/ollama";
import {
	loadResume,
	selectRelevantBullets,
	parseJDFromArgs,
	extractRoleTitleFromJD,
	getFlag,
	OUTPUT_DIR,
} from "./lib/resume";

// ─── Slot filler prompt ───────────────────────────────────────────────────────
// Version A template — model fills 5 slots, everything else is locked.
//
// Target output:
//   "At Srijan, I built a MERN-based knowledge platform with Redux-driven
//    state management — the kind of structured, logic-heavy frontend work
//    that seems central to this role."

function buildSlotPrompt(bullets: string, jd: string): string {
	return `You are filling 5 slots in a sentence for a recruiter email. Return ONLY a JSON object.

## SENTENCE TEMPLATE

"At Srijan, I [VERB] [SPECIFIC_WORK] with [TECH_1]-driven [TECH_ANGLE] — the kind of [WORK_TYPE] that seems central to this role."

## EXAMPLE OUTPUT

{"verb": "built", "specific_work": "a MERN-based knowledge platform", "tech1": "Redux", "tech_angle": "state management", "work_type": "structured, logic-heavy frontend work"}

## SLOT DEFINITIONS

[VERB]          — Past tense verb from the bullets. Use EXACTLY as written. Never "led" or "architected".
[SPECIFIC_WORK] — 4-7 word noun phrase of what was built. From candidate bullets only.
[TECH_1]        — Most relevant technology from the JD that appears in the candidate bullets.
[TECH_ANGLE]    — Specific technical concern. e.g. "state management", "real-time messaging"
[WORK_TYPE]     — 3-5 words describing the work nature. e.g. "structured, logic-heavy frontend work"

## CANDIDATE BULLETS

${bullets}

## JOB DESCRIPTION

${jd}

Return ONLY this JSON — no markdown, no explanation:
{"verb": "...", "specific_work": "...", "tech1": "...", "tech_angle": "...", "work_type": "..."}`;
}

// ─── Slot extractor ───────────────────────────────────────────────────────────

interface Slots {
	verb: string;
	specific_work: string;
	tech1: string;
	tech_angle: string;
	work_type: string;
}

function extractSlots(raw: string): Slots {
	const cleaned = raw
		.replace(/```(?:json)?/g, "")
		.replace(/```/g, "")
		.trim();
	try {
		const parsed = JSON.parse(cleaned);
		if (
			parsed.verb &&
			parsed.specific_work &&
			parsed.tech1 &&
			parsed.tech_angle &&
			parsed.work_type
		) {
			return parsed as Slots;
		}
		throw new Error("Missing keys");
	} catch {
		const get = (key: string, fb: string) =>
			raw.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`))?.[1] ?? fb;
		console.warn("⚠️  JSON parse failed — used regex fallback.");
		return {
			verb: get("verb", "built"),
			specific_work: get(
				"specific_work",
				"production React applications",
			),
			tech1: get("tech1", "React"),
			tech_angle: get("tech_angle", "state management"),
			work_type: get("work_type", "frontend development"),
		};
	}
}

// ─── Email assembler ──────────────────────────────────────────────────────────
// All structure is hardcoded. AI only fills the 5 slots above.

function assembleEmail(
	greeting: string,
	roleTitle: string,
	slots: Slots,
	name: string,
	email: string,
	phone: string,
): { subject: string; body: string } {
	const subject = `${roleTitle} Role — Reaching Out`;
	const para2 = `At Srijan, I ${slots.verb} ${slots.specific_work} with ${slots.tech1}-driven ${slots.tech_angle} — the kind of ${slots.work_type} that seems central to this role.`;

	const body = `${greeting}

I came across the ${roleTitle} role you posted and wanted to reach out.

${para2}

I've attached my resume for your consideration.

Happy to connect if there's a fit.

${name}
${email}
${phone}`;

	return { subject, body };
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error(
			"Usage:\n  npx ts-node agent/email.ts jd/company-role.txt [--name Priya]",
		);
		process.exit(1);
	}

	const recruiterName = getFlag(args, "--name");
	const jdArg = args.find((a) => !a.startsWith("--") && a !== recruiterName);
	if (!jdArg) {
		console.error("No JD file provided.");
		process.exit(1);
	}

	const jdText = parseJDFromArgs([jdArg]);
	const resume = loadResume();
	const roleTitle = extractRoleTitleFromJD(jdText, resume.header.title);
	const greeting = recruiterName ? `Hi ${recruiterName},` : "Hi,";

	// Top 3 bullets by JD relevance — passed to model for slot filling only
	const topBullets = selectRelevantBullets(resume, jdText, 3);
	const bulletLines = topBullets
		.map((b, i) => `${i + 1}. [${b.source}] ${b.sentence}`)
		.join("\n");

	const prompt = buildSlotPrompt(bulletLines, jdText);

	console.log("\n⏳ Filling email slots via Ollama...\n");
	const raw = await callOllama(prompt, { temperature: 0.3, numPredict: 150 });
	const slots = extractSlots(raw);

	const { subject, body } = assembleEmail(
		greeting,
		roleTitle,
		slots,
		resume.header.name,
		resume.contact.email,
		resume.contact.phone,
	);

	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	fs.writeFileSync(
		path.join(OUTPUT_DIR, "email.txt"),
		`SUBJECT: ${subject}\n\n${body}`,
	);

	console.log("┌─────────────────────────────────────────────────────┐");
	console.log("│  SUBJECT                                             │");
	console.log("└─────────────────────────────────────────────────────┘");
	console.log(subject);
	console.log("\n┌─────────────────────────────────────────────────────┐");
	console.log("│  BODY                                                │");
	console.log("└─────────────────────────────────────────────────────┘");
	console.log(body);
	console.log("\n─────────────────────────────────────────────────────");
	console.log("✅ Saved to output/email.txt\n");
}

main().catch((err) => {
	console.error("Fatal:", err);
	process.exit(1);
});
