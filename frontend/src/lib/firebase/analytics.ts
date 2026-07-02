// Firebase Analytics tracking helpers.
// All calls are wrapped in try/catch — analytics MUST NEVER crash the page.
import { getFirebaseApp } from "./init";
import { getAnalytics, logEvent, Analytics } from "firebase/analytics";

let analytics: Analytics | null = null;

function getAnalyticsInstance(): Analytics | null {
	if (typeof window === "undefined") return null;
	const app = getFirebaseApp();
	if (!app) return null;
	try {
		if (!analytics) {
			analytics = getAnalytics(app);
		}
		return analytics;
	} catch {
		return null;
	}
}

export function trackToolStarted(slug: string): void {
	try {
		const a = getAnalyticsInstance();
		if (a) logEvent(a, "tool_started", { tool_slug: slug });
	} catch {/* silent */}
}

export function trackToolSucceeded(slug: string): void {
	try {
		const a = getAnalyticsInstance();
		if (a) logEvent(a, "tool_succeeded", { tool_slug: slug });
	} catch {/* silent */}
}

export function trackToolFailed(slug: string, errorCode?: string): void {
	try {
		const a = getAnalyticsInstance();
		if (a) logEvent(a, "tool_failed", { tool_slug: slug, error_code: errorCode ?? "UNKNOWN" });
	} catch {/* silent */}
}

export function trackDownloadClicked(slug: string): void {
	try {
		const a = getAnalyticsInstance();
		if (a) logEvent(a, "download_clicked", { tool_slug: slug });
	} catch {/* silent */}
}

export function trackSubscribeClicked(): void {
	try {
		const a = getAnalyticsInstance();
		if (a) logEvent(a, "subscribe_clicked");
	} catch {/* silent */}
}
