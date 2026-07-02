package timestampgenerator

import (
	"context"
	"fmt"
	"strings"
	"youtube-tools/backend/internal/timestampkit"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/urlkit"
)

type Tool struct{}

func New() *Tool {
	return &Tool{}
}

func (t *Tool) Slug() string {
	return "timestamp-generator"
}

func (t *Tool) Validate(req tools.Request) error {
	if req.URL == "" {
		return tools.NewToolError("INVALID_URL", "URL cannot be empty.")
	}
	_, err := urlkit.ExtractVideoID(req.URL)
	if err != nil {
		return tools.NewToolError("INVALID_URL", "That doesn't look like a valid YouTube video URL.")
	}
	return nil
}

type LinkEntry struct {
	Time    string `json:"time"`
	Label   string `json:"label"`
	URL     string `json:"url"`
	Seconds int    `json:"seconds"`
}

type Result struct {
	VideoID        string      `json:"videoId"`
	Links          []LinkEntry `json:"links"`
	FormattedBlock string      `json:"formattedBlock"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	videoID, err := urlkit.ExtractVideoID(req.URL)
	if err != nil {
		return nil, tools.NewToolError("INVALID_URL", "Failed to parse video ID.")
	}

	var links []LinkEntry
	var formattedRows []string

	for _, ts := range req.Timestamps {
		// Use shared timestampkit instead of local implementation
		seconds, _ := timestampkit.ParseToSeconds(ts.Time)
		deepLink := fmt.Sprintf("https://youtu.be/%s?t=%d", videoID, seconds)

		links = append(links, LinkEntry{
			Time:    ts.Time,
			Label:   ts.Label,
			URL:     deepLink,
			Seconds: seconds,
		})

		formattedRows = append(formattedRows, fmt.Sprintf("%s %s", ts.Time, ts.Label))
	}

	formattedBlock := strings.Join(formattedRows, "\n")

	return Result{
		VideoID:        videoID,
		Links:          links,
		FormattedBlock: formattedBlock,
	}, nil
}
