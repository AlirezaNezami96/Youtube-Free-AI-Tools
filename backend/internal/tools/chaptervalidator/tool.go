// Package chaptervalidator validates a YouTube chapter list pasted as plain text,
// checking for all common issues that cause chapters to be rejected by YouTube.
package chaptervalidator

import (
	"context"
	"fmt"
	"strings"
	"youtube-tools/backend/internal/timestampkit"
	"youtube-tools/backend/internal/tools"
)

const maxInputBytes = 50_000

// YouTube requires chapters to be at least 10 seconds apart.
// Source: YouTube Help — "Add chapters to a video" documentation.
const minChapterSpacingSecs = 10

type Tool struct{}

func New() *Tool { return &Tool{} }

func (t *Tool) Slug() string { return "chapter-validator" }

func (t *Tool) Validate(req tools.Request) error {
	if len(req.URL) > maxInputBytes {
		return tools.NewToolError("INPUT_TOO_LARGE", "Input exceeds the 50 KB limit.")
	}
	if strings.TrimSpace(req.URL) == "" {
		return tools.NewToolError("INVALID_INPUT", "Chapter list cannot be empty.")
	}
	return nil
}

type Issue struct {
	Line    int    `json:"line"`
	Type    string `json:"type"`
	Message string `json:"message"`
}

type ChapterEntry struct {
	Line    int    `json:"line"`
	Seconds int    `json:"seconds"`
	Title   string `json:"title"`
}

type Result struct {
	Issues   []Issue        `json:"issues"`
	Valid    bool           `json:"valid"`
	Chapters []ChapterEntry `json:"chapters"`
}

func (t *Tool) Execute(ctx context.Context, req tools.Request) (any, error) {
	inputLines := strings.Split(req.URL, "\n")
	var issues []Issue
	var chapters []ChapterEntry

	seenSeconds := make(map[int]int)   // seconds → line number (for duplicate detection)
	seenTitles := make(map[string]int) // normalized title → line number

	for i, raw := range inputLines {
		lineNum := i + 1
		stripped := strings.TrimRight(raw, "\r")
		trimmed := strings.TrimSpace(stripped)

		if trimmed == "" {
			continue
		}

		ts, rest, secs, ok := timestampkit.ExtractLeadingTimestamp(stripped)
		if !ok {
			issues = append(issues, Issue{
				Line:    lineNum,
				Type:    "INVALID_FORMAT",
				Message: fmt.Sprintf("Line %d: could not parse a timestamp at the start of this line.", lineNum),
			})
			continue
		}

		// Check for missing space after timestamp
		if len(stripped) > len(ts) && stripped[len(ts)] != ' ' && stripped[len(ts)] != '\t' {
			issues = append(issues, Issue{
				Line:    lineNum,
				Type:    "MISSING_SPACE",
				Message: fmt.Sprintf("Line %d: there must be a space between the timestamp and the chapter title.", lineNum),
			})
		}

		title := strings.TrimSpace(rest)

		// Empty title
		if title == "" {
			issues = append(issues, Issue{
				Line:    lineNum,
				Type:    "EMPTY_TITLE",
				Message: fmt.Sprintf("Line %d: chapter title is empty.", lineNum),
			})
		}

		// Duplicate timestamp
		if prevLine, exists := seenSeconds[secs]; exists {
			issues = append(issues, Issue{
				Line:    lineNum,
				Type:    "DUPLICATE_TIMESTAMP",
				Message: fmt.Sprintf("Line %d: timestamp %s is already used on line %d.", lineNum, ts, prevLine),
			})
		} else {
			seenSeconds[secs] = lineNum
		}

		// Duplicate title (case-insensitive, only flag if non-empty)
		if title != "" {
			norm := strings.ToLower(strings.TrimSpace(title))
			if prevLine, exists := seenTitles[norm]; exists {
				issues = append(issues, Issue{
					Line:    lineNum,
					Type:    "DUPLICATE_TITLE",
					Message: fmt.Sprintf("Line %d: title \"%s\" is already used on line %d.", lineNum, title, prevLine),
				})
			} else {
				seenTitles[norm] = lineNum
			}
		}

		chapters = append(chapters, ChapterEntry{
			Line:    lineNum,
			Seconds: secs,
			Title:   title,
		})
	}

	// Cross-chapter checks (require chapters to be sorted)
	if len(chapters) > 0 {
		// Must start at 0:00
		if chapters[0].Seconds != 0 {
			issues = append(issues, Issue{
				Line:    chapters[0].Line,
				Type:    "MISSING_START",
				Message: "The first chapter must start at 0:00.",
			})
		}

		// Check order and minimum spacing
		for i := 1; i < len(chapters); i++ {
			prev := chapters[i-1]
			curr := chapters[i]

			if curr.Seconds < prev.Seconds {
				issues = append(issues, Issue{
					Line:    curr.Line,
					Type:    "OUT_OF_ORDER",
					Message: fmt.Sprintf("Line %d: timestamp %s appears before the previous chapter at %s.", curr.Line, timestampkit.FormatFromSeconds(curr.Seconds), timestampkit.FormatFromSeconds(prev.Seconds)),
				})
			} else if curr.Seconds == prev.Seconds {
				// already caught as duplicate above
			} else {
				spacing := curr.Seconds - prev.Seconds
				if spacing < minChapterSpacingSecs {
					issues = append(issues, Issue{
						Line:    curr.Line,
						Type:    "TOO_CLOSE",
						Message: fmt.Sprintf("Line %d: only %d seconds between this chapter and the previous one (minimum is %d seconds).", curr.Line, spacing, minChapterSpacingSecs),
					})
				}
			}
		}
	}

	return Result{
		Issues:   issues,
		Valid:    len(issues) == 0,
		Chapters: chapters,
	}, nil
}
