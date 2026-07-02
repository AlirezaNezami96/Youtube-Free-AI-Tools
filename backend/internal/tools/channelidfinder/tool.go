package channelidfinder

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"
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
	return "channel-rss-feed-generator"
}

func (t *Tool) Validate(req tools.Request) error {
	if req.URL == "" {
		return tools.NewToolError("INVALID_URL", "Channel URL or identifier cannot be empty.")
	}
	_, _, _, err := urlkit.ExtractChannelValue(req.URL)
	if err != nil {
		return tools.NewToolError("INVALID_URL", "That doesn't look like a valid YouTube channel URL or handle.")
	}
	return nil
}

type YtChannelMetadata struct {
	ChannelID string `json:"channel_id"`
	Channel   string `json:"channel"`
	Title     string `json:"title"`
}

type Result struct {
	ChannelID   string `json:"channelId"`
	ChannelName string `json:"channelName"`
	RssUrl      string `json:"rssUrl"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	// Construct canonical channel URL if not already
	val, isID, isHandle, err := urlkit.ExtractChannelValue(req.URL)
	if err != nil {
		return nil, tools.NewToolError("INVALID_URL", "Failed to parse channel identifier.")
	}

	targetURL := req.URL
	if isID {
		targetURL = fmt.Sprintf("https://www.youtube.com/channel/%s", val)
	} else if isHandle {
		targetURL = fmt.Sprintf("https://www.youtube.com/%s", val)
	}

	// We'll use DumpMetadata with flat=true to retrieve channel page overview quickly.
	// Note: flat=true on a playlist/channel returns newline-separated JSON lines (one per entry).
	raw, err := t.ytClient.DumpMetadata(ctx, targetURL, true)
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to resolve channel ID: "+err.Error())
	}

	// Split output into JSON lines
	lines := strings.Split(string(raw), "\n")
	var channelID, channelName string

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		// Try unmarshaling this line
		var entry struct {
			ChannelID  string `json:"channel_id"`
			Channel    string `json:"channel"`
			Title      string `json:"title"`
			UploaderID string `json:"uploader_id"`
			Uploader   string `json:"uploader"`
		}

		if err := json.Unmarshal([]byte(line), &entry); err == nil {
			// Find the first line containing channel information
			id := entry.ChannelID
			if id == "" {
				id = entry.UploaderID
			}
			name := entry.Channel
			if name == "" {
				name = entry.Uploader
			}
			if name == "" {
				name = entry.Title
			}

			if id != "" {
				channelID = id
				channelName = name
				break
			}
		}
	}

	if channelID == "" {
		return nil, tools.NewToolError("RESOURCE_UNAVAILABLE", "Could not locate a channel ID for this resource.")
	}

	rss := fmt.Sprintf("https://www.youtube.com/feeds/videos.xml?channel_id=%s", channelID)

	return Result{
		ChannelID:   channelID,
		ChannelName: channelName,
		RssUrl:      rss,
	}, nil
}
