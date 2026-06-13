interface Bullet {
	verb: string;
	text: string;
	tags: string[];
}
interface Role {
	company: string;
	title: string;
	period: string;
	tech: string[];
	bullets: Bullet[];
}
interface Project {
	name: string;
	url: string;
	urlLabel: string;
	period: string;
	tech: string[];
	bullets: Bullet[];
}

export interface ResumeData {
	header: { name: string; title: string; summary: string };
	skills: { label: string; items: string[] }[];
	experience: Role[];
	projects: Project[];
}

interface Props {
	base: ResumeData;
	tailored: ResumeData;
}

function diffed(a: string, b: string) {
	return a.trim() !== b.trim();
}

function Tag({ label, green = false }: { label: string; green?: boolean }) {
	return (
		<span
			className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
				green
					? "bg-green-950 text-green-500 border-green-800"
					: "bg-neutral-900 text-neutral-600 border-neutral-800"
			}`}
		>
			{label}
		</span>
	);
}

function BulletRow({ base, tailored }: { base: Bullet; tailored: Bullet }) {
	const changed = diffed(
		base.verb + base.text,
		tailored.verb + tailored.text,
	);

	const cell = (b: Bullet, side: "base" | "tailored") => {
		const isChanged = side === "tailored" && changed;
		return (
			<div
				className={`p-3 text-xs leading-relaxed ${
					side === "base" ? "rounded-l-md" : "rounded-r-md"
				} ${
					changed
						? side === "base"
							? "bg-red-950/40 border-l-2 border-red-900"
							: "bg-green-950/40 border-l-2 border-green-900"
						: "bg-neutral-900/40 border-l-2 border-neutral-800"
				}`}
			>
				<strong
					className={
						isChanged ? "text-green-400" : "text-neutral-500"
					}
				>
					{b.verb}
				</strong>{" "}
				<span
					className={
						isChanged ? "text-neutral-200" : "text-neutral-600"
					}
				>
					{b.text}
				</span>
				<div className="flex flex-wrap gap-1 mt-1.5">
					{b.tags.map((t) => (
						<Tag key={t} label={t} green={isChanged} />
					))}
				</div>
			</div>
		);
	};

	return (
		<div className="grid grid-cols-2 gap-px mb-px">
			{cell(base, "base")}
			{cell(tailored, "tailored")}
		</div>
	);
}

function SectionLabel({ label, changed }: { label: string; changed: boolean }) {
	return (
		<div className="flex items-center gap-2 mt-6 mb-2 border-b border-neutral-900 pb-1.5">
			<span className="text-[10px] text-neutral-600 tracking-widest uppercase">
				{label}
			</span>
			{changed && (
				<span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
					changed
				</span>
			)}
		</div>
	);
}

export default function DiffViewer({ base, tailored }: Props) {
	const summaryChanged = diffed(base.header.summary, tailored.header.summary);
	const titleChanged = diffed(base.header.title, tailored.header.title);
	const skillsChanged =
		JSON.stringify(base.skills) !== JSON.stringify(tailored.skills);

	return (
		<div className="font-mono">
			{/* Column headers */}
			<div className="grid grid-cols-2 gap-px mb-3">
				<div className="text-[10px] text-neutral-700 tracking-widest text-center">
					BASE
				</div>
				<div className="text-[10px] text-green-700 tracking-widest text-center">
					TAILORED
				</div>
			</div>

			{/* Title */}
			{titleChanged && (
				<>
					<SectionLabel label="Title" changed />
					<div className="grid grid-cols-2 gap-px">
						<div className="p-3 text-sm bg-red-950/40 border-l-2 border-red-900 rounded-l-md text-neutral-500">
							{base.header.title}
						</div>
						<div className="p-3 text-sm bg-green-950/40 border-l-2 border-green-900 rounded-r-md text-green-400">
							{tailored.header.title}
						</div>
					</div>
				</>
			)}

			{/* Summary */}
			<SectionLabel label="Summary" changed={summaryChanged} />
			<div className="grid grid-cols-2 gap-px">
				{[base.header.summary, tailored.header.summary].map((s, i) => (
					<div
						key={i}
						className={`p-3 text-xs leading-relaxed ${
							i === 0 ? "rounded-l-md" : "rounded-r-md"
						} ${
							summaryChanged
								? i === 0
									? "bg-red-950/40 border-l-2 border-red-900"
									: "bg-green-950/40 border-l-2 border-green-900"
								: "bg-neutral-900/40 border-l-2 border-neutral-800"
						} ${summaryChanged && i === 1 ? "text-neutral-200" : "text-neutral-600"}`}
					>
						{s}
					</div>
				))}
			</div>

			{/* Skills */}
			<SectionLabel label="Skills" changed={skillsChanged} />
			<div className="grid grid-cols-2 gap-px">
				{[base.skills, tailored.skills].map((skills, si) => (
					<div
						key={si}
						className={`p-3 text-xs bg-neutral-900/40 border-l-2 border-neutral-800 ${
							si === 0 ? "rounded-l-md" : "rounded-r-md"
						}`}
					>
						{skills.map((cat) => (
							<div key={cat.label} className="mb-1.5">
								<span className="text-neutral-600 mr-1.5">
									{cat.label}:
								</span>
								{cat.items.map((item, i) => (
									<span
										key={item}
										className={
											i === 0
												? si === 1
													? "text-green-400"
													: "text-neutral-400"
												: "text-neutral-600"
										}
									>
										{item}
										{i < cat.items.length - 1 ? ", " : ""}
									</span>
								))}
							</div>
						))}
					</div>
				))}
			</div>

			{/* Experience */}
			{base.experience.map((role, ri) => {
				const trole = tailored.experience[ri];
				const anyChanged = role.bullets.some((b, bi) =>
					diffed(
						b.verb + b.text,
						trole?.bullets[bi]?.verb + trole?.bullets[bi]?.text,
					),
				);
				return (
					<div key={ri}>
						<SectionLabel
							label={`${role.title} @ ${role.company}`}
							changed={anyChanged}
						/>
						{role.bullets.map((bullet, bi) => (
							<BulletRow
								key={bi}
								base={bullet}
								tailored={trole?.bullets[bi] ?? bullet}
							/>
						))}
					</div>
				);
			})}

			{/* Projects */}
			{base.projects.map((proj, pi) => {
				const tproj = tailored.projects[pi];
				const anyChanged = proj.bullets.some((b, bi) =>
					diffed(
						b.verb + b.text,
						tproj?.bullets[bi]?.verb + tproj?.bullets[bi]?.text,
					),
				);
				return (
					<div key={pi}>
						<SectionLabel
							label={`Project: ${proj.name}`}
							changed={anyChanged}
						/>
						{proj.bullets.map((bullet, bi) => (
							<BulletRow
								key={bi}
								base={bullet}
								tailored={tproj?.bullets[bi] ?? bullet}
							/>
						))}
					</div>
				);
			})}
		</div>
	);
}
