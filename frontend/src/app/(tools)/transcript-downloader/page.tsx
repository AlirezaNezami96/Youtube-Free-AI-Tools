"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";

interface DownloaderResult {
	title: string;
	language: string;
	format: string;
	downloadUrl: string;
}

export default function TranscriptDownloaderPage() {
	const [lang, setLang] = useState("en");
	const [format, setFormat] = useState("srt");

	const mutation = useMutation({
		mutationFn: (url: string) =>
			callToolApi<DownloaderResult>("transcript-downloader", url, { lang, format }),
	});

	const optionsNode = (
		<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
			<div className="flex flex-col gap-1.5 flex-1">
				<label className="text-xs font-semibold text-ink-soft select-none">
					Transcript Language
				</label>
				<select
					value={lang}
					onChange={(e) => setLang(e.target.value)}
					className="rounded-lg border border-primary/40 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary-deep"
				>
					<option value="en">English (Default)</option>
					<option value="es">Spanish (Español)</option>
					<option value="fr">French (Français)</option>
					<option value="de">German (Deutsch)</option>
					<option value="tr">Turkish (Türkçe)</option>
					<option value="ar">Arabic (العربية)</option>
					<option value="fa">Persian (فارسی)</option>
				</select>
			</div>

			<div className="flex flex-col gap-1.5 flex-1">
				<label className="text-xs font-semibold text-ink-soft select-none">
					Subtitle Format
				</label>
				<select
					value={format}
					onChange={(e) => setFormat(e.target.value)}
					className="rounded-lg border border-primary/40 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary-deep"
				>
					<option value="srt">SRT (SubRip)</option>
					<option value="vtt">VTT (WebVTT)</option>
				</select>
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

	const handleDownload = (downloadUrl: string) => {
		const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
		window.location.href = `${API_BASE}${downloadUrl}`;
	};

	return (
		<ToolPageLayout
			title="Transcript Downloader"
			description="Download video transcripts as structured SRT or VTT files with timestamps."
			iconName="Download"
			inputType="video"
			onSubmit={(url) => mutation.mutate(url)}
			isLoading={mutation.isPending}
			optionsNode={optionsNode}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode} slug="transcript-downloader">
				{mutation.data && (
					<div className="space-y-4 text-center sm:text-left">
						<div className="space-y-1">
							<h3 className="font-display text-base font-bold text-ink leading-tight">
								{mutation.data.title}
							</h3>
							<p className="text-xs text-ink-soft">
								Language: <span className="font-semibold text-primary-deep">{mutation.data.language.toUpperCase()}</span> | Format: <span className="font-semibold text-primary-deep">{mutation.data.format}</span>
							</p>
						</div>
						<button
							onClick={() => handleDownload(mutation.data.downloadUrl)}
							className="w-full sm:w-auto font-display font-bold text-sm text-ink bg-primary hover:bg-primary-deep hover:text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-sm cursor-pointer whitespace-nowrap active:scale-[0.98]"
						>
							Download Subtitle File
						</button>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
