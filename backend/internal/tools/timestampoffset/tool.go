// Package timestampoffset applies a time offset to every timestamp in a pasted
// chapter/cue list. Lines that cannot be parsed pass through unchanged.
package timestampoffset

import (
	"context"
	"strconv"
	"strings"
	"youtube-tools/backend/internal/timestampkit"
	"youtube-tools/backend/internal/tools"
)

const maxInputBytes = 50_000

type Tool struct{}

func New() *Tool { return &Tool{} }

func (t *Tool) Slug() string { return "timestamp-offset" }

func (t *Tool) Validate(req tools.Request) error {
	if len(req.URL) > maxInputBytes {
		return tools.NewToolError("INPUT_TOO_LARGE", "Input exceeds the 50 KB limit.")
	}
	if req.URL == "" {
		return tools.NewToolError("INVALID_INPUT", "Input text cannot be empty.")
	}
	action := req.Options["action"]
	if action != "add" && action != "subtract" {
		return tools.NewToolError("INVALID_OPTION", "Action must be 'add' or 'subtract'.")
	}
	if _, err := strconv.Atoi(req.Options["offset"]); err != nil {
		return tools.NewToolError("INVALID_OPTION", "Offset must be a whole number of seconds.")
	}
	return nil
}

type Result struct {
	UpdatedText   string `json:"updatedText"`
	UnparsedCount int    `json:"unparsedCount"`
	TotalLines    int    `json:"totalLines"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	action := req.Options["action"]
	offsetSecs, _ := strconv.Atoi(req.Options["offset"])

	inputLines := strings.Split(req.URL, "\n")
	var outputLines []string
	unparsedCount := 0

	for _, raw := range inputLines {
		stripped := strings.TrimRight(raw, "\r")
		ts, rest, secs, ok := timestampkit.ExtractLeadingTimestamp(stripped)
		if !ok {
			// Pass through unchanged, count as unparsed only if line looks like it
			// was supposed to have a timestamp (non-blank lines that don't parse).
			outputLines = append(outputLines, stripped)
			if strings.TrimSpace(stripped) != "" {
				unparsedCount++
			}
			continue
		}
		_ = ts // we'll reformat from secs

		var newSecs int
		if action == "add" {
			newSecs = secs + offsetSecs
		} else {
			newSecs = secs - offsetSecs
		}
		// Clamp at 0:00 — never negative
		if newSecs < 0 {
			newSecs = 0
		}

		outputLines = append(outputLines, timestampkit.FormatFromSeconds(newSecs)+rest)
	}

	return Result{
		UpdatedText:   strings.Join(outputLines, "\n"),
		UnparsedCount: unparsedCount,
		TotalLines:    len(inputLines),
	}, nil
}
