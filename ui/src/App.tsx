import { useState } from "react";
import InputPanel from "./components/InputPanel";
import Pipeline, { PipelineStep } from "./components/Pipeline";
import DiffViewer, { ResumeData } from "./components/DiffViewer";
import EmailViewer from "./components/EmailViewer";
import PdfViewer from "./components/PdfViewer";
import { handleRun, OutputData, RunParams, Tab } from "./lib/handleRun";
import Header from "./components/layout";

const API = "http://localhost:3001";

export default function App() {
	const [steps, setSteps] = useState<PipelineStep[]>([]);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState("");
	const [done, setDone] = useState(false);
	const [output, setOutput] = useState<OutputData | null>(null);
	const [tab, setTab] = useState<Tab>("diff");

	function startRun(params: RunParams) {
		handleRun(API, params, {
			setSteps,
			setError,
			setOutput,
			setDone,
			setRunning,
			setTab,
		});
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
		<div className="min-h-screen bg-[#0a0a0a] text-neutral-400 font-mono">
			{/* Top bar */}
			<Header done={done} />

			<div className="grid grid-cols-[360px_1fr] min-h-[calc(100vh-53px)]">
				{/* Left panel */}
				<div className="border-r border-neutral-900 p-6 flex flex-col gap-5 overflow-y-auto">
					<InputPanel onRun={startRun} running={running} />
					{steps.length > 0 && (
						<Pipeline steps={steps} error={error} />
					)}
					{error && steps.length === 0 && (
						<div className="px-4 py-3 bg-red-950 border border-red-900 rounded-lg text-xs text-red-400">
							{error}
						</div>
					)}
				</div>

				{/* Right panel */}
				<div className="flex flex-col">
					{/* Tab bar */}
					<div className="flex border-b border-neutral-900 px-6">
						{tabs.map((t) => (
							<button
								key={t.id}
								onClick={() => t.available && setTab(t.id)}
								disabled={!t.available}
								className={[
									"px-5 py-3.5 text-xs tracking-widest -mb-px border-b-2 transition-colors",
									tab === t.id
										? "border-green-400 text-green-400"
										: t.available
											? "border-transparent text-neutral-600 hover:text-neutral-400"
											: "border-transparent text-neutral-800 cursor-not-allowed",
								].join(" ")}
							>
								{t.label}
							</button>
						))}
					</div>

					{/* Tab content */}
					<div className="flex-1 p-6 overflow-y-auto">
						{!done && !running && (
							<div className="flex items-center justify-center h-full text-neutral-800 text-sm text-center">
								Paste a job description and run the pipeline
								<br />
								to see results here
							</div>
						)}
						{running && steps.length > 0 && (
							<div className="flex items-center justify-center h-full text-neutral-600 text-sm">
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
