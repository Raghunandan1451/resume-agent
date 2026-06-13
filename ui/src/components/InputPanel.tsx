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
		<div className="flex flex-col gap-4">
			{/* JD textarea */}
			<div className="flex flex-col gap-1.5">
				<label className="text-[10px] text-neutral-600 tracking-widest uppercase">
					Job Description *
				</label>
				<textarea
					value={jdText}
					onChange={(e) => setJdText(e.target.value)}
					placeholder="Paste the full job description here..."
					className="scrollbar-auto w-full h-52 bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2.5 text-sm text-neutral-300 placeholder-neutral-700 resize-y outline-none focus:border-neutral-600 font-mono"
				/>
				<span className="text-[10px] text-neutral-700">
					{jdText.length > 0
						? `${jdText.length} characters`
						: "Paste the full JD for best results"}
				</span>
			</div>

			{/* Optional fields */}
			<div className="grid grid-cols-2 gap-3">
				<div className="flex flex-col gap-1.5">
					<label className="text-[10px] text-neutral-600 tracking-widest uppercase">
						Recruiter Name{" "}
						<span className="normal-case text-neutral-700">
							(optional)
						</span>
					</label>
					<input
						value={recruiterName}
						onChange={(e) => setRecruiterName(e.target.value)}
						placeholder="e.g. Priya"
						className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm text-neutral-300 placeholder-neutral-700 outline-none focus:border-neutral-600 font-mono"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<label className="text-[10px] text-neutral-600 tracking-widest uppercase">
						Company Name{" "}
						<span className="normal-case text-neutral-700">
							(optional)
						</span>
					</label>
					<input
						value={companyName}
						onChange={(e) => setCompanyName(e.target.value)}
						placeholder="e.g. Acme Corp"
						className="w-full bg-neutral-950 border border-neutral-800 rounded-md px-3 py-2 text-sm text-neutral-300 placeholder-neutral-700 outline-none focus:border-neutral-600 font-mono"
					/>
				</div>
			</div>

			{/* Cover letter toggle */}
			<label className="flex items-center gap-3 cursor-pointer select-none">
				<button
					type="button"
					onClick={() => setIncludeCover((v) => !v)}
					className={[
						"relative w-9 h-5 rounded-full border transition-colors duration-200",
						includeCover
							? "bg-green-900 border-green-700"
							: "bg-neutral-900 border-neutral-700",
					].join(" ")}
				>
					<span
						className={[
							"absolute top-0.5 w-3.5 h-3.5 rounded-full transition-all duration-200",
							includeCover
								? "left-4.5 bg-green-400"
								: "left-0.5 bg-neutral-600",
						].join(" ")}
					/>
				</button>
				<span className="text-xs text-neutral-500">
					Generate cover letter PDF
				</span>
			</label>

			{/* Run button */}
			<button
				onClick={() =>
					onRun({ jdText, recruiterName, companyName, includeCover })
				}
				disabled={!canRun}
				className={[
					"w-full py-3 rounded-lg text-xs font-bold tracking-widest transition-all duration-150 border",
					canRun
						? "bg-green-950 border-green-800 text-green-400 hover:bg-green-900 cursor-pointer"
						: "bg-neutral-950 border-neutral-800 text-neutral-700 cursor-not-allowed",
				].join(" ")}
			>
				{running ? "⏳  RUNNING..." : "▶  RUN PIPELINE"}
			</button>
		</div>
	);
}
