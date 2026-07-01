export function validateVideoUrl(url: string): boolean {
	const cleaned = url.trim();
	if (!cleaned) return false;

	// Simple direct 11-character ID validation
	if (/^[a-zA-Z0-9_-]{11}$/.test(cleaned)) {
		return true;
	}

	// Match youtu.be, youtube.com shorts, embed, watch, etc.
	const videoRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/;
	return videoRegex.test(cleaned);
}

export function validatePlaylistUrl(url: string): boolean {
	const cleaned = url.trim();
	if (!cleaned) return false;

	// Direct playlist ID validation
	if (/^[a-zA-Z0-9_-]{18,34}$/.test(cleaned)) {
		return true;
	}

	// Must contain list=
	return cleaned.includes("list=") && /[?&]list=([a-zA-Z0-9_-]{18,34})/.test(cleaned);
}

export function validateChannelUrl(url: string): boolean {
	const cleaned = url.trim();
	if (!cleaned) return false;

	// Direct channel ID or handle validation
	if (/^UC[a-zA-Z0-9_-]{22}$/.test(cleaned) || /^@[a-zA-Z0-9._-]{3,30}$/.test(cleaned)) {
		return true;
	}

	// Match channel/UC..., /@handle, /c/name, /user/name
	const channelRegex = /(?:youtube\.com\/(?:channel\/UC[a-zA-Z0-9_-]{22}|c\/[a-zA-Z0-9._-]+|user\/[a-zA-Z0-9._-]+|@[a-zA-Z0-9._-]+))/;
	return channelRegex.test(cleaned);
}

export function validateUrl(url: string, type: "video" | "playlist" | "channel"): boolean {
	switch (type) {
		case "video":
			return validateVideoUrl(url);
		case "playlist":
			return validatePlaylistUrl(url);
		case "channel":
			return validateChannelUrl(url);
		default:
			return false;
	}
}
