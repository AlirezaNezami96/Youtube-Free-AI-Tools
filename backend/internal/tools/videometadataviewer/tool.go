package videometadataviewer

import (
	"context"
	"encoding/json"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/urlkit"
	"youtube-tools/backend/internal/ytdlp"
)

type Tool struct {
	ytClient *ytdlp.Client
}

func New(ytClient *ytdlp.Client) *Tool {
	return &Tool{ytClient: ytClient}
}

func (t *Tool) Slug() string {
	return "video-metadata-viewer"
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

type YtMetadata struct {
	Title       string   `json:"title"`
	Uploader    string   `json:"uploader"`
	Channel     string   `json:"channel"`
	UploadDate  string   `json:"upload_date"`
	ViewCount   int64    `json:"view_count"`
	LikeCount   int64    `json:"like_count"`
	Duration    float64  `json:"duration"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	Thumbnail   string   `json:"thumbnail"`
}

type Result struct {
	Title       string   `json:"title"`
	Channel     string   `json:"channel"`
	UploadDate  string   `json:"uploadDate"`
	ViewCount   int64    `json:"viewCount"`
	LikeCount   int64    `json:"likeCount"`
	Duration    float64  `json:"duration"`
	Description string   `json:"description"`
	Tags        []string `json:"tags"`
	Thumbnail   string   `json:"thumbnail"`
	RawJSON     string   `json:"rawJson,omitempty"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	raw, err := t.ytClient.DumpMetadata(ctx, req.URL, false)
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to retrieve video metadata: "+err.Error())
	}

	var meta YtMetadata
	if err := json.Unmarshal(raw, &meta); err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to parse video metadata: "+err.Error())
	}

	channelName := meta.Channel
	if channelName == "" {
		channelName = meta.Uploader
	}

	res := Result{
		Title:       meta.Title,
		Channel:     channelName,
		UploadDate:  formatUploadDate(meta.UploadDate),
		ViewCount:   meta.ViewCount,
		LikeCount:   meta.LikeCount,
		Duration:    meta.Duration,
		Description: meta.Description,
		Tags:        meta.Tags,
		Thumbnail:   meta.Thumbnail,
	}

	if req.Options["raw"] == "true" {
		res.RawJSON = string(raw)
	}

	return res, nil
}

func formatUploadDate(raw string) string {
	if len(raw) == 8 {
		// YYYYMMDD -> YYYY-MM-DD
		return raw[0:4] + "-" + raw[4:6] + "-" + raw[6:8]
	}
	return raw
}
