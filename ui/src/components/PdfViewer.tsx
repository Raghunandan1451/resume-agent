interface Props {
	filename: string;
	label: string;
}

const API = "http://localhost:3001";

export default function PdfViewer({ filename, label }: Props) {
	const url = `${API}/api/pdf/${encodeURIComponent(filename)}`;

	return (
		<div className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<span className="text-[10px] text-neutral-600 tracking-widest uppercase">
					{label}
				</span>
				<a
					href={url}
					download={filename}
					className="text-[10px] text-neutral-600 border border-neutral-800 px-3 py-1 rounded hover:text-neutral-400 hover:border-neutral-600 transition-colors no-underline"
				>
					↓ Download
				</a>
			</div>
			<iframe
				src={url}
				className="w-full h-175 border border-neutral-800 rounded-xl bg-neutral-950"
				title={label}
			/>
		</div>
	);
}
