// Package timestampkit provides parsing and formatting utilities for YouTube
// chapter/timestamp strings in H:MM:SS, M:SS, or SS formats.
package timestampkit

import (
	"fmt"
	"strconv"
	"strings"
)

// ParseToSeconds converts a timestamp string (H:MM:SS, M:SS, or SS) to seconds.
// Returns the total seconds and true on success; 0 and false if the string
// cannot be parsed as a valid timestamp.
func ParseToSeconds(s string) (int, bool) {
	s = strings.TrimSpace(s)
	if s == "" {
		return 0, false
	}

	parts := strings.Split(s, ":")
	switch len(parts) {
	case 1:
		sec, err := strconv.Atoi(parts[0])
		if err != nil || sec < 0 {
			return 0, false
		}
		return sec, true
	case 2:
		mins, err1 := strconv.Atoi(parts[0])
		secs, err2 := strconv.Atoi(parts[1])
		if err1 != nil || err2 != nil || mins < 0 || secs < 0 || secs > 59 {
			return 0, false
		}
		return mins*60 + secs, true
	case 3:
		hrs, err1 := strconv.Atoi(parts[0])
		mins, err2 := strconv.Atoi(parts[1])
		secs, err3 := strconv.Atoi(parts[2])
		if err1 != nil || err2 != nil || err3 != nil || hrs < 0 || mins < 0 || mins > 59 || secs < 0 || secs > 59 {
			return 0, false
		}
		return hrs*3600 + mins*60 + secs, true
	}
	return 0, false
}

// FormatFromSeconds converts a non-negative second count into a timestamp string.
// Produces "H:MM:SS" when hours > 0, otherwise "M:SS".
// Negative values are clamped to "0:00".
func FormatFromSeconds(secs int) string {
	if secs < 0 {
		secs = 0
	}
	h := secs / 3600
	m := (secs % 3600) / 60
	s := secs % 60

	if h > 0 {
		return fmt.Sprintf("%d:%02d:%02d", h, m, s)
	}
	return fmt.Sprintf("%d:%02d", m, s)
}

// ExtractLeadingTimestamp attempts to parse a timestamp at the beginning of a
// line (separated from the rest by whitespace). It returns the timestamp string,
// the remainder of the line, the parsed seconds, and whether parsing succeeded.
// Lines that do not start with a timestamp are returned as-is with ok=false.
func ExtractLeadingTimestamp(line string) (ts, rest string, secs int, ok bool) {
	line = strings.TrimRight(line, "\r")
	idx := strings.IndexAny(line, " \t")
	if idx < 0 {
		// Whole line might be a bare timestamp (no label)
		if s, parsed := ParseToSeconds(line); parsed {
			return line, "", s, true
		}
		return line, "", 0, false
	}
	candidate := line[:idx]
	s, parsed := ParseToSeconds(candidate)
	if !parsed {
		return line, "", 0, false
	}
	return candidate, line[idx:], s, true
}
