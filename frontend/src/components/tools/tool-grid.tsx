"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { toolsRegistry, ToolEntry } from "@/lib/tools-registry";
import { getToolVisible } from "@/lib/firebase/remote-config";
import * as LucideIcons from "lucide-react";

export default function ToolGrid() {
	const [visibleTools, setVisibleTools] = useState<ToolEntry[]>(toolsRegistry);

	useEffect(() => {
		async function fetchVisibility() {
			const visibleList: ToolEntry[] = [];
			for (const tool of toolsRegistry) {
				// Base visibility from registry
				if (tool.visible === false) continue;
				// Check remote config override
				const rcVisible = await getToolVisible(tool.slug);
				if (rcVisible) visibleList.push(tool);
			}
			setVisibleTools(visibleList);
		}
		fetchVisibility();
	}, []);

	// Group tools by category
	const categories: Record<string, ToolEntry[]> = {};
	for (const tool of visibleTools) {
		if (!categories[tool.category]) {
			categories[tool.category] = [];
		}
		categories[tool.category].push(tool);
	}

	// Derive category order from registry insertion order (first-seen wins)
	const categoryOrder: string[] = [];
	for (const tool of toolsRegistry) { // Use all tools to maintain stable category order
		if (!categoryOrder.includes(tool.category)) {
			categoryOrder.push(tool.category);
		}
	}

	return (
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
	);
}
