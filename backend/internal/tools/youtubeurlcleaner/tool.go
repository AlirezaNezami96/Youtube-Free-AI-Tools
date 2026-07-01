package youtubeurlcleaner

import (
	"context"
	"fmt"
	"net/url"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/urlkit"
)

type Tool struct{}

func New() *Tool {
	return &Tool{}
}

func (t *Tool) Slug() string {
	return "youtube-url-cleaner"
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

type Result struct {
	OriginalUrl string `json:"originalUrl"`
	CleanedUrl  string `json:"cleanedUrl"`
	ShortUrl    string `json:"shortUrl"`
	VideoID     string `json:"videoId"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	videoID, err := urlkit.ExtractVideoID(req.URL)
	if err != nil {
		return nil, tools.NewToolError("INVALID_URL", "Failed to parse video ID.")
	}

	// Reconstruct cleaned URLs
	cleaned := fmt.Sprintf("https://www.youtube.com/watch?v=%s", videoID)
	short := fmt.Sprintf("https://youtu.be/%s", videoID)

	// Keep start time if it was in the original URL
	if u, err := url.Parse(req.URL); err == nil {
		if tParam := u.Query().Get("t"); tParam != "" {
			cleaned = fmt.Sprintf("%s&t=%s", cleaned, tParam)
			short = fmt.Sprintf("%s?t=%s", short, tParam)
		}
	}

	return Result{
		OriginalUrl: req.URL,
		CleanedUrl:  cleaned,
		ShortUrl:    short,
		VideoID:     videoID,
	}, nil
}
