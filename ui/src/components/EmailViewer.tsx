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
	const bodyIdx = lines.findIndex((l) => l.startsWith("BODY:"));
	const body =
		bodyIdx !== -1
			? lines
					.slice(bodyIdx + 1)
					.join("\n")
					.trim()
			: content;

	const copy = (text: string) => navigator.clipboard.writeText(text);

	return (
		<div className="flex flex-col gap-5 font-mono">
			{/* Subject */}
			<div className="flex flex-col gap-2">
				<div className="text-[10px] text-neutral-600 tracking-widest uppercase">
					Subject
				</div>
				<div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-3">
					<span className="text-sm text-neutral-300">{subject}</span>
					<button
						onClick={() => copy(subject)}
						className="text-[10px] text-neutral-600 border border-neutral-800 px-2.5 py-1 rounded hover:text-neutral-400 hover:border-neutral-600 transition-colors"
					>
						Copy
					</button>
				</div>
			</div>

			{/* Body */}
			<div className="flex flex-col gap-2">
				<div className="flex items-center justify-between">
					<div className="text-[10px] text-neutral-600 tracking-widest uppercase">
						Body
					</div>
					<button
						onClick={() => copy(body)}
						className="text-[10px] text-neutral-600 border border-neutral-800 px-2.5 py-1 rounded hover:text-neutral-400 hover:border-neutral-600 transition-colors"
					>
						Copy
					</button>
				</div>
				<div className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-4">
					{body.split("\n").map((line, i) => (
						<div
							key={i}
							className={`text-sm leading-relaxed ${line ? "text-neutral-300" : "h-4"}`}
						>
							{line || ""}
						</div>
					))}
				</div>
			</div>

			{/* Copy all */}
			<button
				onClick={() => copy(`Subject: ${subject}\n\n${body}`)}
				className="w-full py-2.5 bg-neutral-950 border border-neutral-800 text-neutral-600 text-xs rounded-lg hover:text-neutral-400 hover:border-neutral-600 transition-colors tracking-widest"
			>
				Copy Full Email
			</button>
		</div>
	);
}
