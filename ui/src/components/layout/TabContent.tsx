import DiffViewer from "../DiffViewer";
import EmailViewer from "../EmailViewer";
import PdfViewer from "../PdfViewer";

const TabContent = ({
	tab,
	done,
	running,
	steps,
	output,
}: {
	tab: string;
	done: boolean;
	running: boolean;
	steps: any[];
	output: any;
}) => {
	return (
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
					{tab === "diff" && output.base && output.tailored && (
						<DiffViewer
							base={output.base}
							tailored={output.tailored}
						/>
					)}
					{tab === "email" && output.email && (
						<EmailViewer content={output.email} />
					)}
					{tab === "resume" && output.resumePdf && (
						<PdfViewer filename={output.resumePdf} label="Resume" />
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
	);
};

export default TabContent;
