"use client";

import React from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApiWithUrls } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";
import BulkUrlInput from "@/components/tools/bulk-url-input";

interface ThumbnailResult {
	index: number;
	videoId: string;
	previewUrl: string;
	downloadUrl: string;
	resolution: string;
	error?: string;
}

interface BulkThumbnailResult {
	thumbnails: ThumbnailResult[];
	zipUrl: string;
	count: number;
}

export default function BulkThumbnailDownloaderPage() {
	const mutation = useMutation({
		mutationFn: (urls: string[]) => callToolApiWithUrls<BulkThumbnailResult>("bulk-thumbnail-downloader", urls, { resolution: "max" }),
	});

	const status = mutation.isPending ? "loading" : mutation.isError ? "error" : mutation.isSuccess ? "success" : "idle";
	let errorMsg = "", errorCode = "";
	if (mutation.isError) {
		try { const p = JSON.parse(mutation.error.message); errorMsg = p.message; errorCode = p.code; }
		catch { errorMsg = mutation.error.message; }
	}

	const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

	return (
		<ToolPageLayout
			title="Bulk Thumbnail Downloader"
			description="Download thumbnails for up to 25 videos at once. Preview the grid and download all as a zip."
			iconName="Images"
			inputNode={<BulkUrlInput onSubmit={(urls) => mutation.mutate(urls)} isLoading={mutation.isPending} />}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode} slug="bulk-thumbnail-downloader">
				{mutation.data && (
					<div className="space-y-5">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
							<span className="text-sm font-bold text-ink shrink-0">
								{mutation.data.count} thumbnail{mutation.data.count !== 1 ? "s" : ""}
							</span>
							<div className="flex flex-wrap items-center gap-2">
								<button
									onClick={() => {
										const urls = mutation.data.thumbnails.filter(t => !t.error).map(t => `${API_BASE}${t.downloadUrl}`).join("\n");
										navigator.clipboard.writeText(urls);
										alert("Copied to clipboard!");
									}}
									className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-white hover:bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary-deep transition-all"
								>
									Copy all URLs
								</button>
								<button
									onClick={() => {
										const urls = mutation.data.thumbnails.filter(t => !t.error).map(t => `${API_BASE}${t.downloadUrl}`).join("\n");
										const blob = new Blob([urls], { type: "text/plain" });
										const url = URL.createObjectURL(blob);
										const a = document.createElement("a"); a.href = url; a.download = "thumbnail-links.txt"; a.click();
										URL.revokeObjectURL(url);
									}}
									className="flex items-center gap-1.5 rounded-lg border border-primary/25 bg-white hover:bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary-deep transition-all"
								>
									Export Links
								</button>
								{mutation.data.zipUrl && (
									<a
										href={`${API_BASE}${mutation.data.zipUrl}`}
										download="thumbnails.zip"
										className="flex items-center gap-2 rounded-xl border border-primary/25 bg-primary-deep px-4 py-2 text-xs font-bold text-white hover:opacity-90 transition-all"
									>
										<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
											<path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
										</svg>
										Download ZIP
									</a>
								)}
							</div>
						</div>

						<div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
							{mutation.data.thumbnails.map((t) => (
								<div key={t.index} className={`rounded-xl border overflow-hidden ${t.error ? "border-red-200 bg-red-50/40" : "border-primary/15 bg-bg"}`}>
									{t.error ? (
										<div className="p-3 text-xs text-red-600 font-semibold">#{t.index} — {t.error}</div>
									) : (
										<>
											{/* eslint-disable-next-line @next/next/no-img-element */}
											<img
												src={t.previewUrl}
												alt={`Thumbnail ${t.index}`}
												className="w-full aspect-video object-cover"
												loading="lazy"
											/>
											<div className="p-2 flex items-center justify-between gap-2">
												<span className="text-[10px] text-ink-soft font-mono truncate">{t.resolution}</span>
												<a
													href={`${API_BASE}${t.downloadUrl}`}
													download
													className="rounded-lg bg-primary-deep px-2 py-1 text-[10px] font-bold text-white hover:opacity-90 transition-all shrink-0"
												>
													↓
												</a>
											</div>
										</>
									)}
								</div>
							))}
						</div>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
