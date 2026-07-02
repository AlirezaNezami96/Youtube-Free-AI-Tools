"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApiWithUrls } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";
import BulkUrlInput from "@/components/tools/bulk-url-input";

interface VideoEntry {
	index: number;
	videoId: string;
	title: string;
	seconds: number;
	durationFmt: string;
	error?: string;
}

interface DurationResult {
	videos: VideoEntry[];
	totalSeconds: number;
	totalFmt: string;
	atSpeed: Record<string, string>;
	count: number;
}

const SPEEDS = ["1", "1.25", "1.5", "1.75", "2"];
const SPEED_LABELS: Record<string, string> = {
	"1": "1× (Normal)", "1.25": "1.25×", "1.5": "1.5×", "1.75": "1.75×", "2": "2×",
};

export default function VideoDurationCalculatorPage() {
	const [showSpeeds, setShowSpeeds] = useState(true);

	const mutation = useMutation({
		mutationFn: (urls: string[]) => callToolApiWithUrls<DurationResult>("video-duration-calculator", urls),
	});

	const status = mutation.isPending ? "loading" : mutation.isError ? "error" : mutation.isSuccess ? "success" : "idle";
	let errorMsg = "", errorCode = "";
	if (mutation.isError) {
		try { const p = JSON.parse(mutation.error.message); errorMsg = p.message; errorCode = p.code; }
		catch { errorMsg = mutation.error.message; }
	}

	const optionsNode = (
		<div className="flex items-center gap-3 select-none">
			<input type="checkbox" id="showSpeeds" checked={showSpeeds}
				onChange={(e) => setShowSpeeds(e.target.checked)}
				className="h-4 w-4 rounded border-primary/40 accent-primary-deep"
			/>
			<label htmlFor="showSpeeds" className="text-sm font-semibold text-ink-soft cursor-pointer">
				Show playback speed totals (1× – 2×)
			</label>
		</div>
	);

	return (
		<ToolPageLayout
			title="Video Duration Calculator"
			description="Calculate the total watch time for up to 25 videos at once with speed-adjusted runtimes."
			iconName="Timer"
			optionsNode={optionsNode}
			inputNode={<BulkUrlInput onSubmit={(urls) => mutation.mutate(urls)} isLoading={mutation.isPending} />}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode}>
				{mutation.data && (
					<div className="space-y-5">
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-xl border border-primary/10 bg-bg p-4 space-y-0.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Videos</span>
								<p className="text-2xl font-display font-extrabold text-primary-deep">{mutation.data.count}</p>
							</div>
							<div className="rounded-xl border border-primary/10 bg-bg p-4 space-y-0.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Total Duration</span>
								<p className="text-2xl font-display font-extrabold text-primary-deep">{mutation.data.totalFmt}</p>
							</div>
						</div>

						{showSpeeds && mutation.data.atSpeed && (
							<div className="space-y-2 border-t border-primary/10 pt-4">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Speed-Adjusted Totals</span>
								<div className="grid gap-2 sm:grid-cols-3">
									{SPEEDS.map((s) => (
										<div key={s} className="flex justify-between items-center bg-bg p-3 rounded-lg border border-primary/5 text-xs">
											<span className="font-semibold text-ink-soft">{SPEED_LABELS[s]}</span>
											<span className="font-bold text-primary-deep">{mutation.data.atSpeed[s]}</span>
										</div>
									))}
								</div>
							</div>
						)}

						<div className="space-y-2 border-t border-primary/10 pt-4">
							<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Per-Video Breakdown</span>
							<div className="space-y-1">
								{mutation.data.videos.map((v) => (
									<div key={v.index} className={`flex items-center justify-between py-2 px-3 rounded-lg text-xs ${v.error ? "bg-red-50/60 text-red-600" : "bg-bg hover:bg-primary/5"}`}>
										<span className={`truncate flex-1 ${v.error ? "text-red-600" : "text-ink"}`}>
											{v.error ? `#${v.index} — ${v.error}` : v.title || `Video #${v.index}`}
										</span>
										{!v.error && <span className="font-mono font-bold text-primary-deep ml-3 shrink-0">{v.durationFmt}</span>}
									</div>
								))}
							</div>
						</div>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
