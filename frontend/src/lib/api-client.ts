import { getAppCheckToken } from "./firebase/app-check";

export interface ApiError {
	code: string;
	message: string;
}

export interface ApiResponse<T> {
	data?: T;
	error?: ApiError;
}

/**
 * callToolApi — calls a tool endpoint with optional URL, URLs array, options,
 * and timestamps. Automatically attaches Firebase App Check header when available.
 */
export async function callToolApi<T>(
	slug: string,
	url: string,
	options?: Record<string, string>,
	timestamps?: any[]
): Promise<T> {
	return _callApi<T>(slug, { url, options: options || {}, timestamps });
}

/**
 * callToolApiWithUrls — for bulk tools that send a URLs array rather than a single URL.
 */
export async function callToolApiWithUrls<T>(
	slug: string,
	urls: string[],
	options?: Record<string, string>
): Promise<T> {
	return _callApi<T>(slug, { url: "", urls, options: options || {} });
}

async function _callApi<T>(slug: string, body: Record<string, unknown>): Promise<T> {
	const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
	const endpoint = `${API_BASE}/api/v1/tools/${slug}`;

	console.log(`[API Request] Calling: ${endpoint}`, body);

	// Attach Firebase App Check token if available
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};
	try {
		const appCheckToken = await getAppCheckToken();
		if (appCheckToken) {
			headers["X-Firebase-AppCheck"] = appCheckToken;
		}
	} catch {
		// Never block a request because of App Check failure
	}

	let response: Response;
	try {
		response = await fetch(endpoint, {
			method: "POST",
			headers,
			body: JSON.stringify(body),
		});
	} catch (networkErr: any) {
		console.error(`[API Request Error] Network request failed for ${endpoint}:`, networkErr);
		throw new Error(
			JSON.stringify({
				code: "NETWORK_ERROR",
				message: `Failed to connect to the backend server at ${API_BASE}. Make sure the Go backend is running.`,
			})
		);
	}

	const responseText = await response.text();
	console.log(`[API Response] Status: ${response.status} for ${endpoint}`, responseText);

	let data: any;
	try {
		data = JSON.parse(responseText);
	} catch (jsonErr: any) {
		console.error(`[API JSON Parse Error] Failed to parse response from ${endpoint}:`, jsonErr);
		console.error(`[API JSON Parse Error] Raw response content was:\n`, responseText);
		throw new Error(
			JSON.stringify({
				code: "INVALID_RESPONSE",
				message: `Received invalid response format from backend. Status: ${response.status}. Please check backend logs.`,
			})
		);
	}

	if (!response.ok) {
		if (data && data.error) {
			throw new Error(JSON.stringify(data.error));
		}
		throw new Error(JSON.stringify({ code: "UNKNOWN_ERROR", message: "An unexpected error occurred." }));
	}

	return data as T;
}
