"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";
import ToolOptions, { OptionSelect } from "@/components/tools/tool-options";

interface ExtractorResult {
	title: string;
	language: string;
	transcript: string;
}

export default function TranscriptExtractorPage() {
	const [lang, setLang] = useState("en");
	const [copied, setCopied] = useState(false);

	const mutation = useMutation({
		mutationFn: (url: string) =>
			callToolApi<ExtractorResult>("transcript-extractor", url, { lang }),
	});

	const handleCopy = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const optionsNode = (
		<ToolOptions label="Transcript Language">
			<OptionSelect value={lang} onChange={(e) => setLang(e.target.value)}>
				<option value="en">English (Default)</option>
				<option value="es">Spanish (Español)</option>
				<option value="fr">French (Français)</option>
				<option value="de">German (Deutsch)</option>
				<option value="tr">Turkish (Türkçe)</option>
				<option value="ar">Arabic (العربية)</option>
				<option value="fa">Persian (فارسی)</option>
			</OptionSelect>
		</ToolOptions>
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
			slug="transcript-extractor"
			title="Transcript Extractor"
			description="Extract full transcripts from YouTube videos in plain, clean text."
			iconName="FileText"
			inputType="video"
			onSubmit={(url) => mutation.mutate(url)}
			isLoading={mutation.isPending}
			optionsNode={optionsNode}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode}>
				{mutation.data && (
					<div className="space-y-4">
						<div className="flex items-start justify-between gap-4">
							<h3 className="font-display text-base font-bold text-ink leading-tight">
								{mutation.data.title}
							</h3>
							<button
								onClick={() => handleCopy(mutation.data.transcript)}
								className="flex items-center gap-1.5 rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary-deep hover:bg-primary/20 transition-all select-none active:scale-95 cursor-pointer whitespace-nowrap"
							>
								{copied ? "Copied!" : "Copy Transcript"}
							</button>
						</div>
						<div className="rounded-xl bg-bg border border-primary/10 p-4 max-h-[400px] overflow-y-auto font-mono text-xs leading-relaxed text-ink select-text whitespace-pre-wrap">
							{mutation.data.transcript}
						</div>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
