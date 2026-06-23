import { Tab } from "../../lib/handleRun";

const TabBar = ({
	tabs,
	tab,
	setTab,
}: {
	tabs: any[];
	tab: Tab;
	setTab: (tab: Tab) => void;
}) => {
	return (
		<div className="flex border-b border-neutral-900 px-6">
			{tabs.map((t) => (
				<button
					key={t.id}
					onClick={() => t.available && setTab(t.id)}
					disabled={!t.available}
					className={[
						"px-5 py-3.5 text-xs tracking-widest -mb-px border-b-2 transition-colors",
						tab === t.id
							? "border-green-400 text-green-400"
							: t.available
								? "border-transparent text-neutral-600 hover:text-neutral-400"
								: "border-transparent text-neutral-800 cursor-not-allowed",
					].join(" ")}
				>
					{t.label}
				</button>
			))}
		</div>
	);
};

export default TabBar;
