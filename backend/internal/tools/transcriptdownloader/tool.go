package transcriptdownloader

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"
	"youtube-tools/backend/internal/config"
	"youtube-tools/backend/internal/downloads"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/urlkit"
	"youtube-tools/backend/internal/ytdlp"
)

type Tool struct {
	ytClient *ytdlp.Client
	dlStore  *downloads.Store
	config   *config.Config
}

func New(ytClient *ytdlp.Client, dlStore *downloads.Store, cfg *config.Config) *Tool {
	return &Tool{
		ytClient: ytClient,
		dlStore:  dlStore,
		config:   cfg,
	}
}

func (t *Tool) Slug() string {
	return "transcript-downloader"
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
		req.Options["lang"] = "en"
	}
	format := strings.ToLower(req.Options["format"])
	if format != "srt" && format != "vtt" {
		return tools.NewToolError("OPTION_NOT_AVAILABLE", "Subtitle format must be SRT or VTT.")
	}
	return nil
}

type Result struct {
	Title       string `json:"title"`
	Language    string `json:"language"`
	Format      string `json:"format"`
	DownloadUrl string `json:"downloadUrl"`
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

	// 2. Create isolated temp directory (we do NOT delete this immediately because the file must be served)
	// We'll let downloads store handle the file cleanup.
	if err := os.MkdirAll(t.config.TempDir, 0755); err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to initialize temp storage.")
	}
	tempDir, err := os.MkdirTemp(t.config.TempDir, "download-*")
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to create working directory.")
	}

	lang := req.Options["lang"]
	format := strings.ToLower(req.Options["format"])

	// 3. Download subtitles
	vttPath, err := t.ytClient.DownloadSubtitles(ctx, req.URL, lang, format, tempDir)
	if err != nil {
		os.RemoveAll(tempDir) // clean up since it failed
		return nil, tools.NewToolError("RESOURCE_UNAVAILABLE", "No transcript found for language: "+lang)
	}

	// 4. Register subtitle file in download store
	originalName := fmt.Sprintf("transcript-%s.%s", lang, format)
	contentType := "text/plain"
	if format == "srt" {
		contentType = "application/x-subrip"
	} else if format == "vtt" {
		contentType = "text/vtt"
	}

	token, err := t.dlStore.Register(vttPath, originalName, contentType, 15*time.Minute)
	if err != nil {
		slog.Error("Failed to register subtitle download file", "err", err)
		os.RemoveAll(tempDir)
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to register download file.")
	}

	downloadURL := fmt.Sprintf("/api/v1/downloads/%s", token)

	return Result{
		Title:       meta.Title,
		Language:    lang,
		Format:      strings.ToUpper(format),
		DownloadUrl: downloadURL,
	}, nil
}
