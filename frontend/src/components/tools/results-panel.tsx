"use client";

import React, { useEffect, useRef } from "react";
import ChannelPromo from "../shared/channel-promo";
import { trackToolSucceeded, trackToolFailed } from "@/lib/firebase/analytics";

interface ResultsPanelProps {
	status: "idle" | "loading" | "success" | "error";
	errorMsg?: string;
	errorCode?: string;
	slug?: string;
	children?: React.ReactNode;
}

export default function ResultsPanel({ status, errorMsg, errorCode, slug, children }: ResultsPanelProps) {
	const prevStatus = useRef(status);

	useEffect(() => {
		if (status !== prevStatus.current && slug) {
			if (status === "success") {
				trackToolSucceeded(slug);
			} else if (status === "error") {
				trackToolFailed(slug, errorCode);
			}
		}
		prevStatus.current = status;
	}, [status, slug, errorCode]);

	if (status === "idle") return null;

	if (status === "loading") {
		return (
			<div className="w-full rounded-2xl border border-primary/20 bg-white p-8 shadow-sm animate-pulse space-y-4">
				<div className="h-5 w-2/5 rounded-md bg-primary/20" />
				<div className="h-24 w-full rounded-xl bg-primary/10" />
				<div className="h-9 w-1/4 rounded-lg bg-primary/15" />
			</div>
		);
	}

	if (status === "error") {
		return (
			<div className="w-full rounded-2xl border border-red-200 bg-red-50/60 p-6 shadow-sm animate-fadeSlideIn">
				<div className="flex items-start gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-500">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							strokeWidth="2.5"
							stroke="currentColor"
							className="h-5 w-5"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
							/>
						</svg>
					</div>
					<div className="space-y-1 min-w-0">
						<h4 className="font-display text-sm font-bold text-red-800">Analysis Failed</h4>
						<p className="text-sm text-red-700 leading-relaxed">
							{errorMsg || "An unexpected error occurred. Please try again."}
						</p>
						{errorCode && (
							<span className="inline-block font-mono text-[10px] text-red-500 bg-red-100/60 px-2 py-0.5 rounded-md mt-1">
								{errorCode}
							</span>
						)}
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="w-full space-y-6 animate-fadeSlideIn">
			<div className="w-full rounded-2xl border border-primary/20 bg-white p-6 shadow-sm">
				{children}
			</div>
			{/* Channel promo renders automatically after every successful result */}
			<ChannelPromo />
		</div>
	);
}
