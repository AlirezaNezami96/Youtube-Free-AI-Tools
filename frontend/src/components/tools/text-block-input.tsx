"use client";

import React, { useState, useRef, useCallback } from "react";

interface TextBlockInputProps {
	onSubmit: (text: string) => void;
	isLoading: boolean;
	placeholder?: string;
	label?: string;
	maxChars?: number;
	rows?: number;
}

const DEFAULT_MAX_CHARS = 50_000;

export default function TextBlockInput({
	onSubmit,
	isLoading,
	placeholder = "Paste your text here…",
	label = "Text Input",
	maxChars = DEFAULT_MAX_CHARS,
	rows = 12,
}: TextBlockInputProps) {
	const [text, setText] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

	const charCount = text.length;
	const isOverLimit = charCount > maxChars;

	const handleSubmit = useCallback(
		(e: React.FormEvent) => {
			e.preventDefault();
			if (!text.trim() || isLoading || isOverLimit) return;
			onSubmit(text);
		},
		[text, isLoading, isOverLimit, onSubmit]
	);

	const handlePaste = useCallback(async () => {
		try {
			const clipText = await navigator.clipboard.readText();
			setText(clipText);
			textareaRef.current?.focus();
		} catch {
			// Clipboard API unavailable; user can paste manually
		}
	}, []);

	return (
		<form onSubmit={handleSubmit} className="space-y-4">
			<div className="space-y-2">
				<div className="flex items-center justify-between">
					<label className="text-xs font-bold text-ink-soft uppercase tracking-wider">{label}</label>
					<div className="flex items-center gap-3">
						<span
							className={`text-xs font-mono tabular-nums ${
								isOverLimit ? "text-red-500 font-bold" : "text-ink-soft/60"
							}`}
						>
							{charCount.toLocaleString()}/{maxChars.toLocaleString()}
						</span>
						<button
							type="button"
							onClick={handlePaste}
							className="text-xs text-primary-deep hover:underline font-semibold"
						>
							Paste from clipboard
						</button>
						{text && (
							<button
								type="button"
								onClick={() => setText("")}
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
					rows={rows}
					disabled={isLoading}
					placeholder={placeholder}
					className={`w-full resize-y rounded-xl border px-4 py-3 text-sm text-ink font-mono leading-relaxed placeholder:text-ink-soft/40 focus:outline-none focus:ring-2 transition-all disabled:opacity-60 ${
						isOverLimit
							? "border-red-300 focus:border-red-400 focus:ring-red-100 bg-red-50/30"
							: "border-primary/30 focus:border-primary-deep focus:ring-primary/20 bg-bg"
					}`}
				/>

				{isOverLimit && (
					<p className="text-xs text-red-600 font-semibold">
						Input exceeds the {(maxChars / 1000).toFixed(0)}K character limit. Please trim your input.
					</p>
				)}
			</div>

			<button
				type="submit"
				disabled={!text.trim() || isLoading || isOverLimit}
				className="w-full rounded-xl bg-primary-deep py-3 px-6 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isLoading ? (
					<span className="flex items-center justify-center gap-2">
						<span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
						Processing…
					</span>
				) : (
					"Analyze"
				)}
			</button>
		</form>
	);
}
