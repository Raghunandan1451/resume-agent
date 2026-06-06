// ─── Ollama API wrapper ───────────────────────────────────────────────────────
// Single callOllama() used by tailor.ts, email.ts, and cover-letter.ts.

const OLLAMA_URL = "http://localhost:11434/api/generate";

export const MODEL = "qwen2.5:7b"; // Change here to affect all agent scripts

export interface OllamaOptions {
	temperature?: number; // 0.2–0.6 recommended; lower = more faithful
	numPredict?: number; // max tokens to generate
}

export async function callOllama(
	prompt: string,
	options: OllamaOptions = {},
): Promise<string> {
	const { temperature = 0.3, numPredict = 4096 } = options;

	const response = await fetch(OLLAMA_URL, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			model: MODEL,
			prompt,
			stream: false,
			options: {
				temperature,
				num_predict: numPredict,
			},
		}),
	});

	if (!response.ok) {
		const err = await response.text();
		throw new Error(`Ollama error ${response.status}: ${err}`);
	}

	const data = (await response.json()) as { response: string };
	return data.response.trim();
}

// Strips ```json fences that smaller models sometimes add despite instructions
export function extractJSON(raw: string): unknown {
	const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
	const cleaned = fenceMatch ? fenceMatch[1].trim() : raw.trim();

	try {
		return JSON.parse(cleaned);
	} catch {
		const start = cleaned.indexOf("{");
		const end = cleaned.lastIndexOf("}");
		if (start !== -1 && end !== -1) {
			return JSON.parse(cleaned.slice(start, end + 1));
		}
		throw new Error("Model did not return valid JSON.");
	}
}
