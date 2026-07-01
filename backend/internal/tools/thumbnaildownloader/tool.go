package thumbnaildownloader

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
	"youtube-tools/backend/internal/config"
	"youtube-tools/backend/internal/downloads"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/urlkit"
)

type Tool struct {
	dlStore *downloads.Store
	config  *config.Config
}

func New(dlStore *downloads.Store, cfg *config.Config) *Tool {
	return &Tool{
		dlStore: dlStore,
		config:  cfg,
	}
}

func (t *Tool) Slug() string {
	return "thumbnail-downloader"
}

func (t *Tool) Validate(req tools.Request) error {
	if req.URL == "" {
		return tools.NewToolError("INVALID_URL", "Video URL cannot be empty.")
	}
	_, err := urlkit.ExtractVideoID(req.URL)
	if err != nil {
		return tools.NewToolError("INVALID_URL", "That doesn't look like a valid YouTube video URL.")
	}
	res := req.Options["resolution"]
	if res != "max" && res != "high" && res != "medium" && res != "standard" {
		return tools.NewToolError("OPTION_NOT_AVAILABLE", "Resolution must be 'max', 'high', 'medium', or 'standard'.")
	}
	return nil
}

type Result struct {
	VideoID            string `json:"videoId"`
	RequestedResolution string `json:"requestedResolution"`
	DeliveredResolution string `json:"deliveredResolution"`
	PreviewUrl         string `json:"previewUrl"`
	DownloadUrl        string `json:"downloadUrl"`
}

var resolutionTiers = []struct {
	Key      string
	FileName string
	Label    string
}{
	{"max", "maxresdefault.jpg", "Max (1280×720)"},
	{"high", "hqdefault.jpg", "High (480×360)"},
	{"medium", "mqdefault.jpg", "Medium (320×180)"},
	{"standard", "default.jpg", "Standard (120×90)"},
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	videoID, err := urlkit.ExtractVideoID(req.URL)
	if err != nil {
		return nil, tools.NewToolError("INVALID_URL", "Failed to parse video ID.")
	}

	requestedRes := req.Options["resolution"]
	startIndex := 0
	for i, tier := range resolutionTiers {
		if tier.Key == requestedRes {
			startIndex = i
			break
		}
	}

	client := &http.Client{Timeout: 5 * time.Second}
	var finalURL string
	var deliveredLabel string

	// Iterate down the tiers to find the first one that exists (returns 200 OK)
	for i := startIndex; i < len(resolutionTiers); i++ {
		tier := resolutionTiers[i]
		testURL := fmt.Sprintf("https://img.youtube.com/vi/%s/%s", videoID, tier.FileName)

		// Create head request
		reqHead, err := http.NewRequestWithContext(ctx, "HEAD", testURL, nil)
		if err != nil {
			continue
		}

		resp, err := client.Do(reqHead)
		if err == nil && resp.StatusCode == http.StatusOK {
			resp.Body.Close()
			finalURL = testURL
			deliveredLabel = tier.Label
			break
		}
		if resp != nil {
			resp.Body.Close()
		}
	}

	// Fallback to default if all else fails
	if finalURL == "" {
		tier := resolutionTiers[len(resolutionTiers)-1] // standard
		finalURL = fmt.Sprintf("https://img.youtube.com/vi/%s/%s", videoID, tier.FileName)
		deliveredLabel = tier.Label
	}

	// Download image to serve as a local file download
	reqGet, err := http.NewRequestWithContext(ctx, "GET", finalURL, nil)
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to initialize download request.")
	}
	resp, err := client.Do(reqGet)
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to reach YouTube image CDN.")
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, tools.NewToolError("RESOURCE_UNAVAILABLE", "Failed to download image from YouTube CDN.")
	}

	// Create per-request isolated temp directory
	if err := os.MkdirAll(t.config.TempDir, 0755); err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to initialize temp storage.")
	}
	tempDir, err := os.MkdirTemp(t.config.TempDir, "thumbnail-*")
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to create working directory.")
	}
	// tempDir is cleaned up by the download store expiry worker once the token expires

	tempFilePath := fmt.Sprintf("%s/thumbnail.jpg", tempDir)
	tempFile, err := os.Create(tempFilePath)
	if err != nil {
		os.RemoveAll(tempDir)
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to cache image locally.")
	}

	if _, err := io.Copy(tempFile, resp.Body); err != nil {
		tempFile.Close()
		os.RemoveAll(tempDir)
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to write image data.")
	}
	tempFile.Close()

	// Register in store; store.Cleanup will remove the file (and its parent dir) on expiry
	fileName := fmt.Sprintf("thumbnail-%s.jpg", videoID)
	token, err := t.dlStore.Register(tempFilePath, fileName, "image/jpeg", 20*time.Minute)
	if err != nil {
		slog.Error("Failed to register thumbnail download", "err", err)
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to register download.")
	}

	downloadURL := fmt.Sprintf("/api/v1/downloads/%s", token)

	return Result{
		VideoID:             videoID,
		RequestedResolution: strings.Title(requestedRes),
		DeliveredResolution: deliveredLabel,
		PreviewUrl:          finalURL,
		DownloadUrl:         downloadURL,
	}, nil
}
