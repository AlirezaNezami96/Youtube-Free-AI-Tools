export interface ToolEntry {
	slug: string;
	name: string;
	description: string;
	category: "Transcripts" | "Playlist Tools" | "Video Info" | "Quick Utilities";
	inputType: "video" | "playlist" | "channel";
	iconName: string; // Map to Lucide icon name
}

export const toolsRegistry: ToolEntry[] = [
	{
		slug: "transcript-extractor",
		name: "Transcript Extractor",
		description: "Extract full transcripts from YouTube videos in plain, clean text.",
		category: "Transcripts",
		inputType: "video",
		iconName: "FileText",
	},
	{
		slug: "transcript-downloader",
		name: "Transcript Downloader",
		description: "Download video transcripts as structured SRT or VTT files.",
		category: "Transcripts",
		inputType: "video",
		iconName: "Download",
	},
	{
		slug: "thumbnail-downloader",
		name: "Thumbnail Downloader",
		description: "Grab high-quality YouTube video thumbnails at multiple resolutions.",
		category: "Video Info",
		inputType: "video",
		iconName: "Image",
	},
	{
		slug: "video-metadata-viewer",
		name: "Video Metadata Viewer",
		description: "View comprehensive metadata details and raw JSON dumps for any video.",
		category: "Video Info",
		inputType: "video",
		iconName: "Info",
	},
	{
		slug: "playlist-duration-calculator",
		name: "Playlist Duration Calculator",
		description: "Calculate total playlist runtime adjusted for various playback speeds.",
		category: "Playlist Tools",
		inputType: "playlist",
		iconName: "Clock",
	},
	{
		slug: "youtube-url-cleaner",
		name: "YouTube URL Cleaner",
		description: "Strip clutter, tracking tags, and sharing params from YouTube URLs.",
		category: "Quick Utilities",
		inputType: "video",
		iconName: "Sparkles",
	},
	{
		slug: "youtube-id-extractor",
		name: "YouTube ID Extractor",
		description: "Extract clean IDs or handles for videos, playlists, or channels.",
		category: "Quick Utilities",
		inputType: "video", // accepts anything but starts as video
		iconName: "Hash",
	},
	{
		slug: "timestamp-generator",
		name: "Timestamp Generator",
		description: "Create clickable video deep-links and description tracklists.",
		category: "Quick Utilities",
		inputType: "video",
		iconName: "ListStart",
	},
	{
		slug: "channel-id-finder",
		name: "Channel ID Finder",
		description: "Resolve channel IDs (UC...) from handles and locate RSS feeds.",
		category: "Video Info",
		inputType: "channel",
		iconName: "UserCheck",
	},
	{
		slug: "playlist-exporter",
		name: "Playlist Exporter",
		description: "Export full playlist details as clean CSV or structured JSON files.",
		category: "Playlist Tools",
		inputType: "playlist",
		iconName: "FileSpreadsheet",
	},
];
