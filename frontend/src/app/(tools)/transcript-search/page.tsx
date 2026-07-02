"use client";

import React, { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";

interface TranscriptLine {
	seconds: number;
	timestamp: string;
	text: string;
}

interface TranscriptSearchResult {
	videoId: string;
	title: string;
	language: string;
	lines: TranscriptLine[];
	wordCount: number;
	totalDuration: string;
}

export default function TranscriptSearchPage() {
	const [lang, setLang] = useState("en");
	const [searchQuery, setSearchQuery] = useState("");

	const mutation = useMutation({
		mutationFn: (url: string) =>
			callToolApi<TranscriptSearchResult>("transcript-search", url, { lang }),
	});

	const status = mutation.isPending ? "loading" : mutation.isError ? "error" : mutation.isSuccess ? "success" : "idle";
	let errorMsg = "", errorCode = "";
	if (mutation.isError) {
		try { const p = JSON.parse(mutation.error.message); errorMsg = p.message; errorCode = p.code; }
		catch { errorMsg = mutation.error.message; }
	}

	const optionsNode = (
		<div className="space-y-1.5 w-full max-w-[200px]">
			<label className="text-xs font-bold text-ink-soft uppercase tracking-wider block">Language Code</label>
			<input
				type="text"
				value={lang}
				onChange={(e) => setLang(e.target.value.toLowerCase().trim())}
				placeholder="e.g. en, es, fr"
				className="w-full rounded-xl border border-primary/20 bg-bg px-4 py-2 text-sm text-ink font-mono focus:border-primary-deep focus:outline-none focus:ring-2 focus:ring-primary/20"
			/>
		</div>
	);

	const filteredLines = useMemo(() => {
		if (!mutation.data?.lines) return [];
		if (!searchQuery.trim()) return mutation.data.lines;
		const query = searchQuery.toLowerCase();
		return mutation.data.lines.filter((line) => line.text.toLowerCase().includes(query));
	}, [mutation.data?.lines, searchQuery]);

	// Highlight search matches
	const highlightText = (text: string, highlight: string) => {
		if (!highlight.trim()) return text;
		const parts = text.split(new RegExp(`(${highlight})`, "gi"));
		return (
			<>
				{parts.map((part, i) =>
					part.toLowerCase() === highlight.toLowerCase() ? (
						<mark key={i} className="bg-primary/30 text-primary-deep font-bold rounded-sm px-0.5">
							{part}
						</mark>
					) : (
						part
					)
				)}
			</>
		);
	};

	return (
		<ToolPageLayout
			title="Transcript Search"
			description="Fetch a full video transcript and instantly search it to jump to the exact moment a word or phrase is spoken."
			iconName="Search"
			inputType="video"
			optionsNode={optionsNode}
			onSubmit={(url) => mutation.mutate(url)}
			isLoading={mutation.isPending}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode} slug="transcript-search">
				{mutation.data && (
					<div className="space-y-6">
						{/* Meta Header */}
						<div className="grid grid-cols-3 gap-4">
							<div className="rounded-xl border border-primary/10 bg-bg p-4 space-y-0.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Word Count</span>
								<p className="text-2xl font-display font-extrabold text-primary-deep">{mutation.data.wordCount.toLocaleString()}</p>
							</div>
							<div className="rounded-xl border border-primary/10 bg-bg p-4 space-y-0.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Total Length</span>
								<p className="text-2xl font-display font-extrabold text-primary-deep font-mono">{mutation.data.totalDuration}</p>
							</div>
							<div className="rounded-xl border border-primary/10 bg-bg p-4 space-y-0.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Language</span>
								<p className="text-2xl font-display font-extrabold text-primary-deep uppercase">{mutation.data.language}</p>
							</div>
						</div>

						{/* Search Input */}
						<div className="sticky top-4 z-10 space-y-2 bg-white/95 backdrop-blur py-2">
							<div className="relative">
								<svg xmlns="http://www.w3.org/2000/svg" className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-ink-soft/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
								</svg>
								<input
									type="text"
									placeholder="Search transcript..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="w-full rounded-xl border border-primary/30 bg-bg pl-11 pr-4 py-3 text-sm text-ink focus:border-primary-deep focus:outline-none focus:ring-2 focus:ring-primary/20 shadow-sm transition-all"
								/>
								{searchQuery && (
									<span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-soft bg-primary/10 px-2 py-1 rounded-md">
										{filteredLines.length} match{filteredLines.length !== 1 ? "es" : ""}
									</span>
								)}
							</div>
						</div>

						{/* Transcript Lines */}
						<div className="space-y-1.5 pt-2">
							{filteredLines.length > 0 ? (
								filteredLines.map((line, idx) => (
									<div key={idx} className="flex items-start gap-4 p-2 rounded-lg hover:bg-primary/5 transition-colors group">
										<a
											href={`https://youtu.be/${mutation.data.videoId}?t=${line.seconds}`}
											target="_blank"
											rel="noopener noreferrer"
											className="shrink-0 w-16 text-right font-mono text-xs font-bold text-primary-deep mt-0.5 group-hover:underline"
											title="Watch from this timestamp"
										>
											{line.timestamp}
										</a>
										<p className="text-sm text-ink leading-relaxed flex-1">
											{highlightText(line.text, searchQuery)}
										</p>
									</div>
								))
							) : (
								<div className="text-center py-8 text-ink-soft text-sm">
									No matches found for &quot;<span className="font-semibold text-ink">{searchQuery}</span>&quot;
								</div>
							)}
						</div>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
