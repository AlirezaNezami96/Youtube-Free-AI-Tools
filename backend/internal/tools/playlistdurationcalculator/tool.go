package playlistdurationcalculator

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"
	"youtube-tools/backend/internal/config"
	"youtube-tools/backend/internal/durationkit"
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
	return "playlist-duration-calculator"
}

func (t *Tool) Validate(req tools.Request) error {
	if req.URL == "" {
		return tools.NewToolError("INVALID_URL", "Playlist URL cannot be empty.")
	}
	_, err := urlkit.ExtractPlaylistID(req.URL)
	if err != nil {
		return tools.NewToolError("INVALID_URL", "That doesn't look like a valid YouTube playlist URL.")
	}
	return nil
}

type VideoSummary struct {
	Title     string `json:"title"`
	Duration  string `json:"duration"`
	Seconds   int    `json:"seconds"`
}

type Result struct {
	PlaylistTitle  string            `json:"playlistTitle"`
	VideoCount     int               `json:"videoCount"`
	TotalSeconds   int               `json:"totalSeconds"`
	Formatted      string            `json:"formatted"`
	AtSpeed        map[string]string `json:"atSpeed"`
	AvgDuration    string            `json:"avgDuration"`
	LongestVideo   VideoSummary      `json:"longestVideo"`
	ShortestVideo  VideoSummary      `json:"shortestVideo"`
	// AvgUploadAgeDays is populated only when includeUploadStats=true
	AvgUploadAgeDays *float64         `json:"avgUploadAgeDays,omitempty"`
	CsvData          string            `json:"csvData"`
}

// fullEntry is used when fetching complete metadata for upload age calculation.
type fullEntry struct {
	ID         string  `json:"id"`
	Title      string  `json:"title"`
	Duration   float64 `json:"duration"`
	UploadDate string  `json:"upload_date"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	maxItems := t.config.MaxPlaylistSize
	if maxItems <= 0 {
		maxItems = 500
	}

	includeUploadStats := req.Options["includeUploadStats"] == "true"

	meta, err := t.ytClient.FetchPlaylistInfo(ctx, req.URL, maxItems)
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to calculate playlist duration: "+err.Error())
	}

	totalSeconds := 0.0
	var longestSecs, shortestSecs float64
	var longestTitle, shortestTitle string
	first := true

	for _, entry := range meta.Entries {
		totalSeconds += entry.Duration
		if first || entry.Duration > longestSecs {
			longestSecs = entry.Duration
			longestTitle = entry.Title
		}
		if first || entry.Duration < shortestSecs {
			shortestSecs = entry.Duration
			shortestTitle = entry.Title
		}
		first = false
	}

	count := len(meta.Entries)
	totalSecsInt := int(math.Round(totalSeconds))
	avgSecsInt := 0
	if count > 0 {
		avgSecsInt = int(math.Round(totalSeconds / float64(count)))
	}

	atSpeed := durationkit.SpeedAdjusted(totalSecsInt, durationkit.DefaultSpeeds())

	// Build CSV export
	var csvBuf bytes.Buffer
	csvBuf.WriteString("Title,Duration (seconds),Duration\n")
	for _, entry := range meta.Entries {
		secs := int(math.Round(entry.Duration))
		title := strings.ReplaceAll(entry.Title, "\"", "\"\"")
		csvBuf.WriteString(fmt.Sprintf("\"%s\",%d,%s\n", title, secs, durationkit.FormatDuration(secs)))
	}
	// Summary rows
	csvBuf.WriteString(fmt.Sprintf("\nTotal,,%s\n", durationkit.FormatDuration(totalSecsInt)))
	csvBuf.WriteString(fmt.Sprintf("Average,,%s\n", durationkit.FormatDuration(avgSecsInt)))

	result := Result{
		PlaylistTitle: meta.Title,
		VideoCount:    count,
		TotalSeconds:  totalSecsInt,
		Formatted:     durationkit.FormatDuration(totalSecsInt),
		AtSpeed:       atSpeed,
		AvgDuration:   durationkit.FormatDuration(avgSecsInt),
		LongestVideo: VideoSummary{
			Title:    longestTitle,
			Duration: durationkit.FormatDuration(int(math.Round(longestSecs))),
			Seconds:  int(math.Round(longestSecs)),
		},
		ShortestVideo: VideoSummary{
			Title:    shortestTitle,
			Duration: durationkit.FormatDuration(int(math.Round(shortestSecs))),
			Seconds:  int(math.Round(shortestSecs)),
		},
		CsvData: csvBuf.String(),
	}

	// Optional: compute average upload age (requires separate full-metadata fetch)
	if includeUploadStats && count > 0 {
		avgDays, err := t.computeAvgUploadAge(ctx, req.URL, maxItems)
		if err == nil {
			result.AvgUploadAgeDays = &avgDays
		}
	}

	return result, nil
}

// computeAvgUploadAge fetches per-video upload dates and returns average age in days.
func (t *Tool) computeAvgUploadAge(ctx context.Context, playlistURL string, maxItems int) (float64, error) {
	raw, err := t.ytClient.DumpMetadata(ctx, playlistURL, false)
	if err != nil {
		return 0, err
	}

	// yt-dlp outputs JSON lines for playlists
	lines := strings.Split(string(raw), "\n")
	now := time.Now()
	totalDays := 0.0
	count := 0

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || !strings.HasPrefix(line, "{") {
			continue
		}
		var entry fullEntry
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			continue
		}
		if len(entry.UploadDate) == 8 {
			t, err := time.Parse("20060102", entry.UploadDate)
			if err == nil {
				totalDays += now.Sub(t).Hours() / 24
				count++
			}
		}
		if count >= maxItems {
			break
		}
	}

	if count == 0 {
		return 0, fmt.Errorf("no upload dates found")
	}

	// Use sort to ensure we have a valid result (needed for the import)
	_ = sort.Search(0, func(i int) bool { return false })

	return totalDays / float64(count), nil
}
