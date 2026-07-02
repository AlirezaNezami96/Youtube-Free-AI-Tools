"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackToolStarted } from "./firebase/analytics";

export default function AnalyticsTracker() {
	const pathname = usePathname();

	useEffect(() => {
		if (pathname && pathname !== "/") {
			// Extract tool slug from pathname e.g. "/transcript-extractor"
			const slug = pathname.replace(/^\//, "");
			trackToolStarted(slug);
		}
	}, [pathname]);

	return null;
}
