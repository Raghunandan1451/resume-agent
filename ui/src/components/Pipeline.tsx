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

export default function Pipeline({ steps, error }: Props) {
	if (steps.length === 0) return null;

	const icons: Record<PipelineStep["status"], string> = {
		pending: "○",
		running: "⏳",
		done: "✅",
		failed: "❌",
		skipped: "⏭",
	};

	const colors: Record<PipelineStep["status"], string> = {
		pending: "#333",
		running: "#fbbf24",
		done: "#86efac",
		failed: "#f87171",
		skipped: "#444",
	};

	return (
		<div
			style={{
				background: "#0f0f0f",
				border: "1px solid #1f1f1f",
				borderRadius: 10,
				padding: "20px 24px",
				fontFamily: "'IBM Plex Mono', monospace",
			}}
		>
			<div
				style={{
					fontSize: 11,
					color: "#444",
					letterSpacing: 2,
					marginBottom: 16,
				}}
			>
				PIPELINE
			</div>

			{steps.map((step) => (
				<div
					key={step.id}
					style={{
						display: "flex",
						alignItems: "center",
						gap: 12,
						padding: "8px 0",
						borderBottom: "1px solid #111",
					}}
				>
					<span
						style={{ fontSize: 16, width: 24, textAlign: "center" }}
					>
						{icons[step.status]}
					</span>
					<span
						style={{
							flex: 1,
							fontSize: 13,
							color: colors[step.status],
						}}
					>
						{step.label}
					</span>
					{step.duration && (
						<span style={{ fontSize: 11, color: "#444" }}>
							{step.duration}
						</span>
					)}
					{step.status === "running" && (
						<span style={{ fontSize: 11, color: "#fbbf24" }}>
							running...
						</span>
					)}
					{step.status === "pending" && (
						<span style={{ fontSize: 11, color: "#333" }}>
							waiting
						</span>
					)}
					{step.status === "skipped" && (
						<span style={{ fontSize: 11, color: "#333" }}>
							skipped
						</span>
					)}
				</div>
			))}

			{error && (
				<div
					style={{
						marginTop: 16,
						padding: "10px 14px",
						background: "#1a0e0e",
						border: "1px solid #7f1d1d",
						borderRadius: 6,
						fontSize: 12,
						color: "#f87171",
					}}
				>
					{error}
				</div>
			)}
		</div>
	);
}
