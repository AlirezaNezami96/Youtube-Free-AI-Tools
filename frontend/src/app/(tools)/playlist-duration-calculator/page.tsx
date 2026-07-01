"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";

interface DurationResult {
	playlistTitle: string;
	videoCount: number;
	totalSeconds: number;
	formatted: string;
	atSpeed: Record<string, string>;
}

export default function PlaylistDurationCalculatorPage() {
	const [showSpeeds, setShowSpeeds] = useState(true);

	const mutation = useMutation({
		mutationFn: (url: string) =>
			callToolApi<DurationResult>("playlist-duration-calculator", url),
	});

	const optionsNode = (
		<div className="flex items-center gap-3 select-none">
			<input
				type="checkbox"
				id="showPlaybackSpeeds"
				checked={showSpeeds}
				onChange={(e) => setShowSpeeds(e.target.checked)}
				className="h-4.5 w-4.5 rounded border-primary/40 text-primary-deep focus:ring-primary/20 accent-primary-deep"
			/>
			<label htmlFor="showPlaybackSpeeds" className="text-sm font-semibold text-ink-soft cursor-pointer">
				Show Speeds adjusted runtimes (1.25x, 1.5x, 2x)
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

	return (
		<ToolPageLayout
			slug="playlist-duration-calculator"
			title="Playlist Duration Calculator"
			description="Calculate the total duration of a YouTube playlist and analyze it at different speed multipliers."
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
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Videos Count</span>
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

						{showSpeeds && mutation.data.atSpeed && (
							<div className="space-y-2 border-t border-primary/10 pt-4">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Speed-Adjusted Runtimes</span>
								<div className="grid gap-2 sm:grid-cols-3">
									<div className="flex justify-between items-center bg-bg p-3 rounded-lg border border-primary/5 text-xs text-ink">
										<span className="font-semibold text-ink-soft select-none">At 1.25x</span>
										<span className="font-bold text-primary-deep">{mutation.data.atSpeed["1.25"]}</span>
									</div>
									<div className="flex justify-between items-center bg-bg p-3 rounded-lg border border-primary/5 text-xs text-ink">
										<span className="font-semibold text-ink-soft select-none">At 1.5x</span>
										<span className="font-bold text-primary-deep">{mutation.data.atSpeed["1.5"]}</span>
									</div>
									<div className="flex justify-between items-center bg-bg p-3 rounded-lg border border-primary/5 text-xs text-ink">
										<span className="font-semibold text-ink-soft select-none">At 2.0x</span>
										<span className="font-bold text-primary-deep">{mutation.data.atSpeed["2"]}</span>
									</div>
								</div>
							</div>
						)}
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
