"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";

interface ExtractorResult {
	videoId?: string;
	playlistId?: string;
	channelValue?: string;
	channelType?: string;
}

export default function YoutubeIdExtractorPage() {
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	const mutation = useMutation({
		mutationFn: (url: string) => callToolApi<ExtractorResult>("youtube-id-extractor", url),
	});

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

	const handleCopy = (text: string, key: string) => {
		navigator.clipboard.writeText(text);
		setCopiedKey(key);
		setTimeout(() => setCopiedKey(null), 2000);
	};

	return (
		<ToolPageLayout
			title="YouTube ID Extractor"
			description="Extracts raw video IDs, playlist IDs, channel IDs, or handles from any YouTube input URL."
			iconName="Hash"
			inputType="video"
			onSubmit={(url) => mutation.mutate(url)}
			isLoading={mutation.isPending}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode}>
				{mutation.data && (
					<div className="space-y-4">
						{/* Video ID */}
						{mutation.data.videoId && (
							<div className="flex flex-col gap-1.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Video ID</span>
								<div className="flex rounded-xl border border-primary/20 bg-bg p-1 shadow-inner items-center">
									<span className="flex-1 px-3 py-2 text-sm font-mono font-bold text-primary-deep select-all overflow-x-auto truncate whitespace-nowrap">
										{mutation.data.videoId}
									</span>
									<button
										onClick={() => handleCopy(mutation.data!.videoId!, "video")}
										className="rounded-lg bg-primary hover:bg-primary-deep hover:text-white px-3 py-1.5 text-xs font-bold text-ink transition-all select-none cursor-pointer"
									>
										{copiedKey === "video" ? "Copied!" : "Copy"}
									</button>
								</div>
							</div>
						)}

						{/* Playlist ID */}
						{mutation.data.playlistId && (
							<div className="flex flex-col gap-1.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Playlist ID</span>
								<div className="flex rounded-xl border border-primary/20 bg-bg p-1 shadow-inner items-center">
									<span className="flex-1 px-3 py-2 text-sm font-mono font-bold text-primary-deep select-all overflow-x-auto truncate whitespace-nowrap">
										{mutation.data.playlistId}
									</span>
									<button
										onClick={() => handleCopy(mutation.data!.playlistId!, "playlist")}
										className="rounded-lg bg-primary hover:bg-primary-deep hover:text-white px-3 py-1.5 text-xs font-bold text-ink transition-all select-none cursor-pointer"
									>
										{copiedKey === "playlist" ? "Copied!" : "Copy"}
									</button>
								</div>
							</div>
						)}

						{/* Channel Identifier */}
						{mutation.data.channelValue && (
							<div className="flex flex-col gap-1.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">
									Channel {mutation.data.channelType === "handle" ? "Handle" : mutation.data.channelType === "id" ? "ID" : "Username"}
								</span>
								<div className="flex rounded-xl border border-primary/20 bg-bg p-1 shadow-inner items-center">
									<span className="flex-1 px-3 py-2 text-sm font-mono font-bold text-primary-deep select-all overflow-x-auto truncate whitespace-nowrap">
										{mutation.data.channelValue}
									</span>
									<button
										onClick={() => handleCopy(mutation.data!.channelValue!, "channel")}
										className="rounded-lg bg-primary hover:bg-primary-deep hover:text-white px-3 py-1.5 text-xs font-bold text-ink transition-all select-none cursor-pointer"
									>
										{copiedKey === "channel" ? "Copied!" : "Copy"}
									</button>
								</div>
							</div>
						)}
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
