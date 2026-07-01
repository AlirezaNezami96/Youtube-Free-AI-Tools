export interface ApiError {
	code: string;
	message: string;
}

export interface ApiResponse<T> {
	data?: T;
	error?: ApiError;
}

export async function callToolApi<T>(slug: string, url: string, options?: Record<string, string>, timestamps?: any[]): Promise<T> {
	const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
	const endpoint = `${API_BASE}/api/v1/tools/${slug}`;

	console.log(`[API Request] Calling: ${endpoint}`, { url, options, timestamps });

	let response: Response;
	try {
		response = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				url,
				options: options || {},
				timestamps: timestamps,
			}),
		});
	} catch (networkErr: any) {
		console.error(`[API Request Error] Network request failed for ${endpoint}:`, networkErr);
		throw new Error(JSON.stringify({
			code: "NETWORK_ERROR",
			message: `Failed to connect to the backend server at ${API_BASE}. Make sure the Go backend is running.`
		}));
	}

	const responseText = await response.text();
	console.log(`[API Response] Status: ${response.status} for ${endpoint}`, responseText);

	let data: any;
	try {
		data = JSON.parse(responseText);
	} catch (jsonErr: any) {
		console.error(`[API JSON Parse Error] Failed to parse response from ${endpoint}:`, jsonErr);
		console.error(`[API JSON Parse Error] Raw response content was:\n`, responseText);
		throw new Error(JSON.stringify({
			code: "INVALID_RESPONSE",
			message: `Received invalid response format from backend. Status: ${response.status}. Please check backend logs.`
		}));
	}

	if (!response.ok) {
		if (data && data.error) {
			throw new Error(JSON.stringify(data.error));
		}
		throw new Error(JSON.stringify({ code: "UNKNOWN_ERROR", message: "An unexpected error occurred." }));
	}

	return data as T;
}
