"use client";

import React from "react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import UrlInput from "./url-input";

interface ToolPageLayoutProps {
	title: string;
	description: string;
	iconName: string;
	inputType: "video" | "playlist" | "channel";
	onSubmit: (url: string) => void;
	isLoading: boolean;
	optionsNode?: React.ReactNode;
	children?: React.ReactNode;
}

export default function ToolPageLayout({
	title,
	description,
	iconName,
	inputType,
	onSubmit,
	isLoading,
	optionsNode,
	children,
}: ToolPageLayoutProps) {
	const icons = LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>;
	const IconComponent = icons[iconName] ?? LucideIcons.HelpCircle;

	return (
		<div className="space-y-8 max-w-2xl mx-auto">
			{/* Breadcrumb / Back button */}
			<div className="flex items-center">
				<Link
					href="/"
					className="flex items-center gap-1 text-xs font-semibold text-ink-soft hover:text-primary-deep transition-colors"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						strokeWidth="2.5"
						stroke="currentColor"
						className="h-3.5 w-3.5"
					>
						<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
					</svg>
					Back to Tools
				</Link>
			</div>

			{/* Tool Page Header */}
			<div className="flex items-start gap-4">
				<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-deep shadow-sm">
					<IconComponent className="h-6 w-6" />
				</div>
				<div className="space-y-1">
					<h1 className="font-display text-2xl font-bold text-ink leading-tight">
						{title}
					</h1>
					<p className="text-sm text-ink-soft leading-relaxed">
						{description}
					</p>
				</div>
			</div>

			{/* Tool Action Panel */}
			<div className="rounded-2xl border border-primary/20 bg-white p-6 shadow-sm space-y-6">
				{/* Options */}
				{optionsNode && <div className="border-b border-primary/10 pb-5">{optionsNode}</div>}

				{/* URL Input */}
				<UrlInput inputType={inputType} onSubmit={onSubmit} isLoading={isLoading} />
			</div>

			{/* Results */}
			{children}
		</div>
	);
}
