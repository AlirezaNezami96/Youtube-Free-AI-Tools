package config

import (
	"os"
	"strconv"
	"strings"
)

type Config struct {
	Port                  string
	AllowedOrigins        []string
	RateLimitRate         float64
	RateLimitBurst        int
	MaxPlaylistSize       int
	MaxConcurrentYtDlp    int
	TempDir               string
	YtDlpPath             string
	CookiesPath           string
	ProxyURL              string
}

func Load() *Config {
	port := getEnv("PORT", "8080")
	originsStr := getEnv("ALLOWED_ORIGINS", "http://localhost:3000")
	origins := strings.Split(originsStr, ",")
	for i, o := range origins {
		origins[i] = strings.TrimSpace(o)
	}

	rateLimitRate, _ := strconv.ParseFloat(getEnv("RATE_LIMIT_RATE", "5.0"), 64)
	rateLimitBurst, _ := strconv.Atoi(getEnv("RATE_LIMIT_BURST", "10"))
	maxPlaylistSize, _ := strconv.Atoi(getEnv("MAX_PLAYLIST_SIZE", "500"))
	maxConcurrentYtDlp, _ := strconv.Atoi(getEnv("MAX_CONCURRENT_YTDLP", "4"))
	if maxConcurrentYtDlp <= 0 {
		maxConcurrentYtDlp = 4
	}
	tempDir := getEnv("TEMP_DIR", "./downloads_temp")
	ytDlpPath := getEnv("YTDLP_PATH", "yt-dlp")
	cookiesPath := getEnv("YOUTUBE_COOKIES_PATH", "")
	proxyURL := getEnv("HTTP_PROXY", getEnv("HTTPS_PROXY", ""))

	return &Config{
		Port:                port,
		AllowedOrigins:      origins,
		RateLimitRate:       rateLimitRate,
		RateLimitBurst:      rateLimitBurst,
		MaxPlaylistSize:     maxPlaylistSize,
		MaxConcurrentYtDlp: maxConcurrentYtDlp,
		TempDir:             tempDir,
		YtDlpPath:           ytDlpPath,
		CookiesPath:         cookiesPath,
		ProxyURL:            proxyURL,
	}
}

func getEnv(key, fallback string) string {
	if val, ok := os.LookupEnv(key); ok {
		return val
	}
	return fallback
}
