"use client";

import React from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";
import TextBlockInput from "@/components/tools/text-block-input";

interface ValidationIssue {
	severity: "error" | "warning";
	lineNo?: number;
	lineContent?: string;
	message: string;
}

interface ChapterValidatorResult {
	isValid: boolean;
	issues: ValidationIssue[];
	chapterCount: number;
	totalSeconds: number;
	formattedList: string;
}

export default function ChapterValidatorPage() {
	const [copied, setCopied] = React.useState(false);

	const mutation = useMutation({
		mutationFn: (text: string) => callToolApi<ChapterValidatorResult>("chapter-validator", "", { text }),
	});

	const status = mutation.isPending ? "loading" : mutation.isError ? "error" : mutation.isSuccess ? "success" : "idle";
	let errorMsg = "", errorCode = "";
	if (mutation.isError) {
		try { const p = JSON.parse(mutation.error.message); errorMsg = p.message; errorCode = p.code; }
		catch { errorMsg = mutation.error.message; }
	}

	const handleCopy = () => {
		if (mutation.data?.formattedList) {
			navigator.clipboard.writeText(mutation.data.formattedList);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	return (
		<ToolPageLayout
			title="Chapter Validator"
			description="Ensure your video chapters meet YouTube's strict formatting rules before publishing. Checks for minimum length, 00:00 start, sequential ordering, and formatting errors."
			iconName="CheckCircle"
			inputNode={
				<TextBlockInput
					onSubmit={(text) => mutation.mutate(text)}
					isLoading={mutation.isPending}
					label="Chapter List"
					placeholder={`00:00 Intro\n01:30 First topic\n03:45 Conclusion`}
					maxChars={10_000}
					rows={8}
				/>
			}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode} slug="chapter-validator">
				{mutation.data && (
					<div className="space-y-6">
						{/* Status Header */}
						<div className={`p-4 rounded-xl border ${mutation.data.isValid ? "border-green-200 bg-green-50 text-green-800" : "border-red-200 bg-red-50 text-red-800"}`}>
							<div className="flex items-center gap-3">
								{mutation.data.isValid ? (
									<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" viewBox="0 0 20 20" fill="currentColor">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
									</svg>
								) : (
									<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-600" viewBox="0 0 20 20" fill="currentColor">
										<path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
									</svg>
								)}
								<div>
									<h3 className="font-bold text-lg">{mutation.data.isValid ? "Chapters are valid!" : "Validation Failed"}</h3>
									<p className="text-sm opacity-90">
										{mutation.data.isValid
											? "These chapters meet all YouTube requirements and will be clickable in your description."
											: "Fix the errors below before pasting these chapters into YouTube."}
									</p>
								</div>
							</div>
						</div>

						{/* Stats grid */}
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-xl border border-primary/10 bg-bg p-4 space-y-0.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Chapters</span>
								<p className="text-2xl font-display font-extrabold text-primary-deep">{mutation.data.chapterCount}</p>
							</div>
							<div className="rounded-xl border border-primary/10 bg-bg p-4 space-y-0.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Total Parsed Duration</span>
								<p className="text-2xl font-display font-extrabold text-primary-deep">
									{Math.floor(mutation.data.totalSeconds / 60)}:{(mutation.data.totalSeconds % 60).toString().padStart(2, '0')}
								</p>
							</div>
						</div>

						{/* Issues List */}
						{mutation.data.issues && mutation.data.issues.length > 0 && (
							<div className="space-y-2">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Issues Found</span>
								<div className="space-y-2">
									{mutation.data.issues.map((issue, idx) => (
										<div key={idx} className={`rounded-xl border p-3 flex flex-col gap-1 ${
											issue.severity === "error" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50"
										}`}>
											<div className="flex items-start gap-2">
												<span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
													issue.severity === "error" ? "bg-red-200 text-red-800" : "bg-amber-200 text-amber-800"
												}`}>
													{issue.severity}
												</span>
												<p className={`text-sm font-semibold ${issue.severity === "error" ? "text-red-900" : "text-amber-900"}`}>
													{issue.message}
												</p>
											</div>
											{issue.lineNo !== undefined && issue.lineContent && (
												<div className="mt-1 ml-10 text-xs font-mono bg-white/50 px-2 py-1.5 rounded text-ink/80 border border-black/5">
													<span className="opacity-50 mr-2">Line {issue.lineNo}:</span>
													{issue.lineContent}
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						)}

						{/* Formatted Output */}
						{mutation.data.chapterCount > 0 && (
							<div className="space-y-2 border-t border-primary/10 pt-4">
								<div className="flex items-center justify-between">
									<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Cleaned Output</span>
									<button
										onClick={handleCopy}
										className="text-xs font-bold text-primary-deep hover:underline"
									>
										{copied ? "Copied!" : "Copy Cleaned List"}
									</button>
								</div>
								<textarea
									readOnly
									value={mutation.data.formattedList}
									rows={Math.min(10, mutation.data.chapterCount)}
									className="w-full resize-none rounded-xl border border-primary/20 bg-bg px-4 py-3 text-sm text-ink font-mono focus:outline-none"
								/>
							</div>
						)}
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
