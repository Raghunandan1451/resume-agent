/**
 * apply.ts
 * --------
 * Orchestrator — runs the full pipeline in sequence:
 *   1. tailor        → output/tailored.json
 *   2. compile       → output/Name_Role.pdf
 *   3. email         → output/email.txt
 *   4. cover-letter  → output/cover_letter.pdf  (only with --cover flag)
 *
 * Usage:
 *   npx ts-node agent/apply.ts jd/company-role.txt
 *   npx ts-node agent/apply.ts jd/company-role.txt --name Priya
 *   npx ts-node agent/apply.ts jd/company-role.txt --name Priya --company "XYZ Ltd" --cover
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { getFlag, OUTPUT_DIR } from "./lib/resume";

type StepStatus = "running" | "done" | "failed" | "skipped";

interface Step {
	label: string;
	status: StepStatus;
	duration?: string;
}

const steps: Step[] = [];

function printSteps() {
	const icons: Record<StepStatus, string> = {
		running: "⏳",
		done: "✅",
		failed: "❌",
		skipped: "⏭ ",
	};
	console.clear();
	console.log("\n  Resume Agent — Full Pipeline\n");
	steps.forEach((s) =>
		console.log(
			`  ${icons[s.status]}  ${s.label.padEnd(35)} ${s.duration ?? ""}`,
		),
	);
	console.log("");
}

function runStep(label: string, command: string, skip = false): boolean {
	const step: Step = { label, status: skip ? "skipped" : "running" };
	steps.push(step);
	printSteps();
	if (skip) return true;

	const start = Date.now();
	try {
		execSync(command, {
			cwd: path.resolve(__dirname, ".."),
			stdio: "pipe",
		});
		step.status = "done";
		step.duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;
		printSteps();
		return true;
	} catch (err) {
		step.status = "failed";
		step.duration = `${((Date.now() - start) / 1000).toFixed(1)}s`;
		printSteps();
		const e = err as { stderr?: Buffer; stdout?: Buffer };
		if (e.stderr?.toString().trim()) console.error(e.stderr.toString());
		if (e.stdout?.toString().trim()) console.error(e.stdout.toString());
		return false;
	}
}

function printSummary(includeCover: boolean) {
	console.log("─────────────────────────────────────────────────────");
	console.log("  Output files:\n");
	const files = [
		{ label: "Tailored resume JSON", file: "output/tailored.json" },
		{ label: "Resume PDF", file: "output/*.pdf" },
		{ label: "Recruiter email", file: "output/email.txt" },
		...(includeCover
			? [{ label: "Cover letter PDF", file: "output/cover_letter.pdf" }]
			: []),
	];
	files.forEach((f) => console.log(`  📄 ${f.label.padEnd(25)} ${f.file}`));
	console.log("\n  Next steps:");
	console.log("  1. Review output/email.txt and copy into your email client");
	console.log("  2. Attach the resume PDF");
	console.log(
		"  3. Run 'npm run ui' to review resume changes in the diff viewer\n",
	);
}

async function main() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		console.error(
			'\nUsage:\n  npx ts-node agent/apply.ts jd/company-role.txt [--name Priya] [--company "XYZ"] [--cover]',
		);
		process.exit(1);
	}

	const recruiterName = getFlag(args, "--name");
	const companyName = getFlag(args, "--company");
	const includeCover = args.includes("--cover");
	const jdFile =
		args.find(
			(a) =>
				!a.startsWith("--") && a !== recruiterName && a !== companyName,
		) ?? "";

	if (!jdFile) {
		console.error("No JD file provided.");
		process.exit(1);
	}
	if (!fs.existsSync(path.resolve(jdFile))) {
		console.error(`JD file not found: ${jdFile}`);
		process.exit(1);
	}

	fs.mkdirSync(OUTPUT_DIR, { recursive: true });

	const emailFlags = [
		recruiterName ? `--name ${recruiterName}` : "",
		companyName ? `--company "${companyName}"` : "",
	]
		.filter(Boolean)
		.join(" ");

	const tsnode = "npx ts-node";

	const ok1 = runStep(
		"Tailoring resume to JD",
		`${tsnode} agent/tailor.ts "${jdFile}"`,
	);
	if (!ok1) {
		console.error("\n  ❌ Stopped at tailor step.");
		process.exit(1);
	}

	const ok2 = runStep("Compiling resume PDF", `${tsnode} agent/compile.ts`);
	if (!ok2) {
		console.error("\n  ❌ Stopped at compile step.");
		process.exit(1);
	}

	const ok3 = runStep(
		"Generating recruiter email",
		`${tsnode} agent/email.ts "${jdFile}" ${emailFlags}`.trim(),
	);
	if (!ok3) {
		console.error("\n  ❌ Stopped at email step.");
		process.exit(1);
	}

	runStep(
		"Generating cover letter",
		`${tsnode} agent/cover-letter.ts "${jdFile}"`,
		!includeCover,
	);

	printSummary(includeCover);
}

main().catch((err) => {
	console.error("Fatal:", err);
	process.exit(1);
});
