import { useState, useEffect, useRef } from "react";
import InputPanel from "./components/InputPanel";
import Pipeline, { PipelineStep } from "./components/Pipeline";
import DiffViewer, { ResumeData } from "./components/DiffViewer";
import EmailViewer from "./components/EmailViewer";
import PdfViewer from "./components/PdfViewer";

const API = "http://localhost:3001";

type Tab = "diff" | "email" | "resume" | "cover";

interface OutputData {
	base: ResumeData | null;
	tailored: ResumeData | null;
	email: string | null;
	coverLetter: string | null;
	resumePdf: string | null;
	coverPdf: string | null;
}

export default function App() {
	const [steps, setSteps] = useState<PipelineStep[]>([]);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState("");
	const [done, setDone] = useState(false);
	const [output, setOutput] = useState<OutputData | null>(null);
	const [tab, setTab] = useState<Tab>("diff");
	const esRef = useRef<EventSource | null>(null);

	// Cleanup SSE on unmount
	useEffect(
		() => () => {
			esRef.current?.close();
		},
		[],
	);

	async function handleRun(params: {
		jdText: string;
		recruiterName: string;
		companyName: string;
		includeCover: boolean;
	}) {
		setRunning(true);
		setDone(false);
		setError("");
		setSteps([]);
		setOutput(null);
		esRef.current?.close();

		try {
			// Start pipeline via POST — get SSE stream back
			const res = await fetch(`${API}/api/run`, {
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

			// Read SSE stream manually (fetch + ReadableStream)
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
						// Fetch output files
						const out = await fetch(`${API}/api/output`).then((r) =>
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

	const tabs: { id: Tab; label: string; available: boolean }[] = [
		{
			id: "diff",
			label: "Resume Diff",
			available: !!(output?.base && output?.tailored),
		},
		{ id: "email", label: "Email", available: !!output?.email },
		{ id: "resume", label: "Resume PDF", available: !!output?.resumePdf },
		{ id: "cover", label: "Cover Letter", available: !!output?.coverPdf },
	];

	return (
		<div
			style={{
				minHeight: "100vh",
				background: "#0a0a0a",
				fontFamily: "'IBM Plex Mono', monospace",
				color: "#ccc",
			}}
		>
			{/* Top bar */}
			<div
				style={{
					borderBottom: "1px solid #1a1a1a",
					padding: "14px 32px",
					display: "flex",
					alignItems: "center",
					gap: 12,
				}}
			>
				<span style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>
					Resume Agent
				</span>
				<span style={{ fontSize: 12, color: "#333" }}>
					local · no cloud · no cost
				</span>
				{done && (
					<span
						style={{
							marginLeft: "auto",
							fontSize: 11,
							background: "#0d2e1a",
							border: "1px solid #166534",
							color: "#86efac",
							padding: "3px 12px",
							borderRadius: 20,
						}}
					>
						✓ Pipeline complete
					</span>
				)}
			</div>

			<div
				style={{
					display: "grid",
					gridTemplateColumns: "360px 1fr",
					gap: 0,
					minHeight: "calc(100vh - 53px)",
				}}
			>
				{/* Left panel — input + pipeline */}
				<div
					style={{
						borderRight: "1px solid #1a1a1a",
						padding: "24px",
						display: "flex",
						flexDirection: "column",
						gap: 20,
						overflowY: "auto",
					}}
				>
					<InputPanel onRun={handleRun} running={running} />
					{steps.length > 0 && (
						<Pipeline steps={steps} error={error} />
					)}
					{error && steps.length === 0 && (
						<div
							style={{
								padding: "12px 16px",
								background: "#1a0e0e",
								border: "1px solid #7f1d1d",
								borderRadius: 8,
								fontSize: 12,
								color: "#f87171",
							}}
						>
							{error}
						</div>
					)}
				</div>

				{/* Right panel — results */}
				<div style={{ display: "flex", flexDirection: "column" }}>
					{/* Tab bar */}
					<div
						style={{
							display: "flex",
							borderBottom: "1px solid #1a1a1a",
							padding: "0 24px",
						}}
					>
						{tabs.map((t) => (
							<button
								key={t.id}
								onClick={() => t.available && setTab(t.id)}
								disabled={!t.available}
								style={{
									background: "none",
									border: "none",
									borderBottom:
										tab === t.id
											? "2px solid #86efac"
											: "2px solid transparent",
									color: !t.available
										? "#2a2a2a"
										: tab === t.id
											? "#86efac"
											: "#555",
									padding: "14px 20px",
									cursor: t.available
										? "pointer"
										: "not-allowed",
									fontSize: 12,
									fontFamily: "'IBM Plex Mono', monospace",
									letterSpacing: 1,
									marginBottom: -1,
								}}
							>
								{t.label}
							</button>
						))}
					</div>

					{/* Tab content */}
					<div
						style={{ flex: 1, padding: "24px", overflowY: "auto" }}
					>
						{!done && !running && (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									height: "100%",
									color: "#2a2a2a",
									fontSize: 13,
									textAlign: "center",
								}}
							>
								Paste a job description and run the pipeline
								<br />
								to see results here
							</div>
						)}

						{running && steps.length > 0 && (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									height: "100%",
									color: "#444",
									fontSize: 13,
								}}
							>
								⏳ Pipeline running...
							</div>
						)}

						{done && output && (
							<>
								{tab === "diff" &&
									output.base &&
									output.tailored && (
										<DiffViewer
											base={output.base}
											tailored={output.tailored}
										/>
									)}
								{tab === "email" && output.email && (
									<EmailViewer content={output.email} />
								)}
								{tab === "resume" && output.resumePdf && (
									<PdfViewer
										filename={output.resumePdf}
										label="Resume"
									/>
								)}
								{tab === "cover" && output.coverPdf && (
									<PdfViewer
										filename={output.coverPdf}
										label="Cover Letter"
									/>
								)}
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
