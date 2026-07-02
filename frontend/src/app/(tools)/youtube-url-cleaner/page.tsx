"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";

interface CleanerResult {
	originalUrl: string;
	cleanedUrl: string;
	shortUrl: string;
	videoId: string;
}

export default function YoutubeUrlCleanerPage() {
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	const mutation = useMutation({
		mutationFn: (url: string) => callToolApi<CleanerResult>("youtube-url-cleaner", url),
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
			title="YouTube URL Cleaner"
			description="Strips unnecessary tracking codes, sharing arguments, and referrals from YouTube URLs."
			iconName="Sparkles"
			inputType="video"
			onSubmit={(url) => mutation.mutate(url)}
			isLoading={mutation.isPending}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode} slug="youtube-url-cleaner">
				{mutation.data && (
					<div className="space-y-4">
						{/* Cleaned Standard URL */}
						<div className="flex flex-col gap-1.5">
							<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Cleaned Watch URL</span>
							<div className="flex rounded-xl border border-primary/20 bg-bg p-1 shadow-inner items-center">
								<span className="flex-1 px-3 py-2 text-xs font-mono text-ink select-all overflow-x-auto truncate whitespace-nowrap">
									{mutation.data.cleanedUrl}
								</span>
								<button
									onClick={() => handleCopy(mutation.data!.cleanedUrl, "clean")}
									className="rounded-lg bg-primary hover:bg-primary-deep hover:text-white px-3 py-1.5 text-xs font-bold text-ink transition-all select-none cursor-pointer"
								>
									{copiedKey === "clean" ? "Copied!" : "Copy"}
								</button>
							</div>
						</div>

						{/* Cleaned Short URL */}
						<div className="flex flex-col gap-1.5">
							<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Cleaned Short URL</span>
							<div className="flex rounded-xl border border-primary/20 bg-bg p-1 shadow-inner items-center">
								<span className="flex-1 px-3 py-2 text-xs font-mono text-ink select-all overflow-x-auto truncate whitespace-nowrap">
									{mutation.data.shortUrl}
								</span>
								<button
									onClick={() => handleCopy(mutation.data!.shortUrl, "short")}
									className="rounded-lg bg-primary hover:bg-primary-deep hover:text-white px-3 py-1.5 text-xs font-bold text-ink transition-all select-none cursor-pointer"
								>
									{copiedKey === "short" ? "Copied!" : "Copy"}
								</button>
							</div>
						</div>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
