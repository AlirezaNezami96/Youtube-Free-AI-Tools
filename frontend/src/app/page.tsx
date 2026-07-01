import React from "react";
import Link from "next/link";
import { toolsRegistry, ToolEntry } from "@/lib/tools-registry";
import * as LucideIcons from "lucide-react";

export const metadata = {
	title: "YouTube Tools Suite — High-Performance Utilities",
	description: "A premium suite of utility tools for extracting transcripts, calculating playlist runtimes, downloading thumbnails, cleaning tracking URLs, and finding channel IDs.",
};

export default function HomePage() {
	// Group tools by category
	const categories: Record<string, ToolEntry[]> = {};
	for (const tool of toolsRegistry) {
		if (!categories[tool.category]) {
			categories[tool.category] = [];
		}
		categories[tool.category].push(tool);
	}

	// Derive category order from registry insertion order (first-seen wins)
	const categoryOrder: string[] = [];
	for (const tool of toolsRegistry) {
		if (!categoryOrder.includes(tool.category)) {
			categoryOrder.push(tool.category);
		}
	}

	return (
		<div className="space-y-12">
			{/* Hero Section */}
			<div className="text-center py-6 space-y-4">
				<h1 className="font-display text-4xl font-extrabold text-ink tracking-tight sm:text-5xl">
					YouTube Utility Suite
				</h1>
				<p className="mx-auto max-w-xl text-base text-ink-soft leading-relaxed">
					Fast, stateless, and premium tools to analyze and extract data from YouTube videos, playlists, and channels.
				</p>
			</div>

			{/* Tool Category Groups */}
			<div className="space-y-10">
				{categoryOrder.map((catName) => {
					const catTools = categories[catName];
					if (!catTools || catTools.length === 0) return null;

					return (
						<section key={catName} className="space-y-4">
							<h2 className="font-display text-lg font-bold text-primary-deep tracking-wide uppercase border-b border-primary/20 pb-2">
								{catName}
							</h2>
							<div className="grid gap-4 sm:grid-cols-2">
								{catTools.map((tool) => {
									const IconComp = (LucideIcons as any)[tool.iconName] || LucideIcons.HelpCircle;

									return (
										<Link
											key={tool.slug}
											href={`/${tool.slug}`}
											className="group relative overflow-hidden rounded-2xl border border-primary/25 bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-primary-deep hover:shadow-md cursor-pointer flex gap-4"
										>
											<div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-deep transition-colors group-hover:bg-primary-deep group-hover:text-white">
												<IconComp className="h-5.5 w-5.5" />
											</div>
											<div className="space-y-1.5">
												<h3 className="font-display text-base font-bold text-ink group-hover:text-primary-deep transition-colors leading-snug">
													{tool.name}
												</h3>
												<p className="text-xs text-ink-soft leading-relaxed">
													{tool.description}
												</p>
											</div>
										</Link>
									);
								})}
							</div>
						</section>
					);
				})}
			</div>
		</div>
	);
}
