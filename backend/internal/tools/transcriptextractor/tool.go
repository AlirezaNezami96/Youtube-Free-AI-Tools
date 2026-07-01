package transcriptextractor

import (
	"context"
	"encoding/json"
	"os"
	"regexp"
	"strings"
	"youtube-tools/backend/internal/config"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/urlkit"
	"youtube-tools/backend/internal/ytdlp"
)

type Tool struct {
	ytClient *ytdlp.Client
	config   *config.Config
}

func New(ytClient *ytdlp.Client, cfg *config.Config) *Tool {
	return &Tool{
		ytClient: ytClient,
		config:   cfg,
	}
}

func (t *Tool) Slug() string {
	return "transcript-extractor"
}

func (t *Tool) Validate(req tools.Request) error {
	if req.URL == "" {
		return tools.NewToolError("INVALID_URL", "Video URL cannot be empty.")
	}
	_, err := urlkit.ExtractVideoID(req.URL)
	if err != nil {
		return tools.NewToolError("INVALID_URL", "That doesn't look like a valid YouTube video URL.")
	}
	lang := req.Options["lang"]
	if lang == "" {
		req.Options["lang"] = "en" // default
	}
	return nil
}

type Result struct {
	Title      string `json:"title"`
	Language   string `json:"language"`
	Transcript string `json:"transcript"`
}

type VideoMeta struct {
	Title string `json:"title"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	// 1. Get video title
	metaRaw, err := t.ytClient.DumpMetadata(ctx, req.URL, false)
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to get video info: "+err.Error())
	}
	var meta VideoMeta
	if err := json.Unmarshal(metaRaw, &meta); err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to parse video info.")
	}

	// 2. Create isolated temp directory
	if err := os.MkdirAll(t.config.TempDir, 0755); err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to initialize temp storage.")
	}
	tempDir, err := os.MkdirTemp(t.config.TempDir, "transcript-*")
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to initialize working directory.")
	}
	defer os.RemoveAll(tempDir)

	lang := req.Options["lang"]
	if lang == "" {
		lang = "en"
	}

	// 3. Download subtitles in VTT format
	vttPath, err := t.ytClient.DownloadSubtitles(ctx, req.URL, lang, "vtt", tempDir)
	if err != nil {
		return nil, tools.NewToolError("RESOURCE_UNAVAILABLE", "No transcript found for language: "+lang)
	}

	// 4. Read VTT file and parse to plain text
	vttBytes, err := os.ReadFile(vttPath)
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to read downloaded transcript.")
	}

	plainText := parseVttToPlainText(string(vttBytes))

	return Result{
		Title:      meta.Title,
		Language:   lang,
		Transcript: plainText,
	}, nil
}

var htmlTagRegex = regexp.MustCompile(`<[^>]*>`)

func parseVttToPlainText(vttContent string) string {
	lines := strings.Split(vttContent, "\n")
	var resultLines []string
	var lastLine string

	for _, line := range lines {
		line = strings.TrimSpace(line)

		// Skip metadata and headers
		if line == "" ||
			strings.HasPrefix(line, "WEBVTT") ||
			strings.HasPrefix(line, "Kind:") ||
			strings.HasPrefix(line, "Language:") ||
			strings.HasPrefix(line, "Style:") ||
			strings.Contains(line, "-->") {
			continue
		}

		// Remove HTML-like styling tags (e.g. <c> or </c> or timestamp tags)
		line = htmlTagRegex.ReplaceAllString(line, "")
		line = strings.TrimSpace(line)

		if line == "" {
			continue
		}

		// Deduplicate consecutive identical lines (common in auto-generated captions)
		if line == lastLine {
			continue
		}

		resultLines = append(resultLines, line)
		lastLine = line
	}

	return strings.Join(resultLines, "\n")
}
