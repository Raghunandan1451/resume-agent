// ─── Ollama service ───────────────────────────────────────────────────────────
// Single source for all Ollama API calls.
// Use IPv4 loopback to avoid intermittent ::1/127.0.0.1 resolution issues.

const OLLAMA_URL =
	process.env.OLLAMA_URL || "http://127.0.0.1:11434/api/generate";

export const MODEL = "qwen2.5:7b";

export interface OllamaOptions {
	temperature?: number; // 0.2–0.6; lower = more faithful to facts
	numPredict?: number; // max tokens to generate
}

async function postToOllama(
	body: unknown,
	timeoutMs = 120000,
): Promise<Response> {
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const res = await fetch(OLLAMA_URL, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
			signal: controller.signal as any,
		});
		return res;
	} finally {
		clearTimeout(id);
	}
}

export async function callOllama(
	prompt: string,
	options: OllamaOptions = {},
): Promise<string> {
	const { temperature = 0.3, numPredict = 4096 } = options;

	const payload = {
		model: MODEL,
		prompt,
		stream: false,
		options: { temperature, num_predict: numPredict },
	};

	// Retry a couple times for transient failures
	const attempts = 3;
	const backoffMs = 500;
	let lastErr: Error | null = null;
	for (let i = 0; i < attempts; i++) {
		try {
			const response = await postToOllama(payload, 120000);
			if (!response.ok) {
				const errText = await response.text();
				throw new Error(`Ollama error ${response.status}: ${errText}`);
			}
			const data = (await response.json()) as { response: string };
			return data.response.trim();
		} catch (err) {
			lastErr = err as Error;
			if (i < attempts - 1)
				await new Promise((r) => setTimeout(r, backoffMs));
		}
	}

	throw new Error(
		`Ollama fetch to ${OLLAMA_URL} failed: ${lastErr?.message ?? "unknown"}`,
	);
}

// Lightweight health-check used at startup or before runs
export async function checkOllama(timeoutMs = 3000): Promise<void> {
	try {
		const res = await postToOllama(
			{ model: MODEL, prompt: "ping", stream: false },
			timeoutMs,
		);
		if (!res.ok) {
			const txt = await res.text();
			throw new Error(`health-check status ${res.status}: ${txt}`);
		}
		return;
	} catch (err) {
		throw new Error(
			`Ollama health-check failed: ${(err as Error).message}`,
		);
	}
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
