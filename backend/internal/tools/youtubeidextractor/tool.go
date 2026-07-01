package youtubeidextractor

import (
	"context"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/urlkit"
)

type Tool struct{}

func New() *Tool {
	return &Tool{}
}

func (t *Tool) Slug() string {
	return "youtube-id-extractor"
}

func (t *Tool) Validate(req tools.Request) error {
	if req.URL == "" {
		return tools.NewToolError("INVALID_URL", "URL cannot be empty.")
	}
	return nil
}

type Result struct {
	VideoID      string `json:"videoId,omitempty"`
	PlaylistID   string `json:"playlistId,omitempty"`
	ChannelValue string `json:"channelValue,omitempty"`
	ChannelType  string `json:"channelType,omitempty"` // "id", "handle", "custom/name"
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	var res Result

	// Try extracting video ID
	if vID, err := urlkit.ExtractVideoID(req.URL); err == nil {
		res.VideoID = vID
	}

	// Try extracting playlist ID
	if pID, err := urlkit.ExtractPlaylistID(req.URL); err == nil {
		res.PlaylistID = pID
	}

	// Try extracting channel ID/handle
	if cVal, isID, isHandle, err := urlkit.ExtractChannelValue(req.URL); err == nil {
		res.ChannelValue = cVal
		if isID {
			res.ChannelType = "id"
		} else if isHandle {
			res.ChannelType = "handle"
		} else {
			res.ChannelType = "username"
		}
	}

	if res.VideoID == "" && res.PlaylistID == "" && res.ChannelValue == "" {
		return nil, tools.NewToolError("INVALID_URL", "Could not extract any YouTube ID or handle from the provided input.")
	}

	return res, nil
}
