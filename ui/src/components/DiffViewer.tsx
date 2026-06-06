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

function Tag({
	label,
	color = "gray",
}: {
	label: string;
	color?: "gray" | "green" | "amber";
}) {
	const bg: Record<string, string> = {
		gray: "background:#1a1a1a;color:#555;border:1px solid #2a2a2a",
		green: "background:#0d2e1a;color:#4ade80;border:1px solid #166534",
		amber: "background:#2d1e00;color:#fbbf24;border:1px solid #92400e",
	};
	return (
		<span
			style={{
				...Object.fromEntries(
					bg[color].split(";").map((s) => {
						const [k, v] = s.split(":");
						return [
							k.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
							v,
						];
					}),
				),
				fontSize: 10,
				padding: "2px 7px",
				borderRadius: 20,
				fontFamily: "monospace",
			}}
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
	const cell = (side: "base" | "tailored") => {
		const b = side === "base" ? base : tailored;
		const isChanged = side === "tailored" && changed;
		return (
			<div
				style={{
					background: changed
						? side === "base"
							? "#1a0e0e"
							: "#0d1f0d"
						: "#111",
					padding: "9px 13px",
					borderRadius:
						side === "base" ? "6px 0 0 6px" : "0 6px 6px 0",
					borderLeft: `3px solid ${changed ? (side === "base" ? "#7f1d1d" : "#14532d") : "#1a1a1a"}`,
					fontSize: 12,
					lineHeight: 1.6,
					color: isChanged ? "#e2e8f0" : "#666",
				}}
			>
				<strong style={{ color: isChanged ? "#86efac" : "#888" }}>
					{b.verb}
				</strong>{" "}
				{b.text}
				<div
					style={{
						marginTop: 5,
						display: "flex",
						gap: 3,
						flexWrap: "wrap" as const,
					}}
				>
					{b.tags.map((t) => (
						<Tag
							key={t}
							label={t}
							color={isChanged ? "green" : "gray"}
						/>
					))}
				</div>
			</div>
		);
	};
	return (
		<div
			style={{
				display: "grid",
				gridTemplateColumns: "1fr 1fr",
				gap: 1,
				marginBottom: 2,
			}}
		>
			{cell("base")}
			{cell("tailored")}
		</div>
	);
}

function SectionLabel({ label, changed }: { label: string; changed: boolean }) {
	return (
		<div
			style={{
				display: "flex",
				alignItems: "center",
				gap: 8,
				margin: "24px 0 8px",
				borderBottom: "1px solid #1a1a1a",
				paddingBottom: 6,
			}}
		>
			<span style={{ fontSize: 10, color: "#444", letterSpacing: 2 }}>
				{label.toUpperCase()}
			</span>
			{changed && (
				<span
					style={{
						fontSize: 10,
						padding: "2px 7px",
						borderRadius: 20,
						background: "#2d1e00",
						color: "#fbbf24",
						border: "1px solid #92400e",
					}}
				>
					changed
				</span>
			)}
		</div>
	);
}

export default function DiffViewer({ base, tailored }: Props) {
	const summaryChanged = diffed(base.header.summary, tailored.header.summary);
	const titleChanged = diffed(base.header.title, tailored.header.title);

	return (
		<div style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
			{/* Column headers */}
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: 1,
					marginBottom: 12,
				}}
			>
				<div
					style={{
						fontSize: 10,
						color: "#333",
						letterSpacing: 2,
						textAlign: "center" as const,
					}}
				>
					BASE
				</div>
				<div
					style={{
						fontSize: 10,
						color: "#4ade80",
						letterSpacing: 2,
						textAlign: "center" as const,
					}}
				>
					TAILORED
				</div>
			</div>

			{/* Title */}
			{titleChanged && (
				<>
					<SectionLabel label="Title" changed={titleChanged} />
					<div
						style={{
							display: "grid",
							gridTemplateColumns: "1fr 1fr",
							gap: 1,
						}}
					>
						{[base.header.title, tailored.header.title].map(
							(t, i) => (
								<div
									key={i}
									style={{
										background:
											i === 0 ? "#1a0e0e" : "#0d1f0d",
										padding: "10px 14px",
										borderRadius:
											i === 0
												? "6px 0 0 6px"
												: "0 6px 6px 0",
										borderLeft: `3px solid ${i === 0 ? "#7f1d1d" : "#14532d"}`,
										fontSize: 13,
										color: i === 1 ? "#86efac" : "#666",
									}}
								>
									{t}
								</div>
							),
						)}
					</div>
				</>
			)}

			{/* Summary */}
			<SectionLabel label="Summary" changed={summaryChanged} />
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: 1,
				}}
			>
				{[base.header.summary, tailored.header.summary].map((s, i) => (
					<div
						key={i}
						style={{
							background: summaryChanged
								? i === 0
									? "#1a0e0e"
									: "#0d1f0d"
								: "#111",
							padding: "10px 14px",
							borderRadius:
								i === 0 ? "6px 0 0 6px" : "0 6px 6px 0",
							borderLeft: `3px solid ${summaryChanged ? (i === 0 ? "#7f1d1d" : "#14532d") : "#1a1a1a"}`,
							fontSize: 12,
							lineHeight: 1.7,
							color:
								summaryChanged && i === 1 ? "#e2e8f0" : "#666",
						}}
					>
						{s}
					</div>
				))}
			</div>

			{/* Skills */}
			<SectionLabel
				label="Skills"
				changed={
					JSON.stringify(base.skills) !==
					JSON.stringify(tailored.skills)
				}
			/>
			<div
				style={{
					display: "grid",
					gridTemplateColumns: "1fr 1fr",
					gap: 1,
				}}
			>
				{[base.skills, tailored.skills].map((skills, si) => (
					<div
						key={si}
						style={{
							background: "#111",
							padding: "10px 14px",
							borderRadius:
								si === 0 ? "6px 0 0 6px" : "0 6px 6px 0",
							borderLeft: "3px solid #1a1a1a",
							fontSize: 12,
						}}
					>
						{skills.map((cat) => (
							<div key={cat.label} style={{ marginBottom: 6 }}>
								<span style={{ color: "#444", marginRight: 6 }}>
									{cat.label}:
								</span>
								{cat.items.map((item, i) => (
									<span
										key={item}
										style={{
											color:
												i === 0
													? si === 1
														? "#86efac"
														: "#888"
													: "#555",
										}}
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
