import { Tab } from "../../lib/handleRun";
import TabBar from "./TabBar";
import TabContent from "./TabContent";

const RightPanel = ({
	tabs,
	tab,
	setTab,
	done,
	running,
	steps,
	output,
}: {
	tabs: any[];
	tab: Tab;
	setTab: (tab: Tab) => void;
	done: boolean;
	running: boolean;
	steps: any[];
	output: any;
}) => {
	return (
		<div className="flex flex-col">
			{/* Tab bar */}
			<TabBar tabs={tabs} tab={tab} setTab={setTab} />

			{/* Tab content */}
			<TabContent
				tab={tab}
				done={done}
				running={running}
				steps={steps}
				output={output}
			/>
		</div>
	);
};

export default RightPanel;
