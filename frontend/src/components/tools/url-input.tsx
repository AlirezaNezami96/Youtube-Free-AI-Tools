"use client";

import React, { useState, useCallback } from "react";
import { validateUrl } from "@/lib/validation";

interface UrlInputProps {
	inputType: "video" | "playlist" | "channel";
	onSubmit: (url: string) => void;
	isLoading: boolean;
}

export default function UrlInput({ inputType, onSubmit, isLoading }: UrlInputProps) {
	const [url, setUrl] = useState("");
	const [error, setError] = useState("");
	const [touched, setTouched] = useState(false);
	const [pasting, setPasting] = useState(false);

	const placeholders: Record<typeof inputType, string> = {
		video: "Paste a YouTube video URL (e.g. youtube.com/watch?v=…)",
		playlist: "Paste a YouTube playlist URL (e.g. youtube.com/playlist?list=…)",
		channel: "Paste a channel URL or @handle (e.g. youtube.com/@Channel)",
	};

	const labels: Record<typeof inputType, string> = {
		video: "Paste a YouTube video URL",
		playlist: "Paste a YouTube playlist URL",
		channel: "Paste a channel URL or @handle",
	};

	const validate = useCallback(
		(value: string): string => {
			if (!value.trim()) return "Input cannot be empty.";
			if (!validateUrl(value, inputType))
				return `Please enter a valid YouTube ${inputType} URL or identifier.`;
			return "";
		},
		[inputType]
	);

	const handleChange = (value: string) => {
		setUrl(value);
		if (touched) setError(validate(value));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setTouched(true);
		const err = validate(url);
		if (err) {
			setError(err);
			return;
		}
		onSubmit(url.trim());
	};

	const handlePaste = async () => {
		if (!navigator.clipboard?.readText) return;
		try {
			setPasting(true);
			const text = await navigator.clipboard.readText();
			const cleaned = text.trim();
			setUrl(cleaned);
			if (touched) setError(validate(cleaned));
		} catch {
			// Clipboard permission denied — silently ignore
		} finally {
			setPasting(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="w-full space-y-3">
			<div className="flex flex-col gap-1.5">
				<label className="text-sm font-semibold text-ink-soft select-none">
					{labels[inputType]}
				</label>
				<div className="relative flex items-center rounded-xl border border-primary/40 bg-white shadow-sm transition-all focus-within:border-primary-deep focus-within:ring-2 focus-within:ring-primary/20">
					{/* Paste button */}
					<button
						type="button"
						onClick={handlePaste}
						disabled={isLoading || pasting}
						aria-label="Paste from clipboard"
						title="Paste from clipboard"
						className="flex h-full shrink-0 items-center justify-center px-3 text-ink-soft/50 hover:text-primary-deep transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="h-4 w-4"
						>
							<rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
							<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
						</svg>
					</button>

					<input
						type="text"
						value={url}
						onChange={(e) => handleChange(e.target.value)}
						onBlur={() => {
							setTouched(true);
							setError(validate(url));
						}}
						placeholder={placeholders[inputType]}
						disabled={isLoading}
						className="min-w-0 flex-1 border-0 bg-transparent py-3 pr-1 text-sm text-ink outline-none placeholder:text-ink-soft/40"
					/>

					<button
						type="submit"
						disabled={isLoading || (touched && !!error)}
						className="m-1 flex shrink-0 items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-ink transition-all duration-200 hover:bg-primary-deep hover:text-white active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer select-none"
					>
						{isLoading ? (
							<svg
								className="h-4 w-4 animate-spin"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									className="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									strokeWidth="4"
								/>
								<path
									className="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								/>
							</svg>
						) : (
							"Analyze"
						)}
					</button>
				</div>
			</div>
			{touched && error && (
				<p className="flex items-center gap-1 text-xs font-semibold text-red-600">
					<svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
						<path
							fillRule="evenodd"
							d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					</svg>
					{error}
				</p>
			)}
		</form>
	);
}
