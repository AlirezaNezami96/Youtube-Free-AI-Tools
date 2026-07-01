"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";

interface ThumbnailResult {
	videoId: string;
	requestedResolution: string;
	deliveredResolution: string;
	previewUrl: string;
	downloadUrl: string;
}

export default function ThumbnailDownloaderPage() {
	const [resolution, setResolution] = useState("max");

	const mutation = useMutation({
		mutationFn: (url: string) =>
			callToolApi<ThumbnailResult>("thumbnail-downloader", url, { resolution }),
	});

	const optionsNode = (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
			<label className="text-sm font-semibold text-ink-soft select-none">
				Target Resolution
			</label>
			<select
				value={resolution}
				onChange={(e) => setResolution(e.target.value)}
				className="rounded-lg border border-primary/40 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary-deep"
			>
				<option value="max">Max (1280×720)</option>
				<option value="high">High (480×360)</option>
				<option value="medium">Medium (320×180)</option>
				<option value="standard">Standard (120×90)</option>
			</select>
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

	const handleDownload = (downloadUrl: string) => {
		const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
		window.location.href = `${API_BASE}${downloadUrl}`;
	};

	return (
		<ToolPageLayout
			slug="thumbnail-downloader"
			title="Thumbnail Downloader"
			description="Grab high-quality YouTube video thumbnails at multiple resolutions with custom fallbacks."
			iconName="Image"
			inputType="video"
			onSubmit={(url) => mutation.mutate(url)}
			isLoading={mutation.isPending}
			optionsNode={optionsNode}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode}>
				{mutation.data && (
					<div className="space-y-5">
						<div className="overflow-hidden rounded-xl border border-primary/20 bg-bg shadow-inner">
							<img
								src={mutation.data.previewUrl}
								alt="Video Thumbnail Preview"
								className="w-full h-auto object-cover max-h-[360px]"
							/>
						</div>
						<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-center sm:text-left">
							<div className="space-y-0.5">
								<p className="text-xs text-ink-soft">
									Requested Resolution: <span className="font-semibold">{mutation.data.requestedResolution}</span>
								</p>
								<p className="text-xs text-ink-soft">
									Delivered Resolution: <span className="font-semibold text-primary-deep">{mutation.data.deliveredResolution}</span>
								</p>
							</div>
							<button
								onClick={() => handleDownload(mutation.data.downloadUrl)}
								className="w-full sm:w-auto font-display font-bold text-sm text-ink bg-primary hover:bg-primary-deep hover:text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-sm cursor-pointer whitespace-nowrap active:scale-[0.98]"
							>
								Download Image
							</button>
						</div>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
