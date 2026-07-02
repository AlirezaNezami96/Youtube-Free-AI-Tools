// Package shortsurlconverter converts a YouTube video URL into all four
// canonical format variants. Pure computation — no yt-dlp call required.
package shortsurlconverter

import (
	"context"
	"fmt"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/urlkit"
)

type Tool struct{}

func New() *Tool { return &Tool{} }

func (t *Tool) Slug() string { return "shorts-url-converter" }

func (t *Tool) Validate(req tools.Request) error {
	if req.URL == "" {
		return tools.NewToolError("INVALID_URL", "Video URL cannot be empty.")
	}
	if _, err := urlkit.ExtractVideoID(req.URL); err != nil {
		return tools.NewToolError("INVALID_URL", "That doesn't look like a valid YouTube video URL or Shorts URL.")
	}
	return nil
}

type URLVariant struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

type Result struct {
	VideoID  string       `json:"videoId"`
	Variants []URLVariant `json:"variants"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	videoID, err := urlkit.ExtractVideoID(req.URL)
	if err != nil {
		return nil, tools.NewToolError("INVALID_URL", "Failed to extract video ID.")
	}

	variants := []URLVariant{
		{Label: "Standard Watch URL", URL: fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)},
		{Label: "Short URL (youtu.be)", URL: fmt.Sprintf("https://youtu.be/%s", videoID)},
		{Label: "Shorts URL", URL: fmt.Sprintf("https://www.youtube.com/shorts/%s", videoID)},
		{Label: "Embed URL", URL: fmt.Sprintf("https://www.youtube.com/embed/%s", videoID)},
	}

	return Result{
		VideoID:  videoID,
		Variants: variants,
	}, nil
}
