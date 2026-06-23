import { Dispatch, SetStateAction } from "react";
import { PipelineStep } from "../components/Pipeline";
import { ResumeData } from "../components/DiffViewer";

export type Tab = "diff" | "email" | "resume" | "cover";

export type RunParams = {
	jdText: string;
	recruiterName: string;
	companyName: string;
	includeCover: boolean;
	includeEmail?: boolean;
};

export interface OutputData {
	base: ResumeData | null;
	tailored: ResumeData | null;
	email: string | null;
	coverLetter: string | null;
	resumePdf: string | null;
	coverPdf: string | null;
}

export type HandleRunCallbacks = {
	setSteps: Dispatch<SetStateAction<PipelineStep[]>>;
	setError: Dispatch<SetStateAction<string>>;
	setOutput: Dispatch<SetStateAction<OutputData | null>>;
	setDone: Dispatch<SetStateAction<boolean>>;
	setRunning: Dispatch<SetStateAction<boolean>>;
	setTab: Dispatch<SetStateAction<Tab>>;
};

export async function handleRun(
	apiUrl: string,
	params: RunParams,
	callbacks: HandleRunCallbacks,
) {
	const { setSteps, setError, setOutput, setDone, setRunning, setTab } =
		callbacks;

	setRunning(true);
	setDone(false);
	setError("");
	setSteps([]);
	setOutput(null);

	try {
		const res = await fetch(`${apiUrl}/api/run`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(params),
		});

		if (!res.ok || !res.body) {
			setError(
				"Failed to start pipeline. Is the server running on port 3001?",
			);
			setRunning(false);
			return;
		}

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		while (true) {
			const { done: streamDone, value } = await reader.read();
			if (streamDone) break;

			buffer += decoder.decode(value, { stream: true });
			const events = buffer.split("\n\n");
			buffer = events.pop() ?? "";

			for (const raw of events) {
				const eventMatch = raw.match(/^event: (.+)/m);
				const dataMatch = raw.match(/^data: (.+)/m);
				if (!eventMatch || !dataMatch) continue;

				const event = eventMatch[1].trim();
				const data = JSON.parse(dataMatch[1].trim());

				if (event === "steps") {
					setSteps(data as PipelineStep[]);
				} else if (event === "step_update") {
					setSteps((prev) =>
						prev.map((s) =>
							s.id === data.id ? { ...s, ...data } : s,
						),
					);
				} else if (event === "pipeline_error") {
					setError(data.message);
					setRunning(false);
				} else if (event === "pipeline_done") {
					const out = await fetch(`${apiUrl}/api/output`).then((r) =>
						r.json(),
					);
					setOutput(out);
					setDone(true);
					setRunning(false);
					setTab("diff");
				}
			}
		}
	} catch (err) {
		setError(
			`Connection error: ${(err as Error).message}. Make sure the server is running (npm run server).`,
		);
		setRunning(false);
	}
}
