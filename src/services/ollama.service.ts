// ─── Ollama service ───────────────────────────────────────────────────────────
// Single source for all Ollama API calls.
// Change MODEL or OLLAMA_URL here to affect the entire pipeline.

const OLLAMA_URL = "http://localhost:11434/api/generate";

export const MODEL = "qwen2.5:7b";

export interface OllamaOptions {
	temperature?: number; // 0.2–0.6; lower = more faithful to facts
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
			options: { temperature, num_predict: numPredict },
		}),
	});

	if (!response.ok) {
		const err = await response.text();
		throw new Error(`Ollama error ${response.status}: ${err}`);
	}

	const data = (await response.json()) as { response: string };
	return data.response.trim();
}

// Strips ```json fences that smaller models add despite instructions,
// then parses and returns the JSON value.
export function extractJSON<T = unknown>(raw: string): T {
	const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
	const cleaned = fenceMatch ? fenceMatch[1].trim() : raw.trim();

	try {
		return JSON.parse(cleaned) as T;
	} catch {
		// Last resort — find first { and last }
		const start = cleaned.indexOf("{");
		const end = cleaned.lastIndexOf("}");
		if (start !== -1 && end !== -1) {
			return JSON.parse(cleaned.slice(start, end + 1)) as T;
		}
		throw new Error(
			`Could not parse JSON from model response.\nRaw: ${raw.slice(0, 200)}`,
		);
	}
}
