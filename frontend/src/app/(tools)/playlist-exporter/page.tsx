"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";

interface ExporterResult {
	playlistTitle: string;
	videoCount: number;
	downloadUrl: string;
	format: string;
}

export default function PlaylistExporterPage() {
	const [format, setFormat] = useState("CSV");

	const mutation = useMutation({
		mutationFn: (url: string) =>
			callToolApi<ExporterResult>("playlist-exporter", url, { format }),
	});

	const optionsNode = (
		<div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
			<label className="text-sm font-semibold text-ink-soft select-none">
				Export Format
			</label>
			<select
				value={format}
				onChange={(e) => setFormat(e.target.value)}
				className="rounded-lg border border-primary/40 bg-white px-3 py-2 text-sm text-ink outline-none focus:border-primary-deep"
			>
				<option value="CSV">CSV (Spreadsheet compatible)</option>
				<option value="JSON">JSON (Developer metadata format)</option>
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
			slug="playlist-exporter"
			title="Playlist Exporter"
			description="Export YouTube playlist metadata including titles, URLs, and video durations to CSV or JSON format."
			iconName="FileSpreadsheet"
			inputType="playlist"
			onSubmit={(url) => mutation.mutate(url)}
			isLoading={mutation.isPending}
			optionsNode={optionsNode}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode}>
				{mutation.data && (
					<div className="space-y-4 text-center sm:text-left">
						<div className="space-y-1">
							<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Playlist Title</span>
							<h3 className="font-display text-base font-bold text-ink leading-tight">
								{mutation.data.playlistTitle}
							</h3>
							<p className="text-xs text-ink-soft">
								Total Videos: <span className="font-semibold">{mutation.data.videoCount}</span> | Format: <span className="font-semibold text-primary-deep">{mutation.data.format}</span>
							</p>
						</div>
						<button
							onClick={() => handleDownload(mutation.data.downloadUrl)}
							className="w-full sm:w-auto font-display font-bold text-sm text-ink bg-primary hover:bg-primary-deep hover:text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-sm cursor-pointer whitespace-nowrap active:scale-[0.98]"
						>
							Download Export File
						</button>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
