// Package bulkthumbnaildownloader downloads thumbnails for multiple videos,
// provides individual download tokens, and bundles a zip archive via the
// downloads store. Zip-slip prevention: filenames derived only from video IDs.
package bulkthumbnaildownloader

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"sync"
	"time"
	"youtube-tools/backend/internal/config"
	"youtube-tools/backend/internal/downloads"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/urlkit"
)

const maxURLs = 25
const bulkConcurrency = 4

type Tool struct {
	dlStore *downloads.Store
	config  *config.Config
}

func New(dlStore *downloads.Store, cfg *config.Config) *Tool {
	return &Tool{dlStore: dlStore, config: cfg}
}

func (t *Tool) Slug() string { return "bulk-thumbnail-downloader" }

func (t *Tool) Validate(req tools.Request) error {
	if len(req.URLs) == 0 {
		return tools.NewToolError("INVALID_INPUT", "At least one URL is required.")
	}
	if len(req.URLs) > maxURLs {
		return tools.NewToolError("TOO_MANY_URLS", fmt.Sprintf("Maximum %d URLs allowed per request.", maxURLs))
	}
	for i, u := range req.URLs {
		if _, err := urlkit.ExtractVideoID(u); err != nil {
			return tools.NewToolError("INVALID_URL", fmt.Sprintf("URL at position %d is not a valid YouTube video URL.", i+1))
		}
	}
	res := req.Options["resolution"]
	if res != "" && res != "max" && res != "high" && res != "medium" && res != "standard" {
		return tools.NewToolError("OPTION_NOT_AVAILABLE", "Resolution must be 'max', 'high', 'medium', or 'standard'.")
	}
	return nil
}

type ThumbnailResult struct {
	Index       int    `json:"index"`
	VideoID     string `json:"videoId"`
	PreviewURL  string `json:"previewUrl"`
	DownloadURL string `json:"downloadUrl"`
	Resolution  string `json:"resolution"`
	Error       string `json:"error,omitempty"`
}

type Result struct {
	Thumbnails  []ThumbnailResult `json:"thumbnails"`
	ZipURL      string            `json:"zipUrl"`
	Count       int               `json:"count"`
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
	urls := req.URLs
	if len(urls) > maxURLs {
		urls = urls[:maxURLs]
	}

	resolution := req.Options["resolution"]
	if resolution == "" {
		resolution = "max"
	}

	if err := os.MkdirAll(t.config.TempDir, 0755); err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to initialize temp storage.")
	}
	tempDir, err := os.MkdirTemp(t.config.TempDir, "bulkthumb-*")
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to create working directory.")
	}

	results := make([]ThumbnailResult, len(urls))
	sem := make(chan struct{}, bulkConcurrency)
	var wg sync.WaitGroup

	for i, u := range urls {
		wg.Add(1)
		go func(idx int, videoURL string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			entry := ThumbnailResult{Index: idx + 1}
			vid, err := urlkit.ExtractVideoID(videoURL)
			if err != nil {
				entry.Error = "Invalid URL"
				results[idx] = entry
				return
			}
			entry.VideoID = vid

			// Find best available resolution from requested tier downward
			startIdx := 0
			for i, tier := range resolutionTiers {
				if tier.Key == resolution {
					startIdx = i
					break
				}
			}

			httpClient := &http.Client{Timeout: 5 * time.Second}
			var finalURL, deliveredLabel string

			for i := startIdx; i < len(resolutionTiers); i++ {
				tier := resolutionTiers[i]
				testURL := fmt.Sprintf("https://img.youtube.com/vi/%s/%s", vid, tier.FileName)
				reqHead, err := http.NewRequestWithContext(ctx, "HEAD", testURL, nil)
				if err != nil {
					continue
				}
				resp, err := httpClient.Do(reqHead)
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

			if finalURL == "" {
				tier := resolutionTiers[len(resolutionTiers)-1]
				finalURL = fmt.Sprintf("https://img.youtube.com/vi/%s/%s", vid, tier.FileName)
				deliveredLabel = tier.Label
			}

			// Download thumbnail to temp dir
			// Safe filename: derived only from validated video ID — zip-slip safe.
			safeFileName := fmt.Sprintf("%s.jpg", vid)
			filePath := fmt.Sprintf("%s/%s", tempDir, safeFileName)

			reqGet, err := http.NewRequestWithContext(ctx, "GET", finalURL, nil)
			if err != nil {
				entry.Error = "Failed to build download request"
				entry.PreviewURL = finalURL
				results[idx] = entry
				return
			}

			resp, err := httpClient.Do(reqGet)
			if err != nil || resp.StatusCode != http.StatusOK {
				if resp != nil {
					resp.Body.Close()
				}
				entry.Error = "Failed to download thumbnail from CDN"
				entry.PreviewURL = finalURL
				results[idx] = entry
				return
			}

			f, err := os.Create(filePath)
			if err != nil {
				resp.Body.Close()
				entry.Error = "Failed to write thumbnail to disk"
				entry.PreviewURL = finalURL
				results[idx] = entry
				return
			}
			io.Copy(f, resp.Body)
			f.Close()
			resp.Body.Close()

			// Register individual download
			token, err := t.dlStore.Register(filePath, safeFileName, "image/jpeg", 30*time.Minute)
			if err != nil {
				slog.Error("Failed to register bulk thumbnail download", "vid", vid, "err", err)
				entry.Error = "Failed to register download"
				entry.PreviewURL = finalURL
				results[idx] = entry
				return
			}

			entry.PreviewURL = finalURL
			entry.DownloadURL = fmt.Sprintf("/api/v1/downloads/%s", token)
			entry.Resolution = deliveredLabel
			results[idx] = entry
		}(i, u)
	}
	wg.Wait()

	// Build zip archive from successfully downloaded files
	var namedFiles []downloads.NamedFile
	for _, r := range results {
		if r.Error == "" && r.VideoID != "" {
			safeFileName := fmt.Sprintf("%s.jpg", r.VideoID) // derived from validated video ID
			filePath := fmt.Sprintf("%s/%s", tempDir, safeFileName)
			if _, err := os.Stat(filePath); err == nil {
				namedFiles = append(namedFiles, downloads.NamedFile{
					Path:     filePath,
					SafeName: safeFileName,
				})
			}
		}
	}

	zipURL := ""
	if len(namedFiles) > 0 {
		zipToken, err := t.dlStore.BundleAsZip(namedFiles, "thumbnails.zip", tempDir, 30*time.Minute)
		if err != nil {
			slog.Error("Failed to bundle thumbnails into zip", "err", err)
		} else {
			zipURL = fmt.Sprintf("/api/v1/downloads/%s", zipToken)
		}
	}

	return Result{
		Thumbnails: results,
		ZipURL:     zipURL,
		Count:      len(results),
	}, nil
}
