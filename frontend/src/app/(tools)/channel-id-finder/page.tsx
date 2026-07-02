"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// This page has been renamed to /channel-rss-feed-generator.
// Redirect old bookmarks automatically.
export default function ChannelIdFinderRedirectPage() {
	const router = useRouter();

	useEffect(() => {
		router.replace("/channel-rss-feed-generator");
	}, [router]);

	return (
		<div className="flex items-center justify-center min-h-[40vh] text-ink-soft text-sm">
			Redirecting to Channel RSS Feed Generator…
		</div>
	);
}
