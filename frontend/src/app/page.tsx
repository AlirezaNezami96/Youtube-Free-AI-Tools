import React from "react";
import ToolGrid from "@/components/tools/tool-grid";

export const metadata = {
	title: "YouTube Tools Suite — 18 Free Utilities",
	description:
		"18 free, premium tools to analyze YouTube videos, playlists, and channels: transcripts, thumbnails, metadata, bulk processing, chapter validation, and more — no sign-up required.",
};

export default function HomePage() {
	return (
		<div className="space-y-12">
			{/* Hero Section */}
			<div className="text-center py-6 space-y-4">
				<h1 className="font-display text-4xl font-extrabold text-ink tracking-tight sm:text-5xl">
					YouTube Utility Suite
				</h1>
				<p className="mx-auto max-w-xl text-base text-ink-soft leading-relaxed">
					Fast, stateless, and premium tools to analyze and extract data from YouTube videos, playlists, and channels.
				</p>
			</div>

			{/* Tool Category Groups */}
			<ToolGrid />
		</div>
	);
}
