// Firebase App Check — initializes with reCAPTCHA v3 and exposes a token getter.
// Returns null and logs on failure — App Check must never crash the page.
import { getFirebaseApp } from "./init";
import { initializeAppCheck, getToken, AppCheck, ReCaptchaV3Provider } from "firebase/app-check";

let appCheckInstance: AppCheck | null = null;

function getAppCheckInstance(): AppCheck | null {
	if (typeof window === "undefined") return null;
	const app = getFirebaseApp();
	if (!app) return null;
	const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
	if (!siteKey) return null;
	try {
		if (!appCheckInstance) {
			appCheckInstance = initializeAppCheck(app, {
				provider: new ReCaptchaV3Provider(siteKey),
				isTokenAutoRefreshEnabled: true,
			});
		}
		return appCheckInstance;
	} catch {
		return null;
	}
}

/**
 * Returns an App Check token string, or null if App Check is not configured
 * or token generation fails. Callers should treat null as "don't send the header"
 * (the server will skip verification in dev mode).
 */
export async function getAppCheckToken(): Promise<string | null> {
	try {
		const ac = getAppCheckInstance();
		if (!ac) return null;
		const result = await getToken(ac);
		return result.token;
	} catch (err) {
		console.warn("[AppCheck] Failed to get token:", err);
		return null;
	}
}
