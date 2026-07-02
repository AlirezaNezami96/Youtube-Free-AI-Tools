// Package durationkit provides human-readable duration formatting and
// playback-speed-adjusted runtime calculations for playlists and video lists.
package durationkit

import (
	"fmt"
	"math"
)

// FormatDuration converts a total second count into a compact human-readable
// string: "Xh Xm Xs", "Xm Xs", or "Xs". Negative values return "0s".
func FormatDuration(totalSeconds int) string {
	if totalSeconds <= 0 {
		return "0s"
	}
	h := totalSeconds / 3600
	m := (totalSeconds % 3600) / 60
	s := totalSeconds % 60

	if h > 0 {
		return fmt.Sprintf("%dh %dm %ds", h, m, s)
	}
	if m > 0 {
		return fmt.Sprintf("%dm %ds", m, s)
	}
	return fmt.Sprintf("%ds", s)
}

// SpeedKey returns the canonical map key string for a playback speed multiplier.
// e.g. 1.0 → "1", 1.25 → "1.25", 1.75 → "1.75", 2.0 → "2"
func SpeedKey(speed float64) string {
	// Use %g to drop unnecessary trailing zeros
	return fmt.Sprintf("%g", speed)
}

// SpeedAdjusted computes the duration at each given playback speed.
// totalSeconds is the original duration. Returns a map of speed key → formatted duration.
func SpeedAdjusted(totalSeconds int, speeds []float64) map[string]string {
	result := make(map[string]string, len(speeds))
	for _, sp := range speeds {
		if sp <= 0 {
			continue
		}
		adjusted := int(math.Round(float64(totalSeconds) / sp))
		result[SpeedKey(sp)] = FormatDuration(adjusted)
	}
	return result
}

// DefaultSpeeds returns the standard speed multiplier set: 1x, 1.25x, 1.5x, 1.75x, 2x.
func DefaultSpeeds() []float64 {
	return []float64{1.0, 1.25, 1.5, 1.75, 2.0}
}
