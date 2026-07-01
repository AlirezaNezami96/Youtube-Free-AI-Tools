package playlistdurationcalculator

import (
	"context"
	"fmt"
	"math"
	"youtube-tools/backend/internal/config"
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

type Result struct {
	PlaylistTitle string            `json:"playlistTitle"`
	VideoCount    int               `json:"videoCount"`
	TotalSeconds  int               `json:"totalSeconds"`
	Formatted     string            `json:"formatted"`
	AtSpeed       map[string]string `json:"atSpeed"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	// Fetch playlist flat info, capped at config MaxPlaylistSize
	maxItems := t.config.MaxPlaylistSize
	if maxItems <= 0 {
		maxItems = 500
	}

	meta, err := t.ytClient.FetchPlaylistInfo(ctx, req.URL, maxItems)
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to calculate playlist duration: "+err.Error())
	}

	totalSeconds := 0.0
	for _, entry := range meta.Entries {
		totalSeconds += entry.Duration
	}

	totalSecsInt := int(math.Round(totalSeconds))
	formatted := formatDuration(totalSecsInt)

	speeds := []float64{1.25, 1.5, 2.0}
	atSpeed := make(map[string]string)
	for _, speed := range speeds {
		secsAtSpeed := int(math.Round(totalSeconds / speed))
		speedStr := fmt.Sprintf("%.2g", speed) // "1.25", "1.5", "2"
		atSpeed[speedStr] = formatDuration(secsAtSpeed)
	}

	return Result{
		PlaylistTitle: meta.Title,
		VideoCount:    len(meta.Entries),
		TotalSeconds:  totalSecsInt,
		Formatted:     formatted,
		AtSpeed:       atSpeed,
	}, nil
}

func formatDuration(totalSeconds int) string {
	if totalSeconds <= 0 {
		return "0s"
	}
	hours := totalSeconds / 3600
	minutes := (totalSeconds % 3600) / 60
	seconds := totalSeconds % 60

	if hours > 0 {
		return fmt.Sprintf("%dh %dm %ds", hours, minutes, seconds)
	}
	if minutes > 0 {
		return fmt.Sprintf("%dm %ds", minutes, seconds)
	}
	return fmt.Sprintf("%ds", seconds)
}
