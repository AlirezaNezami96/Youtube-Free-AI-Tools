package urlkit

import (
	"errors"
	"net/url"
	"regexp"
	"strings"
)

var (
	// Video ID is exactly 11 characters of alphanumeric, underscores, or dashes
	videoIDRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{11}$`)

	// Playlist ID is usually 18 to 34 characters of alphanumeric, underscores, or dashes
	playlistIDRegex = regexp.MustCompile(`^[a-zA-Z0-9_-]{18,34}$`)

	// Channel ID is UC followed by 22 characters of alphanumeric, underscores, or dashes
	channelIDRegex = regexp.MustCompile(`^UC[a-zA-Z0-9_-]{22}$`)

	// Handle starts with @ followed by valid handle characters (letters, numbers, dots, dashes, underscores)
	handleRegex = regexp.MustCompile(`^@[a-zA-Z0-9._-]{3,30}$`)
)

// ExtractVideoID parses a YouTube URL or direct ID and returns the 11-character video ID.
func ExtractVideoID(input string) (string, error) {
	input = strings.TrimSpace(input)
	if input == "" {
		return "", errors.New("empty input")
	}

	// Direct ID check
	if videoIDRegex.MatchString(input) {
		return input, nil
	}

	// Try parsing as URL
	u, err := parseURL(input)
	if err != nil {
		return "", err
	}

	host := strings.ToLower(u.Host)
	path := u.Path

	if host == "youtu.be" {
		// youtu.be/VIDEO_ID
		id := strings.TrimPrefix(path, "/")
		id = strings.Split(id, "?")[0]
		if videoIDRegex.MatchString(id) {
			return id, nil
		}
	} else if strings.Contains(host, "youtube.com") {
		// youtube.com/shorts/VIDEO_ID
		if strings.HasPrefix(path, "/shorts/") {
			id := strings.TrimPrefix(path, "/shorts/")
			id = strings.Split(id, "/")[0]
			id = strings.Split(id, "?")[0]
			if videoIDRegex.MatchString(id) {
				return id, nil
			}
		}

		// youtube.com/embed/VIDEO_ID
		if strings.HasPrefix(path, "/embed/") {
			id := strings.TrimPrefix(path, "/embed/")
			id = strings.Split(id, "/")[0]
			id = strings.Split(id, "?")[0]
			if videoIDRegex.MatchString(id) {
				return id, nil
			}
		}

		// youtube.com/v/VIDEO_ID
		if strings.HasPrefix(path, "/v/") {
			id := strings.TrimPrefix(path, "/v/")
			id = strings.Split(id, "/")[0]
			id = strings.Split(id, "?")[0]
			if videoIDRegex.MatchString(id) {
				return id, nil
			}
		}

		// youtube.com/watch?v=VIDEO_ID
		if path == "/watch" || path == "/watch_popup" {
			id := u.Query().Get("v")
			if videoIDRegex.MatchString(id) {
				return id, nil
			}
		}
	}

	return "", errors.New("invalid YouTube video URL or ID")
}

// ExtractPlaylistID parses a YouTube URL or direct ID and returns the playlist ID.
func ExtractPlaylistID(input string) (string, error) {
	input = strings.TrimSpace(input)
	if input == "" {
		return "", errors.New("empty input")
	}

	// Direct ID check
	if playlistIDRegex.MatchString(input) {
		return input, nil
	}

	u, err := parseURL(input)
	if err != nil {
		return "", err
	}

	host := strings.ToLower(u.Host)
	if strings.Contains(host, "youtube.com") {
		id := u.Query().Get("list")
		if playlistIDRegex.MatchString(id) {
			return id, nil
		}
	}

	return "", errors.New("invalid YouTube playlist URL or ID")
}

// ExtractChannelValue extracts either a channel ID (UC...) or handle (@...) or username from the input.
func ExtractChannelValue(input string) (value string, isID bool, isHandle bool, err error) {
	input = strings.TrimSpace(input)
	if input == "" {
		return "", false, false, errors.New("empty input")
	}

	// Direct Channel ID
	if channelIDRegex.MatchString(input) {
		return input, true, false, nil
	}

	// Direct Handle
	if handleRegex.MatchString(input) {
		return input, false, true, nil
	}

	u, err := parseURL(input)
	if err != nil {
		return "", false, false, err
	}

	host := strings.ToLower(u.Host)
	if !strings.Contains(host, "youtube.com") {
		return "", false, false, errors.New("invalid host name")
	}

	path := u.Path
	parts := strings.Split(strings.Trim(path, "/"), "/")

	if len(parts) > 0 {
		first := parts[0]
		if first == "channel" && len(parts) > 1 {
			id := parts[1]
			if channelIDRegex.MatchString(id) {
				return id, true, false, nil
			}
		}
		if first == "c" && len(parts) > 1 {
			return parts[1], false, false, nil
		}
		if first == "user" && len(parts) > 1 {
			return parts[1], false, false, nil
		}
		if strings.HasPrefix(first, "@") {
			handle := first
			if handleRegex.MatchString(handle) {
				return handle, false, true, nil
			}
		}
	}

	return "", false, false, errors.New("invalid YouTube channel URL or identifier")
}

// Helper to sanitize and parse URL (handling schema-less URLs)
func parseURL(raw string) (*url.URL, error) {
	if !strings.HasPrefix(raw, "http://") && !strings.HasPrefix(raw, "https://") {
		raw = "https://" + raw
	}
	return url.Parse(raw)
}
