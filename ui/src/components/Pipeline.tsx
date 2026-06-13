export interface PipelineStep {
	id: string;
	label: string;
	status: "pending" | "running" | "done" | "failed" | "skipped";
	duration?: string;
}

interface Props {
	steps: PipelineStep[];
	error?: string;
}

const icons: Record<PipelineStep["status"], string> = {
	pending: "○",
	running: "⏳",
	done: "✅",
	failed: "❌",
	skipped: "⏭",
};

const labelColors: Record<PipelineStep["status"], string> = {
	pending: "text-neutral-700",
	running: "text-yellow-400",
	done: "text-green-400",
	failed: "text-red-400",
	skipped: "text-neutral-700",
};

const statusText: Record<PipelineStep["status"], string> = {
	pending: "waiting",
	running: "running...",
	done: "",
	failed: "failed",
	skipped: "skipped",
};

export default function Pipeline({ steps, error }: Props) {
	if (steps.length === 0) return null;

	return (
		<div className="bg-neutral-950 border border-neutral-800 rounded-xl p-5">
			<div className="text-[10px] text-neutral-700 tracking-widest mb-4">
				PIPELINE
			</div>

			<div className="flex flex-col divide-y divide-neutral-900">
				{steps.map((step) => (
					<div
						key={step.id}
						className="flex items-center gap-3 py-2.5"
					>
						<span className="text-base w-6 text-center">
							{icons[step.status]}
						</span>
						<span
							className={`flex-1 text-xs ${labelColors[step.status]}`}
						>
							{step.label}
						</span>
						<span className="text-[10px] text-neutral-600">
							{step.duration ?? statusText[step.status]}
						</span>
					</div>
				))}
			</div>

			{error && (
				<div className="mt-4 px-3.5 py-2.5 bg-red-950 border border-red-900 rounded-lg text-xs text-red-400">
					{error}
				</div>
			)}
		</div>
	);
}
