interface Props {
	filename: string;
	label: string;
}

const API = "http://localhost:3001";

export default function PdfViewer({ filename, label }: Props) {
	const url = `${API}/api/pdf/${encodeURIComponent(filename)}`;

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
			<div
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}
			>
				<span style={{ fontSize: 11, color: "#444", letterSpacing: 2 }}>
					{label.toUpperCase()}
				</span>
				<a
					href={url}
					download={filename}
					style={{
						background: "none",
						border: "1px solid #333",
						color: "#666",
						padding: "4px 12px",
						borderRadius: 4,
						cursor: "pointer",
						fontSize: 11,
						fontFamily: "'IBM Plex Mono', monospace",
						textDecoration: "none",
					}}
				>
					↓ Download
				</a>
			</div>

			<iframe
				src={url}
				style={{
					width: "100%",
					height: 700,
					border: "1px solid #1f1f1f",
					borderRadius: 8,
					background: "#0a0a0a",
				}}
				title={label}
			/>
		</div>
	);
}
