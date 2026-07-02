// Package transcriptsearch fetches a timestamped transcript for a video, returning
// it as structured lines for client-side search/highlight.
package transcriptsearch

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"regexp"
	"strconv"
	"strings"
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
	return &Tool{ytClient: ytClient, config: cfg}
}

func (t *Tool) Slug() string { return "transcript-search" }

func (t *Tool) Validate(req tools.Request) error {
	if req.URL == "" {
		return tools.NewToolError("INVALID_URL", "Video URL cannot be empty.")
	}
	if _, err := urlkit.ExtractVideoID(req.URL); err != nil {
		return tools.NewToolError("INVALID_URL", "That doesn't look like a valid YouTube video URL.")
	}
	return nil
}

type TranscriptLine struct {
	Seconds   int    `json:"seconds"`
	Timestamp string `json:"timestamp"`
	Text      string `json:"text"`
}

type Result struct {
	VideoID       string           `json:"videoId"`
	Title         string           `json:"title"`
	Language      string           `json:"language"`
	Lines         []TranscriptLine `json:"lines"`
	WordCount     int              `json:"wordCount"`
	TotalDuration string           `json:"totalDuration"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	lang := req.Options["lang"]
	if lang == "" {
		lang = "en"
	}

	if err := os.MkdirAll(t.config.TempDir, 0755); err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to initialize temp storage.")
	}
	tempDir, err := os.MkdirTemp(t.config.TempDir, "transcriptsearch-*")
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to create working directory.")
	}
	defer os.RemoveAll(tempDir)

	vttPath, err := t.ytClient.DownloadSubtitles(ctx, req.URL, lang, "vtt", tempDir)
	if err != nil {
		return nil, tools.NewToolError("RESOURCE_UNAVAILABLE", "No transcript found for language: "+lang)
	}

	// Get video title
	title := ""
	if metaRaw, err := t.ytClient.DumpMetadata(ctx, req.URL, false); err == nil {
		var meta struct {
			Title string `json:"title"`
		}
		if jerr := json.Unmarshal(metaRaw, &meta); jerr == nil {
			title = meta.Title
		}
	}

	lines, err := parseVTT(vttPath)
	if err != nil {
		return nil, tools.NewToolError("PROCESSING_FAILED", "Failed to parse transcript: "+err.Error())
	}

	wordCount := 0
	for _, l := range lines {
		wordCount += len(strings.Fields(l.Text))
	}

	videoID, _ := urlkit.ExtractVideoID(req.URL)

	totalDurationFmt := "0:00"
	if len(lines) > 0 {
		totalDurationFmt = durationkit.FormatDuration(lines[len(lines)-1].Seconds)
	}

	return Result{
		VideoID:       videoID,
		Title:         title,
		Language:      lang,
		Lines:         lines,
		WordCount:     wordCount,
		TotalDuration: totalDurationFmt,
	}, nil
}

// vttLongTimecodeRe matches VTT timecodes with hours: 00:00:00.000 -->
var vttLongTimecodeRe = regexp.MustCompile(`^(\d{1,2}):(\d{2}):(\d{2})\.\d+\s*-->`)

// vttShortTimecodeRe matches VTT timecodes without hours: 00:00.000 -->
var vttShortTimecodeRe = regexp.MustCompile(`^(\d{1,2}):(\d{2})\.\d+\s*-->`)

// tagRe removes inline VTT/HTML tags like <c>, <00:00:00.000>
var tagRe = regexp.MustCompile(`<[^>]+>`)

func stripTags(s string) string {
	return strings.TrimSpace(tagRe.ReplaceAllString(s, ""))
}

// parseVTT reads a WebVTT file and extracts deduplicated, timestamped lines.
func parseVTT(path string) ([]TranscriptLine, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var result []TranscriptLine
	var currentSecs int
	var currentTimestamp string
	var textBuf strings.Builder
	seen := make(map[string]bool)

	flush := func() {
		if textBuf.Len() > 0 && currentTimestamp != "" && !seen[currentTimestamp] {
			text := stripTags(strings.TrimSpace(textBuf.String()))
			if text != "" {
				result = append(result, TranscriptLine{
					Seconds:   currentSecs,
					Timestamp: currentTimestamp,
					Text:      text,
				})
				seen[currentTimestamp] = true
			}
		}
		textBuf.Reset()
	}

	scanner := bufio.NewScanner(f)
	for scanner.Scan() {
		line := strings.TrimRight(scanner.Text(), "\r")

		if m := vttLongTimecodeRe.FindStringSubmatch(line); m != nil {
			flush()
			h, _ := strconv.Atoi(m[1])
			mi, _ := strconv.Atoi(m[2])
			s, _ := strconv.Atoi(m[3])
			currentSecs = h*3600 + mi*60 + s
			currentTimestamp = fmt.Sprintf("%d:%02d:%02d", h, mi, s)
			continue
		}

		if m := vttShortTimecodeRe.FindStringSubmatch(line); m != nil {
			flush()
			mi, _ := strconv.Atoi(m[1])
			s, _ := strconv.Atoi(m[2])
			currentSecs = mi*60 + s
			currentTimestamp = fmt.Sprintf("%d:%02d", mi, s)
			continue
		}

		// Skip headers and empty/blank lines outside cues
		if line == "" || line == "WEBVTT" || strings.HasPrefix(line, "NOTE") || strings.HasPrefix(line, "STYLE") {
			continue
		}

		// Accumulate cue text
		if currentTimestamp != "" {
			if textBuf.Len() > 0 {
				textBuf.WriteString(" ")
			}
			textBuf.WriteString(line)
		}
	}
	flush()

	return result, scanner.Err()
}
