"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";

interface VideoSummary {
	title: string;
	duration: string;
	seconds: number;
}

interface DurationResult {
	playlistTitle: string;
	videoCount: number;
	totalSeconds: number;
	formatted: string;
	atSpeed: Record<string, string>;
	avgDuration: string;
	longestVideo: VideoSummary;
	shortestVideo: VideoSummary;
	avgUploadAgeDays?: number;
	csvData: string;
}

const SPEEDS = ["1", "1.25", "1.5", "1.75", "2"];
const SPEED_LABELS: Record<string, string> = {
	"1": "1× (Normal)",
	"1.25": "1.25×",
	"1.5": "1.5×",
	"1.75": "1.75×",
	"2": "2×",
};

export default function PlaylistDurationCalculatorPage() {
	const [showSpeeds, setShowSpeeds] = useState(true);
	const [showStats, setShowStats] = useState(false);
	const [includeUploadStats, setIncludeUploadStats] = useState(false);

	const mutation = useMutation({
		mutationFn: (url: string) =>
			callToolApi<DurationResult>("playlist-duration-calculator", url, {
				includeUploadStats: includeUploadStats ? "true" : "false",
			}),
	});

	const optionsNode = (
		<div className="space-y-3">
			<div className="flex items-center gap-3 select-none">
				<input
					type="checkbox"
					id="showPlaybackSpeeds"
					checked={showSpeeds}
					onChange={(e) => setShowSpeeds(e.target.checked)}
					className="h-4 w-4 rounded border-primary/40 accent-primary-deep"
				/>
				<label htmlFor="showPlaybackSpeeds" className="text-sm font-semibold text-ink-soft cursor-pointer">
					Show playback speed runtimes (1× – 2×)
				</label>
			</div>
			<div className="flex items-center gap-3 select-none">
				<input
					type="checkbox"
					id="showStats"
					checked={showStats}
					onChange={(e) => setShowStats(e.target.checked)}
					className="h-4 w-4 rounded border-primary/40 accent-primary-deep"
				/>
				<label htmlFor="showStats" className="text-sm font-semibold text-ink-soft cursor-pointer">
					Show longest/shortest/average video stats
				</label>
			</div>
			<div className="flex items-center gap-3 select-none">
				<input
					type="checkbox"
					id="uploadStats"
					checked={includeUploadStats}
					onChange={(e) => setIncludeUploadStats(e.target.checked)}
					className="h-4 w-4 rounded border-primary/40 accent-primary-deep"
				/>
				<label htmlFor="uploadStats" className="text-sm font-semibold text-ink-soft cursor-pointer">
					Include average upload age{" "}
					<span className="font-normal text-xs text-ink-soft/60">(slower — fetches full metadata)</span>
				</label>
			</div>
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

	const handleDownloadCsv = () => {
		if (!mutation.data?.csvData) return;
		const blob = new Blob([mutation.data.csvData], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = "playlist-duration.csv";
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<ToolPageLayout
			title="Playlist Duration Calculator"
			description="Calculate total playlist runtime, see speed-adjusted times, and explore per-video statistics."
			iconName="Clock"
			inputType="playlist"
			onSubmit={(url) => mutation.mutate(url)}
			isLoading={mutation.isPending}
			optionsNode={optionsNode}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode}>
				{mutation.data && (
					<div className="space-y-5">
						<div className="space-y-1">
							<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Playlist Title</span>
							<h3 className="font-display text-lg font-bold text-ink leading-tight">
								{mutation.data.playlistTitle}
							</h3>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-xl border border-primary/10 bg-bg p-4 space-y-0.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Videos</span>
								<p className="text-2xl font-display font-extrabold text-primary-deep leading-none">
									{mutation.data.videoCount}
								</p>
							</div>
							<div className="rounded-xl border border-primary/10 bg-bg p-4 space-y-0.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Total Duration</span>
								<p className="text-2xl font-display font-extrabold text-primary-deep leading-none">
									{mutation.data.formatted}
								</p>
							</div>
						</div>

						{showStats && (
							<div className="space-y-3 border-t border-primary/10 pt-4">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Video Statistics</span>
								<div className="grid gap-2 sm:grid-cols-3">
									<div className="rounded-xl border border-primary/10 bg-bg p-3 space-y-0.5">
										<span className="text-[10px] font-bold text-ink-soft/50 uppercase tracking-wider">Average</span>
										<p className="text-base font-bold text-ink">{mutation.data.avgDuration}</p>
									</div>
									<div className="rounded-xl border border-primary/10 bg-bg p-3 space-y-0.5">
										<span className="text-[10px] font-bold text-ink-soft/50 uppercase tracking-wider">Longest</span>
										<p className="text-base font-bold text-ink">{mutation.data.longestVideo?.duration}</p>
										<p className="text-xs text-ink-soft truncate" title={mutation.data.longestVideo?.title}>
											{mutation.data.longestVideo?.title}
										</p>
									</div>
									<div className="rounded-xl border border-primary/10 bg-bg p-3 space-y-0.5">
										<span className="text-[10px] font-bold text-ink-soft/50 uppercase tracking-wider">Shortest</span>
										<p className="text-base font-bold text-ink">{mutation.data.shortestVideo?.duration}</p>
										<p className="text-xs text-ink-soft truncate" title={mutation.data.shortestVideo?.title}>
											{mutation.data.shortestVideo?.title}
										</p>
									</div>
								</div>
								{mutation.data.avgUploadAgeDays !== undefined && (
									<div className="rounded-xl border border-primary/10 bg-bg p-3 space-y-0.5">
										<span className="text-[10px] font-bold text-ink-soft/50 uppercase tracking-wider">Avg Upload Age</span>
										<p className="text-base font-bold text-ink">
											{Math.round(mutation.data.avgUploadAgeDays)} days ago
										</p>
									</div>
								)}
							</div>
						)}

						{showSpeeds && mutation.data.atSpeed && (
							<div className="space-y-2 border-t border-primary/10 pt-4">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">
									Speed-Adjusted Runtimes
								</span>
								<div className="grid gap-2 sm:grid-cols-3">
									{SPEEDS.map((s) => (
										<div
											key={s}
											className="flex justify-between items-center bg-bg p-3 rounded-lg border border-primary/5 text-xs text-ink"
										>
											<span className="font-semibold text-ink-soft select-none">{SPEED_LABELS[s]}</span>
											<span className="font-bold text-primary-deep">{mutation.data.atSpeed[s]}</span>
										</div>
									))}
								</div>
							</div>
						)}

						{/* CSV Export */}
						{mutation.data.csvData && (
							<div className="border-t border-primary/10 pt-4">
								<button
									onClick={handleDownloadCsv}
									className="flex items-center gap-2 rounded-xl border border-primary/25 bg-white hover:bg-primary/5 px-4 py-2.5 text-sm font-bold text-primary-deep transition-all hover:border-primary-deep"
								>
									<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
										<path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0-3-3m3 3 3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
									</svg>
									Export as CSV
								</button>
							</div>
						)}
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
