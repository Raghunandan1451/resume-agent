interface Props {
	content: string;
}

export default function EmailViewer({ content }: Props) {
	const lines = content.split("\n");
	const subject =
		lines
			.find((l) => l.startsWith("SUBJECT:"))
			?.replace("SUBJECT:", "")
			.trim() ?? "";
	const body = lines
		.slice(lines.findIndex((l) => l.startsWith("BODY:")) + 1)
		.join("\n")
		.trim();

	const copyToClipboard = (text: string) =>
		navigator.clipboard.writeText(text);

	return (
		<div
			style={{
				fontFamily: "'IBM Plex Mono', monospace",
				display: "flex",
				flexDirection: "column",
				gap: 16,
			}}
		>
			{/* Subject */}
			<div>
				<div
					style={{
						fontSize: 10,
						color: "#444",
						letterSpacing: 2,
						marginBottom: 8,
					}}
				>
					SUBJECT
				</div>
				<div
					style={{
						background: "#0f0f0f",
						border: "1px solid #222",
						borderRadius: 6,
						padding: "10px 14px",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<span style={{ fontSize: 13, color: "#ccc" }}>
						{subject}
					</span>
					<button
						onClick={() => copyToClipboard(subject)}
						style={copyBtnStyle}
					>
						Copy
					</button>
				</div>
			</div>

			{/* Body */}
			<div>
				<div
					style={{
						fontSize: 10,
						color: "#444",
						letterSpacing: 2,
						marginBottom: 8,
					}}
				>
					BODY
				</div>
				<div
					style={{
						background: "#0f0f0f",
						border: "1px solid #222",
						borderRadius: 6,
						padding: "16px",
						position: "relative",
					}}
				>
					<button
						onClick={() => copyToClipboard(body)}
						style={{
							...copyBtnStyle,
							position: "absolute",
							top: 12,
							right: 12,
						}}
					>
						Copy
					</button>
					{body.split("\n").map((line, i) => (
						<div
							key={i}
							style={{
								fontSize: 13,
								color: line ? "#ccc" : "transparent",
								lineHeight: "1.8",
								minHeight: line ? "auto" : "1.8em",
							}}
						>
							{line || "\u00A0"}
						</div>
					))}
				</div>
			</div>

			{/* Copy all button */}
			<button
				onClick={() => copyToClipboard(content)}
				style={{
					background: "#0f0f0f",
					border: "1px solid #222",
					color: "#888",
					padding: "10px 0",
					borderRadius: 6,
					cursor: "pointer",
					fontSize: 12,
					fontFamily: "'IBM Plex Mono', monospace",
					letterSpacing: 1,
				}}
			>
				Copy Full Email (Subject + Body)
			</button>
		</div>
	);
}

const copyBtnStyle: React.CSSProperties = {
	background: "none",
	border: "1px solid #333",
	color: "#666",
	padding: "3px 10px",
	borderRadius: 4,
	cursor: "pointer",
	fontSize: 11,
	fontFamily: "'IBM Plex Mono', monospace",
};
