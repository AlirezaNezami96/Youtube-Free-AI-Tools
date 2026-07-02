"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";

interface ChannelResult {
	channelId: string;
	channelName: string;
	rssUrl: string;
}

export default function ChannelRssFeedGeneratorPage() {
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	const mutation = useMutation({
		mutationFn: (url: string) => callToolApi<ChannelResult>("channel-rss-feed-generator", url),
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
			title="Channel RSS Feed Generator"
			description="Resolve unique channel IDs (UC...) from handles, custom names, or channel URLs — and generate a ready-to-use RSS feed link for any RSS reader or podcast aggregator."
			iconName="Rss"
			inputType="channel"
			onSubmit={(url) => mutation.mutate(url)}
			isLoading={mutation.isPending}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode} slug="channel-rss-feed-generator">
				{mutation.data && (
					<div className="space-y-5">
						<div className="space-y-0.5">
							<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Channel Name</span>
							<h3 className="font-display text-base font-bold text-ink leading-tight">
								{mutation.data.channelName}
							</h3>
						</div>

						{/* Channel ID */}
						<div className="flex flex-col gap-1.5">
							<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Channel ID</span>
							<div className="flex rounded-xl border border-primary/20 bg-bg p-1 shadow-inner items-center">
								<span className="flex-1 px-3 py-2 text-sm font-mono font-bold text-primary-deep select-all overflow-x-auto truncate whitespace-nowrap">
									{mutation.data.channelId}
								</span>
								<button
									onClick={() => handleCopy(mutation.data!.channelId, "id")}
									className="rounded-lg bg-primary hover:bg-primary-deep hover:text-white px-3 py-1.5 text-xs font-bold text-ink transition-all select-none cursor-pointer"
								>
									{copiedKey === "id" ? "Copied!" : "Copy"}
								</button>
							</div>
						</div>

						{/* RSS Feed URL */}
						<div className="flex flex-col gap-1.5">
							<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">RSS Feed URL</span>
							<div className="flex rounded-xl border border-primary/20 bg-bg p-1 shadow-inner items-center">
								<span className="flex-1 px-3 py-2 text-xs font-mono text-ink select-all overflow-x-auto truncate whitespace-nowrap">
									{mutation.data.rssUrl}
								</span>
								<div className="flex gap-1.5">
									<a
										href={mutation.data.rssUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="rounded-lg bg-primary/20 hover:bg-primary-deep hover:text-white px-3 py-1.5 text-xs font-bold text-primary-deep transition-all select-none cursor-pointer"
									>
										Open
									</a>
									<button
										onClick={() => handleCopy(mutation.data!.rssUrl, "rss")}
										className="rounded-lg bg-primary hover:bg-primary-deep hover:text-white px-3 py-1.5 text-xs font-bold text-ink transition-all select-none cursor-pointer"
									>
										{copiedKey === "rss" ? "Copied!" : "Copy"}
									</button>
								</div>
							</div>
						</div>

						{/* Explainer */}
						<div className="rounded-xl border border-primary/10 bg-primary/5 p-4 space-y-2">
							<p className="text-xs font-bold text-ink-soft uppercase tracking-wider">How to use this RSS feed</p>
							<ol className="list-decimal list-inside space-y-1 text-xs text-ink-soft leading-relaxed">
								<li>Copy the RSS Feed URL above.</li>
								<li>Open your RSS reader (Feedly, Inoreader, Apple News, etc.).</li>
								<li>Choose <strong>Add new feed</strong> and paste the URL.</li>
								<li>You'll now receive new video notifications via RSS — no YouTube account required.</li>
							</ol>
						</div>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
