"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";

interface MetadataResult {
	title: string;
	channel: string;
	uploadDate: string;
	viewCount: number;
	likeCount: number;
	duration: number;
	description: string;
	tags: string[];
	thumbnail: string;
	rawJson?: string;
}

export default function VideoMetadataViewerPage() {
	const [showRaw, setShowRaw] = useState(false);
	const [expandedDesc, setExpandedDesc] = useState(false);

	const mutation = useMutation({
		mutationFn: (url: string) =>
			callToolApi<MetadataResult>("video-metadata-viewer", url, {
				raw: showRaw ? "true" : "false",
			}),
	});

	const optionsNode = (
		<div className="flex items-center gap-3 select-none">
			<input
				type="checkbox"
				id="showRawJson"
				checked={showRaw}
				onChange={(e) => setShowRaw(e.target.checked)}
				className="h-4.5 w-4.5 rounded border-primary/40 text-primary-deep focus:ring-primary/20 accent-primary-deep"
			/>
			<label htmlFor="showRawJson" className="text-sm font-semibold text-ink-soft cursor-pointer">
				Include Raw JSON Dump
			</label>
		</div>
	);

	const status = mutation.isPending
		? "loading"
		: mutation.isError
		? "error"
		: mutation.isSuccess
		? "success"
		: "idle";

	let errorMsg = "";
	let errorCode = "";
	if (mutation.isError) {
		try {
			const parsed = JSON.parse(mutation.error.message);
			errorMsg = parsed.message;
			errorCode = parsed.code;
		} catch {
			errorMsg = mutation.error.message;
		}
	}

	const formatNumber = (num: number) => {
		if (!num) return "N/A";
		return new Intl.NumberFormat().format(num);
	};

	const formatDuration = (totalSecs: number) => {
		if (!totalSecs) return "0s";
		const hrs = Math.floor(totalSecs / 3600);
		const mins = Math.floor((totalSecs % 3600) / 60);
		const secs = Math.floor(totalSecs % 60);

		if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
		if (mins > 0) return `${mins}m ${secs}s`;
		return `${secs}s`;
	};

	return (
		<ToolPageLayout
			title="Video Metadata Viewer"
			description="Inspect detailed metadata, metadata tags, and get raw JSON payloads for any YouTube video."
			iconName="Info"
			inputType="video"
			onSubmit={(url) => mutation.mutate(url)}
			isLoading={mutation.isPending}
			optionsNode={optionsNode}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode} slug="video-metadata-viewer">
				{mutation.data && (
					<div className="space-y-6">
						{/* Main Info Block */}
						<div className="flex flex-col gap-6 md:flex-row md:items-start">
							{/* Thumbnail Card */}
							<div className="w-full md:w-2/5 shrink-0 rounded-xl overflow-hidden border border-primary/25 bg-bg">
								<img
									src={mutation.data.thumbnail}
									alt={mutation.data.title}
									className="w-full h-auto object-cover"
								/>
							</div>

							{/* Metadata Text Grid */}
							<div className="flex-1 space-y-4">
								<h3 className="font-display text-lg font-bold text-ink leading-tight">
									{mutation.data.title}
								</h3>
								<div className="grid grid-cols-2 gap-x-4 gap-y-3">
									<div className="space-y-0.5">
										<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Channel</span>
										<p className="text-sm font-semibold text-ink leading-relaxed">{mutation.data.channel}</p>
									</div>
									<div className="space-y-0.5">
										<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Upload Date</span>
										<p className="text-sm font-semibold text-ink leading-relaxed">{mutation.data.uploadDate}</p>
									</div>
									<div className="space-y-0.5">
										<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Views</span>
										<p className="text-sm font-semibold text-ink leading-relaxed">{formatNumber(mutation.data.viewCount)}</p>
									</div>
									<div className="space-y-0.5">
										<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Likes</span>
										<p className="text-sm font-semibold text-ink leading-relaxed">{formatNumber(mutation.data.likeCount)}</p>
									</div>
									<div className="col-span-2 space-y-0.5">
										<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Duration</span>
										<p className="text-sm font-semibold text-ink leading-relaxed">{formatDuration(mutation.data.duration)}</p>
									</div>
								</div>
							</div>
						</div>

						{/* Tags */}
						{mutation.data.tags && mutation.data.tags.length > 0 && (
							<div className="space-y-1.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Tags</span>
								<div className="flex flex-wrap gap-1.5">
									{mutation.data.tags.map((tag, idx) => (
										<span
											key={idx}
											className="inline-block rounded bg-primary/20 px-2 py-0.5 text-xs font-semibold text-primary-deep"
										>
											{tag}
										</span>
									))}
								</div>
							</div>
						)}

						{/* Description */}
						{mutation.data.description && (
							<div className="space-y-1.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Description</span>
								<div className="relative rounded-xl border border-primary/10 bg-bg p-4">
									<p className={`text-xs text-ink leading-relaxed whitespace-pre-wrap ${expandedDesc ? "" : "line-clamp-4 overflow-hidden"}`}>
										{mutation.data.description}
									</p>
									<button
										onClick={() => setExpandedDesc(!expandedDesc)}
										className="mt-2 text-xs font-bold text-primary-deep hover:underline cursor-pointer"
									>
										{expandedDesc ? "Show Less" : "Show More"}
									</button>
								</div>
							</div>
						)}

						{/* Raw JSON */}
						{showRaw && mutation.data.rawJson && (
							<div className="space-y-1.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Raw JSON Dump</span>
								<pre className="rounded-xl border border-primary/10 bg-bg p-4 overflow-x-auto max-h-[300px] font-mono text-[10px] text-ink select-text leading-relaxed">
									{JSON.stringify(JSON.parse(mutation.data.rawJson), null, 2)}
								</pre>
							</div>
						)}
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
