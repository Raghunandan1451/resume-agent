import { useState } from "react";

interface Props {
	onRun: (params: {
		jdText: string;
		recruiterName: string;
		companyName: string;
		includeCover: boolean;
	}) => void;
	running: boolean;
}

export default function InputPanel({ onRun, running }: Props) {
	const [jdText, setJdText] = useState("");
	const [recruiterName, setRecruiterName] = useState("");
	const [companyName, setCompanyName] = useState("");
	const [includeCover, setIncludeCover] = useState(false);

	const canRun = jdText.trim().length > 20 && !running;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
			{/* JD Input */}
			<div>
				<label style={labelStyle}>Job Description *</label>
				<textarea
					value={jdText}
					onChange={(e) => setJdText(e.target.value)}
					placeholder="Paste the full job description here..."
					style={{
						...inputStyle,
						height: 220,
						resize: "vertical",
						fontFamily: "inherit",
					}}
				/>
				<div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>
					{jdText.length > 0
						? `${jdText.length} characters`
						: "Paste the full JD for best results"}
				</div>
			</div>

			{/* Optional fields */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: 12,
				}}
			>
				<div>
					<label style={labelStyle}>
						Recruiter Name{" "}
						<span style={{ color: "#444" }}>(optional)</span>
					</label>
					<input
						value={recruiterName}
						onChange={(e) => setRecruiterName(e.target.value)}
						placeholder="e.g. Priya"
						style={inputStyle}
					/>
				</div>
				<div>
					<label style={labelStyle}>
						Company Name{" "}
						<span style={{ color: "#444" }}>(optional)</span>
					</label>
					<input
						value={companyName}
						onChange={(e) => setCompanyName(e.target.value)}
						placeholder="e.g. Suffescom Solutions"
						style={inputStyle}
					/>
				</div>
			</div>

			{/* Cover letter toggle */}
			<label
				style={{
					display: "flex",
					alignItems: "center",
					gap: 10,
					cursor: "pointer",
					fontSize: 13,
					color: "#888",
					userSelect: "none",
				}}
			>
				<div
					onClick={() => setIncludeCover((v) => !v)}
					style={{
						width: 36,
						height: 20,
						borderRadius: 10,
						background: includeCover ? "#166534" : "#222",
						border: `1px solid ${includeCover ? "#14532d" : "#333"}`,
						position: "relative",
						cursor: "pointer",
						transition: "background 0.2s",
					}}
				>
					<div
						style={{
							position: "absolute",
							top: 2,
							left: includeCover ? 17 : 2,
							width: 14,
							height: 14,
							borderRadius: "50%",
							background: includeCover ? "#86efac" : "#555",
							transition: "left 0.2s",
						}}
					/>
				</div>
				Generate cover letter PDF
			</label>

			{/* Run button */}
			<button
				onClick={() =>
					onRun({ jdText, recruiterName, companyName, includeCover })
				}
				disabled={!canRun}
				style={{
					background: canRun ? "#166534" : "#111",
					border: `1px solid ${canRun ? "#14532d" : "#222"}`,
					color: canRun ? "#86efac" : "#333",
					padding: "12px 0",
					borderRadius: 8,
					fontSize: 13,
					fontWeight: 700,
					cursor: canRun ? "pointer" : "not-allowed",
					fontFamily: "'IBM Plex Mono', monospace",
					transition: "all 0.15s",
					letterSpacing: 1,
				}}
			>
				{running ? "⏳  RUNNING..." : "▶  RUN PIPELINE"}
			</button>
		</div>
	);
}

const labelStyle: React.CSSProperties = {
	display: "block",
	fontSize: 11,
	color: "#555",
	letterSpacing: 1,
	textTransform: "uppercase",
	marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
	width: "100%",
	background: "#0f0f0f",
	border: "1px solid #222",
	borderRadius: 6,
	padding: "10px 12px",
	color: "#ccc",
	fontSize: 13,
	fontFamily: "'IBM Plex Mono', monospace",
	outline: "none",
	boxSizing: "border-box",
};
