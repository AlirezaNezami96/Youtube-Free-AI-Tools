"use client";

import React from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";

interface URLVariant {
	label: string;
	url: string;
}

interface ShortsResult {
	videoId: string;
	variants: URLVariant[];
}

export default function ShortsUrlConverterPage() {
	const [copiedIdx, setCopiedIdx] = React.useState<number | null>(null);

	const mutation = useMutation({
		mutationFn: (url: string) => callToolApi<ShortsResult>("shorts-url-converter", url),
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

	const handleCopy = (url: string, idx: number) => {
		navigator.clipboard.writeText(url);
		setCopiedIdx(idx);
		setTimeout(() => setCopiedIdx(null), 2000);
	};

	return (
		<ToolPageLayout
			title="Shorts URL Converter"
			description="Convert any YouTube video URL to all four format variants: standard Watch, youtu.be short link, Shorts, and Embed."
			iconName="ArrowLeftRight"
			inputType="video"
			onSubmit={(url) => mutation.mutate(url)}
			isLoading={mutation.isPending}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode}>
				{mutation.data && (
					<div className="space-y-3">
						<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">
							Video ID: {mutation.data.videoId}
						</span>
						{mutation.data.variants.map((v, idx) => (
							<div key={idx} className="flex flex-col gap-1.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">{v.label}</span>
								<div className="flex rounded-xl border border-primary/20 bg-bg p-1 shadow-inner items-center">
									<span className="flex-1 px-3 py-2 text-xs font-mono text-ink select-all truncate whitespace-nowrap overflow-x-auto">
										{v.url}
									</span>
									<button
										onClick={() => handleCopy(v.url, idx)}
										className="rounded-lg bg-primary hover:bg-primary-deep hover:text-white px-3 py-1.5 text-xs font-bold text-ink transition-all select-none"
									>
										{copiedIdx === idx ? "Copied!" : "Copy"}
									</button>
								</div>
							</div>
						))}
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
