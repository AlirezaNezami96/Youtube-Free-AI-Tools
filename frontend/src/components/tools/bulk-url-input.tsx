"use client";

import React, { useState, useCallback, useRef } from "react";

interface BulkUrlInputProps {
	onSubmit: (urls: string[]) => void;
	isLoading: boolean;
	maxUrls?: number;
	placeholder?: string;
}

const MAX_URLS = 25;

function validateYouTubeUrl(url: string): boolean {
	const trimmed = url.trim();
	if (!trimmed) return false;
	// Basic YouTube URL pattern check
	return (
		/youtube\.com\/watch\?.*v=/.test(trimmed) ||
		/youtu\.be\/[a-zA-Z0-9_-]{11}/.test(trimmed) ||
		/youtube\.com\/shorts\/[a-zA-Z0-9_-]{11}/.test(trimmed) ||
		/youtube\.com\/embed\/[a-zA-Z0-9_-]{11}/.test(trimmed) ||
		/^[a-zA-Z0-9_-]{11}$/.test(trimmed)
	);
}

export default function BulkUrlInput({ onSubmit, isLoading, maxUrls = MAX_URLS, placeholder }: BulkUrlInputProps) {
	const [text, setText] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const lines = text.split("\n").filter((l) => l.trim() !== "");
	const validLines = lines.filter(validateYouTubeUrl);
	const invalidLines = lines.filter((l) => !validateYouTubeUrl(l));
	const isOverLimit = validLines.length > maxUrls;

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (validLines.length === 0 || isLoading || isOverLimit) return;
			onSubmit(validLines.slice(0, maxUrls));
		},
		[validLines, isLoading, isOverLimit, maxUrls, onSubmit]
	);

	const handlePaste = useCallback(async () => {
		try {
			const clipText = await navigator.clipboard.readText();
			setText((prev) => {
				const newText = prev ? prev + "\n" + clipText : clipText;
				return newText;
			});
			textareaRef.current?.focus();
		} catch {
			// Clipboard API not available; user can still paste manually
		}
	}, []);

	const handleClear = () => {
		setText("");
		textareaRef.current?.focus();
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold text-ink-soft uppercase tracking-wider">
						YouTube URLs <span className="font-normal text-ink-soft/60">(one per line)</span>
					</label>
					<div className="flex items-center gap-2">
						<span
							className={`text-xs font-semibold tabular-nums ${
								isOverLimit ? "text-red-500" : "text-ink-soft/60"
							}`}
						>
							{validLines.length}/{maxUrls}
						</span>
						<button
							type="button"
							onClick={handlePaste}
							className="text-xs text-primary-deep hover:underline font-semibold"
						>
							Paste
						</button>
						{text && (
							<button
								type="button"
								onClick={handleClear}
								className="text-xs text-ink-soft/60 hover:text-red-500 font-semibold"
							>
								Clear
							</button>
						)}
					</div>
				</div>
				<textarea
					ref={textareaRef}
					value={text}
					onChange={(e) => setText(e.target.value)}
					rows={8}
					disabled={isLoading}
					placeholder={
						placeholder ||
						`https://www.youtube.com/watch?v=...\nhttps://youtu.be/...\nhttps://www.youtube.com/shorts/...`
					}
					className="w-full resize-y rounded-xl border border-primary/30 bg-bg px-4 py-3 text-sm text-ink font-mono placeholder:text-ink-soft/40 focus:border-primary-deep focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-60"
				/>

				{/* Per-line validation feedback */}
				{lines.length > 0 && (
					<div className="space-y-1 max-h-36 overflow-y-auto">
						{lines.map((line, i) => {
							const valid = validateYouTubeUrl(line);
							return (
								<div key={i} className={`flex items-center gap-2 text-xs ${valid ? "text-green-700" : "text-red-600"}`}>
									<span className="shrink-0">{valid ? "✓" : "✗"}</span>
									<span className="truncate font-mono">{line.trim()}</span>
								</div>
							);
						})}
					</div>
				)}

				{isOverLimit && (
					<p className="text-xs text-red-600 font-semibold">
						Too many URLs. Only the first {maxUrls} will be processed.
					</p>
				)}
				{invalidLines.length > 0 && !isOverLimit && (
					<p className="text-xs text-amber-600">
						{invalidLines.length} line{invalidLines.length !== 1 ? "s" : ""} could not be recognized as YouTube URLs and will be skipped.
					</p>
				)}
			</div>

			<button
				type="submit"
				disabled={validLines.length === 0 || isLoading}
				className="w-full rounded-xl bg-primary-deep py-3 px-6 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isLoading ? (
					<span className="flex items-center justify-center gap-2">
						<span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
						Processing {validLines.length} URL{validLines.length !== 1 ? "s" : ""}…
					</span>
				) : (
					`Analyze ${validLines.length > 0 ? validLines.length : ""} URL${validLines.length !== 1 ? "s" : ""}`
				)}
			</button>
		</form>
	);
}
