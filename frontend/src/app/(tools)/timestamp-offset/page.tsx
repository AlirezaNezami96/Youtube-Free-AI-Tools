"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";
import TextBlockInput from "@/components/tools/text-block-input";

interface TimestampOffsetResult {
	updatedText: string;
	unparsedCount: number;
	totalLines: number;
}

export default function TimestampOffsetPage() {
	const [action, setAction] = useState<"add" | "subtract">("add");
	const [offsetSecs, setOffsetSecs] = useState<number>(10);
	const [copied, setCopied] = useState(false);

	const mutation = useMutation({
		mutationFn: (text: string) =>
			callToolApi<TimestampOffsetResult>("timestamp-offset", text, {
				action,
				offset: offsetSecs.toString(),
			}),
	});

	const status = mutation.isPending ? "loading" : mutation.isError ? "error" : mutation.isSuccess ? "success" : "idle";
	let errorMsg = "", errorCode = "";
	if (mutation.isError) {
		try { const p = JSON.parse(mutation.error.message); errorMsg = p.message; errorCode = p.code; }
		catch { errorMsg = mutation.error.message; }
	}

	const handleCopy = () => {
		if (mutation.data?.updatedText) {
			navigator.clipboard.writeText(mutation.data.updatedText);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const optionsNode = (
		<div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
			<div className="space-y-1.5 flex-1">
				<label className="text-xs font-bold text-ink-soft uppercase tracking-wider block">Direction</label>
				<div className="flex rounded-xl bg-bg border border-primary/20 p-1 w-full max-w-[200px]">
					<button
						onClick={() => setAction("add")}
						className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${action === "add" ? "bg-primary-deep text-white shadow-sm" : "text-ink-soft hover:text-ink"}`}
					>
						Add (+)
					</button>
					<button
						onClick={() => setAction("subtract")}
						className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${action === "subtract" ? "bg-primary-deep text-white shadow-sm" : "text-ink-soft hover:text-ink"}`}
					>
						Subtract (-)
					</button>
				</div>
			</div>

			<div className="space-y-1.5">
				<label className="text-xs font-bold text-ink-soft uppercase tracking-wider block">Offset (Seconds)</label>
				<input
					type="number"
					min="1"
					max="3600"
					value={offsetSecs}
					onChange={(e) => setOffsetSecs(Math.max(1, parseInt(e.target.value) || 0))}
					className="w-32 rounded-xl border border-primary/20 bg-bg px-4 py-2 text-sm text-ink font-mono focus:border-primary-deep focus:outline-none focus:ring-2 focus:ring-primary/20"
				/>
			</div>
		</div>
	);

	return (
		<ToolPageLayout
			title="Timestamp Offset"
			description="Shift all timestamps in your chapter list forward or backward by a specific number of seconds."
			iconName="AlarmClock"
			optionsNode={optionsNode}
			inputNode={
				<TextBlockInput
					onSubmit={(text) => mutation.mutate(text)}
					isLoading={mutation.isPending}
					label="Chapter List"
					placeholder={`00:00 Intro\n01:30 First topic\n03:45 Conclusion`}
					maxChars={50_000}
					rows={8}
				/>
			}
		>
			<ResultsPanel status={status} errorMsg={errorMsg} errorCode={errorCode}>
				{mutation.data && (
					<div className="space-y-5">
						<div className="grid grid-cols-2 gap-4">
							<div className="rounded-xl border border-primary/10 bg-bg p-4 space-y-0.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Lines Parsed</span>
								<p className="text-2xl font-display font-extrabold text-primary-deep">
									{mutation.data.totalLines - mutation.data.unparsedCount} / {mutation.data.totalLines}
								</p>
							</div>
							<div className="rounded-xl border border-primary/10 bg-bg p-4 space-y-0.5">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Unparsed Lines</span>
								<p className={`text-2xl font-display font-extrabold ${mutation.data.unparsedCount > 0 ? "text-amber-600" : "text-primary-deep"}`}>
									{mutation.data.unparsedCount}
								</p>
							</div>
						</div>

						{mutation.data.unparsedCount > 0 && (
							<p className="text-xs text-amber-600 font-semibold bg-amber-50/50 p-2 rounded-lg border border-amber-100">
								{mutation.data.unparsedCount} line(s) did not look like timestamps and were passed through unchanged.
							</p>
						)}

						<div className="space-y-2 border-t border-primary/10 pt-4">
							<div className="flex items-center justify-between">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">Shifted Output</span>
								<button
									onClick={handleCopy}
									className="text-xs font-bold text-primary-deep hover:underline"
								>
									{copied ? "Copied!" : "Copy Output"}
								</button>
							</div>
							<textarea
								readOnly
								value={mutation.data.updatedText}
								rows={Math.min(15, mutation.data.totalLines)}
								className="w-full resize-y rounded-xl border border-primary/20 bg-bg px-4 py-3 text-sm text-ink font-mono focus:outline-none"
							/>
						</div>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
