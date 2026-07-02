"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";

interface LinkEntry {
	time: string;
	label: string;
	url: string;
	seconds: number;
}

interface GeneratorResult {
	videoId: string;
	links: LinkEntry[];
	formattedBlock: string;
}

export default function TimestampGeneratorPage() {
	const [videoUrl, setVideoUrl] = useState("");
	const [videoId, setVideoId] = useState("");
	const [rows, setRows] = useState<{ time: string; label: string }[]>([
		{ time: "0:00", label: "Introduction" },
		{ time: "1:30", label: "First Section" },
	]);
	const [copiedKey, setCopiedKey] = useState<string | null>(null);

	const urlMutation = useMutation({
		mutationFn: (url: string) =>
			callToolApi<{ videoId: string }>("youtube-id-extractor", url),
		onSuccess: (data) => {
			if (data.videoId) {
				setVideoId(data.videoId);
			}
		},
	});

	const generateMutation = useMutation({
		mutationFn: () =>
			callToolApi<GeneratorResult>("timestamp-generator", videoUrl, {}, rows),
	});

	const handleAddRow = () => {
		setRows([...rows, { time: "", label: "" }]);
	};

	const handleRemoveRow = (idx: number) => {
		setRows(rows.filter((_, i) => i !== idx));
	};

	const handleRowChange = (idx: number, field: "time" | "label", val: string) => {
		const newRows = [...rows];
		newRows[idx][field] = val;
		setRows(newRows);
	};

	const handleCopy = (text: string, key: string) => {
		navigator.clipboard.writeText(text);
		setCopiedKey(key);
		setTimeout(() => setCopiedKey(null), 2000);
	};

	const handleUrlSubmit = (url: string) => {
		setVideoUrl(url);
		urlMutation.mutate(url);
	};

	const status = urlMutation.isPending || generateMutation.isPending
		? "loading"
		: urlMutation.isError || generateMutation.isError
		? "error"
		: generateMutation.isSuccess
		? "success"
		: "idle";

	let errorMsg = "";
	let errorCode = "";
	const activeErr = urlMutation.error || generateMutation.error;
	if (activeErr) {
		try {
			const parsed = JSON.parse(activeErr.message);
			errorMsg = parsed.message;
			errorCode = parsed.code;
		} catch {
			errorMsg = activeErr.message;
		}
	}

	return (
		<ToolPageLayout
			title="Timestamp Generator"
			description="Generate clickable timestamp deep-links and copy-paste descriptions for YouTube chapters."
			iconName="ListStart"
			inputType="video"
			onSubmit={handleUrlSubmit}
			isLoading={urlMutation.isPending || generateMutation.isPending}
		>
			{/* Show Rows Editor if videoId has been resolved */}
			{videoId && !generateMutation.isSuccess && (
				<div className="rounded-2xl border border-primary/20 bg-white p-6 shadow-sm space-y-6">
					<div className="flex justify-between items-center">
						<div className="space-y-0.5">
							<h3 className="font-display text-sm font-bold text-ink">
								Video Loaded
							</h3>
							<p className="text-xs text-ink-soft font-mono">
								ID: {videoId}
							</p>
						</div>
						<button
							onClick={handleAddRow}
							className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary-deep hover:bg-primary/20 transition-all select-none cursor-pointer"
						>
							+ Add Row
						</button>
					</div>

					<div className="space-y-3">
						{rows.map((row, idx) => (
							<div key={idx} className="flex gap-3 items-center">
								<input
									type="text"
									value={row.time}
									onChange={(e) => handleRowChange(idx, "time", e.target.value)}
									placeholder="e.g. 01:23"
									className="w-24 rounded-lg border border-primary/30 bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-primary-deep text-center font-mono"
								/>
								<input
									type="text"
									value={row.label}
									onChange={(e) => handleRowChange(idx, "label", e.target.value)}
									placeholder="e.g. Introduction"
									className="flex-1 rounded-lg border border-primary/30 bg-bg px-3 py-2 text-sm text-ink outline-none focus:border-primary-deep"
								/>
								<button
									onClick={() => handleRemoveRow(idx)}
									disabled={rows.length <= 1}
									className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
								>
									<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2.5" stroke="currentColor" className="h-4.5 w-4.5">
										<path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
									</svg>
								</button>
							</div>
						))}
					</div>

					<button
						onClick={() => generateMutation.mutate()}
						className="w-full font-display font-bold text-sm text-ink bg-primary hover:bg-primary-deep hover:text-white py-3 rounded-xl transition-all duration-200 shadow-sm cursor-pointer active:scale-[0.98]"
					>
						Generate Timestamps
					</button>
				</div>
			)}

			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode} slug="timestamp-generator">
				{generateMutation.data && (
					<div className="space-y-6">
						{/* Copyable Formatted Block */}
						<div className="space-y-1.5">
							<div className="flex justify-between items-center">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">YouTube Description Block</span>
								<button
									onClick={() => handleCopy(generateMutation.data!.formattedBlock, "block")}
									className="rounded bg-primary hover:bg-primary-deep hover:text-white px-2 py-1 text-xs font-bold text-ink transition-colors cursor-pointer"
								>
									{copiedKey === "block" ? "Copied!" : "Copy Block"}
								</button>
							</div>
							<pre className="rounded-xl border border-primary/10 bg-bg p-4 overflow-x-auto font-mono text-xs text-ink leading-relaxed select-all">
								{generateMutation.data.formattedBlock}
							</pre>
						</div>

						{/* Individual Deep Links list */}
						<div className="space-y-2 border-t border-primary/10 pt-4">
							<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Generated Deep Links</span>
							<div className="space-y-2">
								{generateMutation.data.links.map((link, idx) => (
									<div key={idx} className="flex justify-between items-center bg-bg p-3 rounded-lg border border-primary/5 text-xs">
										<div className="flex gap-2 font-mono">
											<span className="font-bold text-primary-deep">{link.time}</span>
											<span className="text-ink-soft font-sans">{link.label}</span>
										</div>
										<div className="flex gap-2">
											<a
												href={link.url}
												target="_blank"
												rel="noopener noreferrer"
												className="rounded bg-primary/20 text-primary-deep hover:bg-primary-deep hover:text-white px-2.5 py-1 font-semibold transition-colors cursor-pointer"
											>
												Open
											</a>
											<button
												onClick={() => handleCopy(link.url, `link-${idx}`)}
												className="rounded border border-primary/40 bg-white hover:bg-primary/10 px-2.5 py-1 font-semibold text-ink-soft transition-colors cursor-pointer"
											>
												{copiedKey === `link-${idx}` ? "Copied!" : "Copy"}
											</button>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Reset Button */}
						<button
							onClick={() => {
								setVideoId("");
								setVideoUrl("");
								generateMutation.reset();
								urlMutation.reset();
							}}
							className="w-full sm:w-auto font-display font-bold text-xs text-ink-soft bg-bg hover:bg-primary/20 px-4 py-2.5 rounded-lg border border-primary/30 transition-colors cursor-pointer"
						>
							Start Over
						</button>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
