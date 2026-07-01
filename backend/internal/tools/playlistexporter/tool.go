package playlistexporter

import (
	"context"
	"encoding/csv"
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
	return "playlist-exporter"
}

func (t *Tool) Validate(req tools.Request) error {
	if req.URL == "" {
		return tools.NewToolError("INVALID_URL", "Playlist URL cannot be empty.")
	}
	_, err := urlkit.ExtractPlaylistID(req.URL)
	if err != nil {
		return tools.NewToolError("INVALID_URL", "That doesn't look like a valid YouTube playlist URL.")
	}
	format := strings.ToUpper(req.Options["format"])
	if format != "CSV" && format != "JSON" {
		return tools.NewToolError("OPTION_NOT_AVAILABLE", "Export format must be CSV or JSON.")
	}
	return nil
}

type ExportEntry struct {
	Title    string  `json:"title"`
	URL      string  `json:"url"`
	Duration float64 `json:"durationSeconds"`
	Channel  string  `json:"channel"`
}

type Result struct {
	PlaylistTitle string `json:"playlistTitle"`
	VideoCount    int    `json:"videoCount"`
	DownloadUrl   string `json:"downloadUrl"`
	Format        string `json:"format"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	maxItems := t.config.MaxPlaylistSize
	if maxItems <= 0 {
		maxItems = 500
	}

	meta, err := t.ytClient.FetchPlaylistInfo(ctx, req.URL, maxItems)
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to export playlist: "+err.Error())
	}

	format := strings.ToUpper(req.Options["format"])

	// Ensure base temp directory exists, then create an isolated per-request subdir
	if err := os.MkdirAll(t.config.TempDir, 0755); err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to initialize temp storage.")
	}
	tempDir, err := os.MkdirTemp(t.config.TempDir, "playlist-export-*")
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to create working directory.")
	}

	// Build output file path inside the isolated dir
	var originalName, contentType, tempFilePath string
	if format == "JSON" {
		originalName = "playlist-export.json"
		contentType = "application/json"
		tempFilePath = fmt.Sprintf("%s/playlist-export.json", tempDir)
	} else {
		originalName = "playlist-export.csv"
		contentType = "text/csv"
		tempFilePath = fmt.Sprintf("%s/playlist-export.csv", tempDir)
	}

	tempFile, err := os.Create(tempFilePath)
	if err != nil {
		os.RemoveAll(tempDir)
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to create export file.")
	}

	// Prepare data entries
	var entries []ExportEntry
	for _, e := range meta.Entries {
		videoURL := e.Url
		if videoURL == "" && e.ID != "" {
			videoURL = "https://www.youtube.com/watch?v=" + e.ID
		}
		ch := e.Channel
		if ch == "" {
			ch = e.Uploader
		}
		entries = append(entries, ExportEntry{
			Title:    e.Title,
			URL:      videoURL,
			Duration: e.Duration,
			Channel:  ch,
		})
	}

	if format == "JSON" {
		originalName = "playlist-export.json"
		contentType = "application/json"
		encoder := json.NewEncoder(tempFile)
		encoder.SetIndent("", "  ")
		if err := encoder.Encode(entries); err != nil {
			return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to encode JSON export.")
		}
	} else {
		originalName = "playlist-export.csv"
		contentType = "text/csv"
		writer := csv.NewWriter(tempFile)
		// Write header
		writer.Write([]string{"Title", "URL", "Duration (Seconds)", "Channel"})
		for _, e := range entries {
			writer.Write([]string{
				e.Title,
				e.URL,
				fmt.Sprintf("%.1f", e.Duration),
				e.Channel,
			})
		}
		writer.Flush()
		if err := writer.Error(); err != nil {
			tempFile.Close()
			os.RemoveAll(tempDir)
			return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to write CSV export.")
		}
	}
	tempFile.Close()

	// Register file in download store; store.Cleanup removes the file on expiry
	token, err := t.dlStore.Register(tempFilePath, originalName, contentType, 20*time.Minute)
	if err != nil {
		slog.Error("Failed to register download file", "err", err)
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to register export download.")
	}

	downloadURL := fmt.Sprintf("/api/v1/downloads/%s", token)

	return Result{
		PlaylistTitle: meta.Title,
		VideoCount:    len(meta.Entries),
		DownloadUrl:   downloadURL,
		Format:        format,
	}, nil
}
