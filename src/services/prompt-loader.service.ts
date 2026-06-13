// Reads prompt .txt files and replaces {{variable}} placeholders.
// Keeps all prompt text out of TypeScript files.

import fs from "fs";
import path from "path";
import type { TemplateVars } from "../types";

const PROMPTS_DIR = path.resolve(__dirname, "../prompts");
const cache = new Map<string, string>();

export function loadPrompt(relativePath: string): string {
	if (cache.has(relativePath)) return cache.get(relativePath)!;

	const fullPath = path.join(PROMPTS_DIR, relativePath);
	if (!fs.existsSync(fullPath)) {
		throw new Error(`Prompt file not found: ${fullPath}`);
	}

	const content = fs.readFileSync(fullPath, "utf-8");
	cache.set(relativePath, content);
	return content;
}

export function fillTemplate(template: string, vars: TemplateVars): string {
	const templateVars = {
		output_rules: loadPrompt("shared/output-rules.txt"),
		...vars,
	};

	return Object.entries(templateVars).reduce((prompt, [key, value]) => {
		return prompt.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
	}, template);
}

export function buildPrompt(relativePath: string, vars: TemplateVars): string {
	return fillTemplate(loadPrompt(relativePath), vars);
}

export function clearPromptCache(): void {
	cache.clear();
}
