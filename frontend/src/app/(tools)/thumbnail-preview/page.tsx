"use client";

import React, { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { callToolApi } from "@/lib/api-client";
import ToolPageLayout from "@/components/tools/tool-page-layout";
import ResultsPanel from "@/components/tools/results-panel";
import ImageUpload from "@/components/tools/image-upload";
import UrlInput from "@/components/tools/url-input";

interface ResolutionURL {
	key: string;
	label: string;
	url: string;
	available: boolean;
}

interface ThumbnailPreviewResult {
	videoId: string;
	resolutions: ResolutionURL[];
	bestAvailUrl: string;
}

export default function ThumbnailPreviewPage() {
	const [uploadedImage, setUploadedImage] = useState<string | null>(null);

	const mutation = useMutation({
		mutationFn: (url: string) => callToolApi<ThumbnailPreviewResult>("thumbnail-preview", url),
	});

	const status = mutation.isPending ? "loading" : mutation.isError ? "error" : mutation.isSuccess ? "success" : "idle";
	let errorMsg = "", errorCode = "";
	if (mutation.isError) {
		try { const p = JSON.parse(mutation.error.message); errorMsg = p.message; errorCode = p.code; }
		catch { errorMsg = mutation.error.message; }
	}

	const handleImageUpload = (file: File | null) => {
		if (file) {
			const reader = new FileReader();
			reader.onload = (e) => setUploadedImage(e.target?.result as string);
			reader.readAsDataURL(file);
			// Automatically reset the mutation so the uploaded image takes precedence
			mutation.reset();
		} else {
			setUploadedImage(null);
		}
	};

	// Use either the manually uploaded image, or the best available CDN URL
	const activeImageUrl = uploadedImage || (mutation.data?.bestAvailUrl ?? "");

	const inputNode = (
		<div className="grid md:grid-cols-2 gap-6">
			<div className="space-y-3">
				<UrlInput
					inputType="video"
					onSubmit={(url) => {
						setUploadedImage(null);
						mutation.mutate(url);
					}}
					isLoading={mutation.isPending}
				/>
				<p className="text-xs text-ink-soft/60 px-1 text-center">
					Fetch from an existing YouTube video
				</p>
			</div>
			<div className="relative flex flex-col justify-center">
				<div className="hidden md:flex absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 py-4 text-xs font-bold text-ink-soft/40 uppercase tracking-widest z-10 -ml-3">
					OR
				</div>
				<ImageUpload onChange={handleImageUpload} label="" />
			</div>
		</div>
	);

	return (
		<ToolPageLayout
			title="Thumbnail Preview"
			description="Test how your thumbnail will look across YouTube's different surfaces (Desktop, Mobile, Sidebar) before you publish it. Upload a file or fetch an existing video."
			iconName="ImagePlay"
			inputNode={inputNode}
		>
			<ResultsPanel status={uploadedImage ? "success" : status} errorMsg={errorMsg} errorCode={errorCode}>
				{activeImageUrl && (
					<div className="space-y-10">
						{/* Active Image / CDN Info */}
						{mutation.data && !uploadedImage && (
							<div className="rounded-xl border border-primary/10 bg-bg p-4 space-y-3">
								<span className="text-[10px] font-bold text-ink-soft/60 uppercase tracking-wider">CDN Availability</span>
								<div className="grid grid-cols-2 md:grid-cols-4 gap-2">
									{mutation.data.resolutions.map((res) => (
										<div key={res.key} className={`rounded-lg p-2 border ${res.available ? "border-green-200 bg-green-50 text-green-800" : "border-red-100 bg-red-50 text-red-600 opacity-60"}`}>
											<p className="text-[10px] font-bold uppercase truncate">{res.key}</p>
											<p className="text-xs font-semibold">{res.available ? "Available" : "Missing"}</p>
										</div>
									))}
								</div>
								<p className="text-xs text-ink-soft">Using best available resolution for previews: <span className="font-mono text-primary-deep break-all">{mutation.data.bestAvailUrl}</span></p>
							</div>
						)}

						{/* Mockups */}
						<div className="space-y-8">
							<h3 className="font-display text-lg font-bold text-ink border-b border-primary/10 pb-2">Desktop Homepage Mockup</h3>
							<div className="max-w-[360px] space-y-3 mx-auto md:mx-0">
								<div className="aspect-video w-full rounded-xl overflow-hidden bg-black relative">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img src={activeImageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
									<span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1.5 rounded">12:34</span>
								</div>
								<div className="flex gap-3 px-1">
									<div className="w-9 h-9 rounded-full bg-primary/20 shrink-0" />
									<div className="space-y-1 w-full">
										<p className="text-sm font-bold text-ink line-clamp-2 leading-tight">Your Video Title Looks Like This When Displayed on the Homepage</p>
										<p className="text-xs text-ink-soft">Channel Name • 1.2M views • 2 days ago</p>
									</div>
								</div>
							</div>

							<h3 className="font-display text-lg font-bold text-ink border-b border-primary/10 pb-2">Mobile List Mockup</h3>
							<div className="max-w-[480px] w-full border border-primary/10 rounded-xl overflow-hidden">
								<div className="aspect-video w-full bg-black relative">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img src={activeImageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
									<span className="absolute bottom-1 right-1 bg-black/80 text-white text-xs font-bold px-1.5 py-0.5 rounded">12:34</span>
								</div>
								<div className="p-3 flex gap-3">
									<div className="w-10 h-10 rounded-full bg-primary/20 shrink-0" />
									<div className="space-y-0.5">
										<p className="text-base font-bold text-ink line-clamp-2 leading-tight">Your Video Title Looks Like This When Displayed on Mobile Devices</p>
										<p className="text-sm text-ink-soft">Channel Name • 1.2M views • 2 days ago</p>
									</div>
								</div>
							</div>

							<h3 className="font-display text-lg font-bold text-ink border-b border-primary/10 pb-2">Sidebar / Up Next Mockup</h3>
							<div className="flex gap-2 max-w-[400px]">
								<div className="w-[168px] aspect-video rounded-lg overflow-hidden bg-black shrink-0 relative">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img src={activeImageUrl} alt="Thumbnail" className="w-full h-full object-cover" />
									<span className="absolute bottom-1 right-1 bg-black/80 text-white text-[10px] font-bold px-1 rounded">12:34</span>
								</div>
								<div className="space-y-0.5 py-0.5">
									<p className="text-sm font-bold text-ink line-clamp-2 leading-tight">Your Video Title on Sidebar</p>
									<p className="text-xs text-ink-soft">Channel Name</p>
									<p className="text-xs text-ink-soft">1.2M views • 2 days ago</p>
								</div>
							</div>
						</div>
					</div>
				)}
			</ResultsPanel>
		</ToolPageLayout>
	);
}
