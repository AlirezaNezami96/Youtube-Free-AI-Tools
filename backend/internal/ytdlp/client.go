package ytdlp

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os/exec"
)

// semaphore is a channel-based counting semaphore.
type semaphore chan struct{}

func newSemaphore(n int) semaphore {
	s := make(semaphore, n)
	for i := 0; i < n; i++ {
		s <- struct{}{}
	}
	return s
}

func (s semaphore) acquire(ctx context.Context) error {
	select {
	case <-s:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (s semaphore) release() {
	s <- struct{}{}
}

// Client wraps yt-dlp subprocess calls with a concurrency cap.
type Client struct {
	ytDlpPath   string
	cookiesPath string
	proxyURL    string
	sem         semaphore
}

// New creates a Client. maxConcurrent caps how many yt-dlp processes run simultaneously.
func New(ytDlpPath, cookiesPath, proxyURL string, maxConcurrent int) *Client {
	if maxConcurrent <= 0 {
		maxConcurrent = 4
	}
	return &Client{
		ytDlpPath:   ytDlpPath,
		cookiesPath: cookiesPath,
		proxyURL:    proxyURL,
		sem:         newSemaphore(maxConcurrent),
	}
}

// getCommonArgs returns common flags like cookies and proxy.
func (c *Client) getCommonArgs() []string {
	var args []string
	if c.cookiesPath != "" {
		args = append(args, "--cookies", c.cookiesPath)
	}
	if c.proxyURL != "" {
		args = append(args, "--proxy", c.proxyURL)
	}
	return args
}

// run executes yt-dlp with the given args under the semaphore + context.
func (c *Client) run(ctx context.Context, args []string) ([]byte, error) {
	if err := c.sem.acquire(ctx); err != nil {
		return nil, fmt.Errorf("yt-dlp concurrency limit reached: %w", err)
	}
	defer c.sem.release()

	slog.Info("Running yt-dlp", "args", args)
	cmd := exec.CommandContext(ctx, c.ytDlpPath, args...)

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	if err := cmd.Run(); err != nil {
		slog.Error("yt-dlp execution failed", "err", err, "stderr", stderr.String())
		return nil, fmt.Errorf("yt-dlp failed: %w (details: %s)", err, stderr.String())
	}
	return stdout.Bytes(), nil
}

// DumpMetadata runs yt-dlp to get the JSON metadata of a video or playlist.
func (c *Client) DumpMetadata(ctx context.Context, url string, flat bool) ([]byte, error) {
	args := c.getCommonArgs()
	args = append(args, "--dump-json")
	if flat {
		args = append(args, "--flat-playlist")
	} else {
		args = append(args, "--no-playlist")
	}
	args = append(args, url)
	return c.run(ctx, args)
}

// DownloadSubtitles downloads subtitles for a video into outDir and returns the file path.
// format must be "srt" or "vtt".
func (c *Client) DownloadSubtitles(ctx context.Context, url, lang, format, outDir string) (string, error) {
	outPattern := fmt.Sprintf("%s/subtitle", outDir)

	args := c.getCommonArgs()
	args = append(args,
		"--write-subs",
		"--write-auto-subs",
		"--sub-langs", lang,
		"--skip-download",
		"--sub-format", format,
		"-o", outPattern,
		"--impersonate", "chrome",
		url,
	)

	if _, err := c.run(ctx, args); err != nil {
		return "", fmt.Errorf("subtitle download failed: %w", err)
	}

	// yt-dlp names the file: outPattern.<lang>.<format>
	expectedFile := fmt.Sprintf("%s.%s.%s", outPattern, lang, format)
	return expectedFile, nil
}

// PlaylistEntry represents basic details of a video inside a playlist.
type PlaylistEntry struct {
	ID       string  `json:"id"`
	Title    string  `json:"title"`
	Duration float64 `json:"duration"`
	Uploader string  `json:"uploader"`
	Channel  string  `json:"channel"`
	Url      string  `json:"url"`
}

// PlaylistMetadata represents details extracted from a playlist.
type PlaylistMetadata struct {
	ID      string          `json:"id"`
	Title   string          `json:"title"`
	Entries []PlaylistEntry `json:"entries"`
}

// FetchPlaylistInfo extracts flat details of a playlist, capped at maxItems.
func (c *Client) FetchPlaylistInfo(ctx context.Context, url string, maxItems int) (*PlaylistMetadata, error) {
	args := c.getCommonArgs()
	args = append(args,
		"--dump-single-json",
		"--flat-playlist",
		"--playlist-items", fmt.Sprintf("1-%d", maxItems),
		url,
	)

	out, err := c.run(ctx, args)
	if err != nil {
		return nil, fmt.Errorf("playlist fetch failed: %w", err)
	}

	var meta PlaylistMetadata
	if err := json.Unmarshal(out, &meta); err != nil {
		return nil, fmt.Errorf("failed to parse playlist json: %w", err)
	}
	return &meta, nil
}
