// Package videodurationcalculator fetches per-video durations for multiple videos
// and totals them with playback speed adjustments.
package videodurationcalculator

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sync"
	"youtube-tools/backend/internal/durationkit"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/urlkit"
	"youtube-tools/backend/internal/ytdlp"
)

const maxURLs = 25
const bulkConcurrency = 4

type Tool struct {
	ytClient *ytdlp.Client
}

func New(ytClient *ytdlp.Client) *Tool {
	return &Tool{ytClient: ytClient}
}

func (t *Tool) Slug() string { return "video-duration-calculator" }

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
	return nil
}

type VideoEntry struct {
	Index       int    `json:"index"`
	VideoID     string `json:"videoId"`
	Title       string `json:"title"`
	Seconds     int    `json:"seconds"`
	DurationFmt string `json:"durationFmt"`
	Error       string `json:"error,omitempty"`
}

type Result struct {
	Videos       []VideoEntry      `json:"videos"`
	TotalSeconds int               `json:"totalSeconds"`
	TotalFmt     string            `json:"totalFmt"`
	AtSpeed      map[string]string `json:"atSpeed"`
	Count        int               `json:"count"`
}

type ytDuration struct {
	Title    string  `json:"title"`
	Duration float64 `json:"duration"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	urls := req.URLs
	if len(urls) > maxURLs {
		urls = urls[:maxURLs]
	}

	entries := make([]VideoEntry, len(urls))
	sem := make(chan struct{}, bulkConcurrency)
	var wg sync.WaitGroup

	for i, u := range urls {
		wg.Add(1)
		go func(idx int, videoURL string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			entry := VideoEntry{Index: idx + 1}
			vid, err := urlkit.ExtractVideoID(videoURL)
			if err != nil {
				entry.Error = "Invalid URL"
				entries[idx] = entry
				return
			}
			entry.VideoID = vid

			raw, err := t.ytClient.DumpMetadata(ctx, videoURL, false)
			if err != nil {
				entry.Error = "Failed to fetch metadata"
				entries[idx] = entry
				return
			}

			var yt ytDuration
			if err := json.Unmarshal(raw, &yt); err != nil {
				entry.Error = "Failed to parse response"
				entries[idx] = entry
				return
			}

			secs := int(math.Round(yt.Duration))
			entry.Title = yt.Title
			entry.Seconds = secs
			entry.DurationFmt = durationkit.FormatDuration(secs)
			entries[idx] = entry
		}(i, u)
	}
	wg.Wait()

	total := 0
	for _, e := range entries {
		total += e.Seconds
	}

	return Result{
		Videos:       entries,
		TotalSeconds: total,
		TotalFmt:     durationkit.FormatDuration(total),
		AtSpeed:      durationkit.SpeedAdjusted(total, durationkit.DefaultSpeeds()),
		Count:        len(entries),
	}, nil
}
