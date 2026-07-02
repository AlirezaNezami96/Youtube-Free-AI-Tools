// Package thumbnailpreview resolves CDN thumbnail URLs per resolution for a video,
// without downloading. The actual image rendering happens entirely client-side.
package thumbnailpreview

import (
	"context"
	"fmt"
	"net/http"
	"time"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/urlkit"
)

type Tool struct{}

func New() *Tool { return &Tool{} }

func (t *Tool) Slug() string { return "thumbnail-preview" }

func (t *Tool) Validate(req tools.Request) error {
	if req.URL == "" {
		return tools.NewToolError("INVALID_URL", "Video URL cannot be empty.")
	}
	if _, err := urlkit.ExtractVideoID(req.URL); err != nil {
		return tools.NewToolError("INVALID_URL", "That doesn't look like a valid YouTube video URL.")
	}
	return nil
}

type ResolutionURL struct {
	Key       string `json:"key"`
	Label     string `json:"label"`
	URL       string `json:"url"`
	Available bool   `json:"available"`
}

type Result struct {
	VideoID      string          `json:"videoId"`
	Resolutions  []ResolutionURL `json:"resolutions"`
	BestAvailURL string          `json:"bestAvailUrl"`
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
		return nil, tools.NewToolError("INVALID_URL", "Failed to extract video ID.")
	}

	client := &http.Client{Timeout: 5 * time.Second}
	var resolutions []ResolutionURL
	bestAvail := ""

	for _, tier := range resolutionTiers {
		cdnURL := fmt.Sprintf("https://img.youtube.com/vi/%s/%s", videoID, tier.FileName)
		available := false

		reqHead, err := http.NewRequestWithContext(ctx, "HEAD", cdnURL, nil)
		if err == nil {
			resp, err := client.Do(reqHead)
			if err == nil {
				resp.Body.Close()
				available = resp.StatusCode == http.StatusOK
			}
		}

		if available && bestAvail == "" {
			bestAvail = cdnURL
		}

		resolutions = append(resolutions, ResolutionURL{
			Key:       tier.Key,
			Label:     tier.Label,
			URL:       cdnURL,
			Available: available,
		})
	}

	if bestAvail == "" {
		// Fallback — standard is always available
		bestAvail = fmt.Sprintf("https://img.youtube.com/vi/%s/default.jpg", videoID)
	}

	return Result{
		VideoID:      videoID,
		Resolutions:  resolutions,
		BestAvailURL: bestAvail,
	}, nil
}
