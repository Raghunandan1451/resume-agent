const Header = ({ done }: { done: boolean }) => {
	return (
		<div className="border-b border-neutral-900 px-8 py-3.5 flex items-center gap-3">
			<span className="text-sm font-bold text-white">Resume Agent</span>
			<span className="text-xs text-neutral-700">
				local · no cloud · no cost
			</span>
			{done && (
				<span className="ml-auto text-xs bg-green-950 border border-green-800 text-green-400 px-3 py-0.5 rounded-full">
					✓ Pipeline complete
				</span>
			)}
		</div>
	);
};

export default Header;
