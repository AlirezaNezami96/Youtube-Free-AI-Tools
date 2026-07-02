export interface ToolEntry {
	slug: string;
	name: string;
	description: string;
	category: "Transcripts" | "Playlist Tools" | "Video Info" | "Quick Utilities" | "Bulk Tools" | "Validation & Formatting";
	inputType: "video" | "playlist" | "channel" | "bulk" | "text" | "image";
	iconName: string; // Lucide icon name
	/** When false (set via Remote Config), the tool is hidden from the homepage grid. Defaults to true. */
	visible?: boolean;
}

export const toolsRegistry: ToolEntry[] = [
	// ── Transcripts ──────────────────────────────────────────────────────────
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
		slug: "transcript-search",
		name: "Transcript Search",
		description: "Search and jump to any word or phrase within a video's full transcript.",
		category: "Transcripts",
		inputType: "video",
		iconName: "Search",
	},

	// ── Playlist Tools ────────────────────────────────────────────────────────
	{
		slug: "playlist-duration-calculator",
		name: "Playlist Duration Calculator",
		description: "Calculate total playlist runtime with stats and speed-adjusted times.",
		category: "Playlist Tools",
		inputType: "playlist",
		iconName: "Clock",
	},
	{
		slug: "playlist-exporter",
		name: "Playlist Exporter",
		description: "Export full playlist details as clean CSV or structured JSON files.",
		category: "Playlist Tools",
		inputType: "playlist",
		iconName: "FileSpreadsheet",
	},

	// ── Video Info ────────────────────────────────────────────────────────────
	{
		slug: "thumbnail-downloader",
		name: "Thumbnail Downloader",
		description: "Grab high-quality YouTube video thumbnails at multiple resolutions.",
		category: "Video Info",
		inputType: "video",
		iconName: "Image",
	},
	{
		slug: "thumbnail-preview",
		name: "Thumbnail Preview",
		description: "Preview how your thumbnail looks at every resolution and aspect ratio.",
		category: "Video Info",
		inputType: "video",
		iconName: "ImagePlay",
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
		slug: "channel-rss-feed-generator",
		name: "Channel RSS Feed Generator",
		description: "Resolve channel IDs and generate RSS feed URLs from any channel handle.",
		category: "Video Info",
		inputType: "channel",
		iconName: "Rss",
	},

	// ── Quick Utilities ───────────────────────────────────────────────────────
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
		inputType: "video",
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
		slug: "shorts-url-converter",
		name: "Shorts URL Converter",
		description: "Convert any YouTube video URL to Watch, Short, youtu.be, or Embed format.",
		category: "Quick Utilities",
		inputType: "video",
		iconName: "ArrowLeftRight",
	},

	// ── Bulk Tools ────────────────────────────────────────────────────────────
	{
		slug: "bulk-metadata-extractor",
		name: "Bulk Metadata Extractor",
		description: "Fetch metadata for up to 25 videos at once — export as CSV or JSON.",
		category: "Bulk Tools",
		inputType: "bulk",
		iconName: "Table",
	},
	{
		slug: "video-duration-calculator",
		name: "Video Duration Calculator",
		description: "Calculate total watch time for up to 25 videos with speed adjustments.",
		category: "Bulk Tools",
		inputType: "bulk",
		iconName: "Timer",
	},
	{
		slug: "bulk-thumbnail-downloader",
		name: "Bulk Thumbnail Downloader",
		description: "Download thumbnails for up to 25 videos — get a zip with one click.",
		category: "Bulk Tools",
		inputType: "bulk",
		iconName: "Images",
	},

	// ── Validation & Formatting ───────────────────────────────────────────────
	{
		slug: "chapter-validator",
		name: "Chapter Validator",
		description: "Validate your video chapter list for all YouTube requirements before publishing.",
		category: "Validation & Formatting",
		inputType: "text",
		iconName: "CheckCircle",
	},
	{
		slug: "timestamp-offset",
		name: "Timestamp Offset",
		description: "Shift all timestamps in a chapter list forward or backward by any amount.",
		category: "Validation & Formatting",
		inputType: "text",
		iconName: "AlarmClock",
	},
];
