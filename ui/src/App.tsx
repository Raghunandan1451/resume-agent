import { useState } from "react";
import { PipelineStep } from "./components/Pipeline";
import { handleRun, OutputData, RunParams, Tab } from "./lib/handleRun";
import { Header, LeftPanel, RightPanel } from "./components/layout";

const API = "";

export default function App() {
	const [steps, setSteps] = useState<PipelineStep[]>([]);
	const [running, setRunning] = useState(false);
	const [error, setError] = useState("");
	const [done, setDone] = useState(false);
	const [output, setOutput] = useState<OutputData | null>(null);
	const [tab, setTab] = useState<Tab>("diff");
	const handleSetTab = (tab: string) => setTab(tab as Tab);

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
				<LeftPanel
					startRun={startRun}
					running={running}
					steps={steps}
					error={error}
				/>

				{/* Right panel */}
				<RightPanel
					tabs={tabs}
					tab={tab}
					setTab={setTab}
					done={done}
					running={running}
					steps={steps}
					output={output}
				/>
			</div>
		</div>
	);
}
