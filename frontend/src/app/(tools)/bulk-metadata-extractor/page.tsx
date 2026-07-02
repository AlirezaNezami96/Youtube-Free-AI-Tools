"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApiWithUrls } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";
import BulkUrlInput from "@/components/tools/bulk-url-input";

interface VideoMeta {
	index: number;
	videoId: string;
	title: string;
	channel: string;
	uploadDate: string;
	duration: number;
	durationFmt: string;
	viewCount: number;
	likeCount: number;
	url: string;
	error?: string;
}

interface MetaResult {
	videos: VideoMeta[];
	count: number;
}

type SortKey = "index" | "title" | "channel" | "uploadDate" | "duration" | "viewCount" | "likeCount";

function formatNumber(n: number): string {
	return n?.toLocaleString() ?? "—";
}

export default function BulkMetadataExtractorPage() {
	const [sortKey, setSortKey] = useState<SortKey>("index");
	const [sortAsc, setSortAsc] = useState(true);

	const mutation = useMutation({
		mutationFn: (urls: string[]) => callToolApiWithUrls<MetaResult>("bulk-metadata-extractor", urls),
	});

	const status = mutation.isPending ? "loading" : mutation.isError ? "error" : mutation.isSuccess ? "success" : "idle";
	let errorMsg = "";
	let errorCode = "";
	if (mutation.isError) {
		try {
			const p = JSON.parse(mutation.error.message);
			errorMsg = p.message;
			errorCode = p.code;
		} catch {
			errorMsg = mutation.error.message;
		}
	}

	const handleSort = (key: SortKey) => {
		if (sortKey === key) setSortAsc((a) => !a);
		else { setSortKey(key); setSortAsc(true); }
	};

	const sorted = mutation.data?.videos
		? [...mutation.data.videos].sort((a, b) => {
				let va: any = a[sortKey];
				let vb: any = b[sortKey];
				if (typeof va === "string") va = va.toLowerCase();
				if (typeof vb === "string") vb = vb.toLowerCase();
				if (va < vb) return sortAsc ? -1 : 1;
				if (va > vb) return sortAsc ? 1 : -1;
				return 0;
			})
		: [];

	const handleDownloadCsv = () => {
		if (!sorted.length) return;
		const header = "Index,Title,Channel,Upload Date,Duration (s),Duration,Views,Likes,Video ID,URL\n";
		const rows = sorted.map((v) =>
			`${v.index},"${v.title?.replace(/"/g, '""') ?? ""}","${v.channel?.replace(/"/g, '""') ?? ""}",${v.uploadDate ?? ""},${v.duration},${v.durationFmt},${v.viewCount},${v.likeCount},${v.videoId},${v.url}`
		).join("\n");
		const blob = new Blob([header + rows], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a"); a.href = url; a.download = "bulk-metadata.csv"; a.click();
		URL.revokeObjectURL(url);
	};

	const handleDownloadJson = () => {
		if (!sorted.length) return;
		const payload = sorted.map(v => ({
			index: v.index,
			title: v.title,
			channel: v.channel,
			uploadDate: v.uploadDate,
			durationSeconds: v.duration,
			durationFormatted: v.durationFmt,
			viewCount: v.viewCount,
			likeCount: v.likeCount,
			videoId: v.videoId,
			url: v.url,
			error: v.error
		}));
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a"); a.href = url; a.download = "bulk-metadata.json"; a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<ToolPageLayout
			title="Bulk Metadata Extractor"
			description="Fetch metadata for up to 25 videos at once. Sort by any field and export as CSV or JSON."
			iconName="Table"
			inputNode={<BulkUrlInput onSubmit={(urls) => mutation.mutate(urls)} isLoading={mutation.isPending} />}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode} slug="bulk-metadata-extractor">
				{sorted.length > 0 && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-sm font-bold text-ink">{sorted.length} video{sorted.length !== 1 ? "s" : ""}</span>
							<div className="flex gap-2">
								<button
									onClick={handleDownloadCsv}
									className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-white hover:bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary-deep transition-all hover:border-primary-deep"
								>
									Export CSV
								</button>
								<button
									onClick={handleDownloadJson}
									className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-white hover:bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary-deep transition-all hover:border-primary-deep"
								>
									Export JSON
								</button>
							</div>
						</div>
						<div className="overflow-x-auto rounded-xl border border-primary/15">
							<table className="w-full text-xs text-ink">
								<thead className="bg-primary/10 text-ink-soft font-bold uppercase tracking-wider">
									<tr>
										<th className="px-3 py-2 text-left">
											<button onClick={() => handleSort("index")} className="flex items-center gap-1 hover:text-primary-deep transition-colors">
												#
												{sortKey === "index" ? (sortAsc ? " ↑" : " ↓") : ""}
											</button>
										</th>
										<th className="px-3 py-2 text-left w-64">
											<button onClick={() => handleSort("title")} className="flex items-center gap-1 hover:text-primary-deep transition-colors">
												Title
												{sortKey === "title" ? (sortAsc ? " ↑" : " ↓") : ""}
											</button>
										</th>
										<th className="px-3 py-2 text-left w-40">
											<button onClick={() => handleSort("channel")} className="flex items-center gap-1 hover:text-primary-deep transition-colors">
												Channel
												{sortKey === "channel" ? (sortAsc ? " ↑" : " ↓") : ""}
											</button>
										</th>
										<th className="px-3 py-2 text-right">
											<button onClick={() => handleSort("uploadDate")} className="flex items-center gap-1 hover:text-primary-deep transition-colors">
												Published
												{sortKey === "uploadDate" ? (sortAsc ? " ↑" : " ↓") : ""}
											</button>
										</th>
										<th className="px-3 py-2 text-right">
											<button onClick={() => handleSort("duration")} className="flex items-center gap-1 hover:text-primary-deep transition-colors">
												Duration
												{sortKey === "duration" ? (sortAsc ? " ↑" : " ↓") : ""}
											</button>
										</th>
										<th className="px-3 py-2 text-right">
											<button onClick={() => handleSort("viewCount")} className="flex items-center gap-1 hover:text-primary-deep transition-colors">
												Views
												{sortKey === "viewCount" ? (sortAsc ? " ↑" : " ↓") : ""}
											</button>
										</th>
										<th className="px-3 py-2 text-right">
											<button onClick={() => handleSort("likeCount")} className="flex items-center gap-1 hover:text-primary-deep transition-colors">
												Likes
												{sortKey === "likeCount" ? (sortAsc ? " ↑" : " ↓") : ""}
											</button>
										</th>
									</tr>
								</thead>
								<tbody className="divide-y divide-primary/10">
									{sorted.map((v) => (
										<tr key={v.videoId || v.index} className={v.error ? "bg-red-50/60" : "hover:bg-primary/5"}>
											<td className="px-3 py-2 font-mono text-ink-soft">{v.index}</td>
											<td className="px-3 py-2 max-w-[180px]">
												{v.error ? (
													<span className="text-red-600 font-semibold">{v.error}</span>
												) : (
													<a href={v.url} target="_blank" rel="noopener noreferrer" className="hover:text-primary-deep underline truncate block" title={v.title}>
														{v.title}
													</a>
												)}
											</td>
											<td className="px-3 py-2 text-ink-soft truncate max-w-[120px]">{v.channel}</td>
											<td className="px-3 py-2 text-right font-mono">{v.uploadDate}</td>
											<td className="px-3 py-2 text-right font-mono">{v.durationFmt}</td>
											<td className="px-3 py-2 text-right font-mono">{formatNumber(v.viewCount)}</td>
											<td className="px-3 py-2 text-right font-mono">{formatNumber(v.likeCount)}</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
