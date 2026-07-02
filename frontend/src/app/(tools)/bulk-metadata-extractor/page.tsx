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

	const SortBtn = ({ k, label }: { k: SortKey; label: string }) => (
		<button onClick={() => handleSort(k)} className="flex items-center gap-1 hover:text-primary-deep transition-colors">
			{label}
			{sortKey === k ? (sortAsc ? " ↑" : " ↓") : ""}
		</button>
	);

	return (
		<ToolPageLayout
			title="Bulk Metadata Extractor"
			description="Fetch metadata for up to 25 videos at once. Sort by any field and export as CSV."
			iconName="Table"
			inputNode={<BulkUrlInput onSubmit={(urls) => mutation.mutate(urls)} isLoading={mutation.isPending} />}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode}>
				{sorted.length > 0 && (
					<div className="space-y-4">
						<div className="flex items-center justify-between">
							<span className="text-sm font-bold text-ink">{sorted.length} video{sorted.length !== 1 ? "s" : ""}</span>
							<button
								onClick={handleDownloadCsv}
								className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-white hover:bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary-deep transition-all hover:border-primary-deep"
							>
								Export CSV
							</button>
						</div>
						<div className="overflow-x-auto rounded-xl border border-primary/15">
							<table className="w-full text-xs text-ink">
								<thead className="bg-primary/10 text-ink-soft font-bold uppercase tracking-wider">
									<tr>
										<th className="px-3 py-2 text-left"><SortBtn k="index" label="#" /></th>
										<th className="px-3 py-2 text-left"><SortBtn k="title" label="Title" /></th>
										<th className="px-3 py-2 text-left"><SortBtn k="channel" label="Channel" /></th>
										<th className="px-3 py-2 text-right"><SortBtn k="uploadDate" label="Date" /></th>
										<th className="px-3 py-2 text-right"><SortBtn k="duration" label="Duration" /></th>
										<th className="px-3 py-2 text-right"><SortBtn k="viewCount" label="Views" /></th>
										<th className="px-3 py-2 text-right"><SortBtn k="likeCount" label="Likes" /></th>
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
