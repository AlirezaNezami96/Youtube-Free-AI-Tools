"use client";

import React, { useState, useRef, useCallback } from "react";

interface ImageUploadProps {
	onChange: (file: File | null) => void;
	label?: string;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_SIZE_MB = 10;

export default function ImageUpload({ onChange, label = "Upload Image" }: ImageUploadProps) {
	const [preview, setPreview] = useState<string | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isDragging, setIsDragging] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const processFile = useCallback(
		(file: File | null) => {
			setError(null);
			if (!file) {
				setPreview(null);
				setFileName(null);
				onChange(null);
				return;
			}
			if (!ACCEPTED_TYPES.includes(file.type)) {
				setError("Please select a JPEG, PNG, WebP, or GIF image.");
				return;
			}
			if (file.size > MAX_SIZE_MB * 1024 * 1024) {
				setError(`File exceeds the ${MAX_SIZE_MB}MB limit.`);
				return;
			}
			setFileName(file.name);
			const reader = new FileReader();
			reader.onload = (e) => setPreview(e.target?.result as string);
			reader.readAsDataURL(file);
			onChange(file);
		},
		[onChange]
	);

	const handleDrop = useCallback(
		(e: React.DragEvent<HTMLDivElement>) => {
			e.preventDefault();
			setIsDragging(false);
			const file = e.dataTransfer.files[0] ?? null;
			processFile(file);
		},
		[processFile]
	);

	const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
		e.preventDefault();
		setIsDragging(true);
	};

	const handleDragLeave = () => setIsDragging(false);

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		processFile(e.target.files?.[0] ?? null);
	};

	const handleClear = () => {
		setPreview(null);
		setFileName(null);
		setError(null);
		onChange(null);
		if (inputRef.current) inputRef.current.value = "";
	};

	return (
		<div className="space-y-3">
			<label className="text-xs font-bold text-ink-soft uppercase tracking-wider">{label}</label>

			<div
				onDrop={handleDrop}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onClick={() => inputRef.current?.click()}
				className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all p-6 flex flex-col items-center justify-center gap-3 min-h-[140px] ${
					isDragging
						? "border-primary-deep bg-primary/10"
						: preview
						? "border-primary/30 bg-bg"
						: "border-primary/30 bg-bg hover:border-primary-deep hover:bg-primary/5"
				}`}
			>
				<input
					ref={inputRef}
					type="file"
					accept={ACCEPTED_TYPES.join(",")}
					onChange={handleFileChange}
					className="sr-only"
				/>

				{preview ? (
					<>
						{/* eslint-disable-next-line @next/next/no-img-element */}
						<img src={preview} alt="Preview" className="max-h-48 rounded-lg object-contain shadow-sm" />
						<p className="text-xs text-ink-soft truncate max-w-xs">{fileName}</p>
					</>
				) : (
					<>
						<svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
						</svg>
						<div className="text-center">
							<p className="text-sm font-semibold text-ink-soft">Drop an image here or <span className="text-primary-deep underline">browse</span></p>
							<p className="text-xs text-ink-soft/60 mt-1">JPEG, PNG, WebP, GIF — max {MAX_SIZE_MB}MB</p>
						</div>
					</>
				)}
			</div>

			{error && <p className="text-xs text-red-600 font-semibold">{error}</p>}

			{preview && (
				<button
					type="button"
					onClick={handleClear}
					className="text-xs text-ink-soft/60 hover:text-red-500 font-semibold"
				>
					Remove image
				</button>
			)}
		</div>
	);
}
