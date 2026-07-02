// Package bulkmetadataextractor fetches metadata for multiple YouTube videos
// concurrently, with a hard cap of 25 URLs and internal concurrency limit.
package bulkmetadataextractor

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"sync"
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

func (t *Tool) Slug() string { return "bulk-metadata-extractor" }

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

type VideoMeta struct {
	Index      int    `json:"index"`
	VideoID    string `json:"videoId"`
	Title      string `json:"title"`
	Channel    string `json:"channel"`
	UploadDate string `json:"uploadDate"`
	Duration   int    `json:"duration"`
	DurationFmt string `json:"durationFmt"`
	ViewCount  int64  `json:"viewCount"`
	LikeCount  int64  `json:"likeCount"`
	URL        string `json:"url"`
	Error      string `json:"error,omitempty"`
}

type Result struct {
	Videos []VideoMeta `json:"videos"`
	Count  int         `json:"count"`
}

type ytMeta struct {
	Title      string   `json:"title"`
	Channel    string   `json:"channel"`
	Uploader   string   `json:"uploader"`
	UploadDate string   `json:"upload_date"`
	Duration   float64  `json:"duration"`
	ViewCount  int64    `json:"view_count"`
	LikeCount  int64    `json:"like_count"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	urls := req.URLs
	if len(urls) > maxURLs {
		urls = urls[:maxURLs]
	}

	results := make([]VideoMeta, len(urls))
	// Per-request semaphore — separate from the global ytdlp semaphore
	sem := make(chan struct{}, bulkConcurrency)
	var wg sync.WaitGroup

	for i, u := range urls {
		wg.Add(1)
		go func(idx int, videoURL string) {
			defer wg.Done()
			sem <- struct{}{}
			defer func() { <-sem }()

			meta := VideoMeta{Index: idx + 1, URL: videoURL}
			vid, err := urlkit.ExtractVideoID(videoURL)
			if err != nil {
				meta.Error = "Invalid URL"
				results[idx] = meta
				return
			}
			meta.VideoID = vid

			raw, err := t.ytClient.DumpMetadata(ctx, videoURL, false)
			if err != nil {
				meta.Error = "Failed to fetch metadata"
				results[idx] = meta
				return
			}

			var yt ytMeta
			if err := json.Unmarshal(raw, &yt); err != nil {
				meta.Error = "Failed to parse metadata"
				results[idx] = meta
				return
			}

			channel := yt.Channel
			if channel == "" {
				channel = yt.Uploader
			}
			uploadDate := yt.UploadDate
			if len(uploadDate) == 8 {
				uploadDate = uploadDate[0:4] + "-" + uploadDate[4:6] + "-" + uploadDate[6:8]
			}
			durSecs := int(math.Round(yt.Duration))

			meta.Title = yt.Title
			meta.Channel = channel
			meta.UploadDate = uploadDate
			meta.Duration = durSecs
			meta.DurationFmt = formatDuration(durSecs)
			meta.ViewCount = yt.ViewCount
			meta.LikeCount = yt.LikeCount
			results[idx] = meta
		}(i, u)
	}

	wg.Wait()

	return Result{
		Videos: results,
		Count:  len(results),
	}, nil
}

func formatDuration(secs int) string {
	if secs <= 0 {
		return "0s"
	}
	h := secs / 3600
	m := (secs % 3600) / 60
	s := secs % 60
	if h > 0 {
		return fmt.Sprintf("%dh %dm %ds", h, m, s)
	}
	if m > 0 {
		return fmt.Sprintf("%dm %ds", m, s)
	}
	return fmt.Sprintf("%ds", s)
}

// csvExport formats the result as a simple CSV string (used by the frontend).
func csvExport(videos []VideoMeta) string {
	var sb strings.Builder
	sb.WriteString("Index,Title,Channel,Upload Date,Duration (s),Duration,Views,Likes,Video ID,URL\n")
	for _, v := range videos {
		title := strings.ReplaceAll(v.Title, "\"", "\"\"")
		channel := strings.ReplaceAll(v.Channel, "\"", "\"\"")
		sb.WriteString(fmt.Sprintf("%d,\"%s\",\"%s\",%s,%d,%s,%d,%d,%s,%s\n",
			v.Index, title, channel, v.UploadDate, v.Duration, v.DurationFmt,
			v.ViewCount, v.LikeCount, v.VideoID, v.URL))
	}
	return sb.String()
}
