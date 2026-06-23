import InputPanel from "../InputPanel";
import Pipeline from "../Pipeline";

const LeftPanel = ({
	startRun,
	running,
	steps,
	error,
}: {
	startRun: (params: any) => void;
	running: boolean;
	steps: any[];
	error: string;
}) => {
	return (
		<div className="border-r border-neutral-900 p-6 flex flex-col gap-5 overflow-y-auto">
			<InputPanel onRun={startRun} running={running} />
			{steps.length > 0 && <Pipeline steps={steps} error={error} />}
			{error && steps.length === 0 && (
				<div className="px-4 py-3 bg-red-950 border border-red-900 rounded-lg text-xs text-red-400">
					{error}
				</div>
			)}
		</div>
	);
};

export default LeftPanel;
