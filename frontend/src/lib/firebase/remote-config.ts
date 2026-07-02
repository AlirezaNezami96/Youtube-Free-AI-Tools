// Firebase Remote Config — fetch typed config values with hardcoded fallbacks.
// All values have safe defaults so the app works even when Remote Config is unavailable.
import { getFirebaseApp } from "./init";
import {
	getRemoteConfig,
	fetchAndActivate,
	getValue,
	RemoteConfig,
} from "firebase/remote-config";

// Hardcoded fallback values — the app always works without Firebase.
const DEFAULTS = {
	channel_promo_message: "Subscribe to the channel for more free YouTube tools!",
	channel_promo_visible: "true",
} as const;

let rcInstance: RemoteConfig | null = null;
let initialized = false;

async function getRC(): Promise<RemoteConfig | null> {
	if (typeof window === "undefined") return null;
	const app = getFirebaseApp();
	if (!app) return null;
	try {
		if (!rcInstance) {
			rcInstance = getRemoteConfig(app);
			rcInstance.settings.minimumFetchIntervalMillis = 3600_000; // 1 hour cache
			rcInstance.defaultConfig = DEFAULTS;
		}
		if (!initialized) {
			await fetchAndActivate(rcInstance);
			initialized = true;
		}
		return rcInstance;
	} catch {
		return null;
	}
}

export async function getChannelPromoMessage(): Promise<string> {
	try {
		const rc = await getRC();
		if (rc) return getValue(rc, "channel_promo_message").asString();
	} catch {/* silent */}
	return DEFAULTS.channel_promo_message;
}

export async function getChannelPromoVisible(): Promise<boolean> {
	try {
		const rc = await getRC();
		if (rc) return getValue(rc, "channel_promo_visible").asBoolean();
	} catch {/* silent */}
	return DEFAULTS.channel_promo_visible === "true";
}

export async function getToolVisible(slug: string): Promise<boolean> {
	try {
		const rc = await getRC();
		if (rc) {
			const key = `tool_visible_${slug.replace(/-/g, "_")}`;
			const val = getValue(rc, key);
			// If the key doesn't exist in remote config, default to true (visible)
			if (val.getSource() === "default") return true;
			return val.asBoolean();
		}
	} catch {/* silent */}
	return true;
}
