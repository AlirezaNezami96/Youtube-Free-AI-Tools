package downloads

import (
	"archive/zip"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type DownloadItem struct {
	FilePath     string
	OriginalName string
	ContentType  string
	ExpireAt     time.Time
}

type Store struct {
	mu    sync.RWMutex
	items map[string]DownloadItem
}

func NewStore() *Store {
	return &Store{
		items: make(map[string]DownloadItem),
	}
}

// Register adds a file to the store and returns a random token.
func (s *Store) Register(filePath, originalName, contentType string, ttl time.Duration) (string, error) {
	tokenBytes := make([]byte, 16)
	if _, err := rand.Read(tokenBytes); err != nil {
		return "", err
	}
	token := hex.EncodeToString(tokenBytes)

	s.mu.Lock()
	s.items[token] = DownloadItem{
		FilePath:     filePath,
		OriginalName: originalName,
		ContentType:  contentType,
		ExpireAt:     time.Now().Add(ttl),
	}
	s.mu.Unlock()

	slog.Info("Registered temporary download", "token", token, "file", filePath, "ttl", ttl)
	return token, nil
}

// Get retrieves a registered item if it exists and has not expired.
func (s *Store) Get(token string) (DownloadItem, bool) {
	s.mu.RLock()
	item, ok := s.items[token]
	s.mu.RUnlock()

	if !ok {
		return DownloadItem{}, false
	}

	if time.Now().After(item.ExpireAt) {
		return DownloadItem{}, false
	}

	return item, true
}

// StartCleanupWorker starts a background loop that deletes expired files.
func (s *Store) StartCleanupWorker(interval time.Duration) {
	go func() {
		for {
			time.Sleep(interval)
			s.Cleanup()
		}
	}()
}

// Cleanup removes expired entries and deletes their associated files from disk.
func (s *Store) Cleanup() {
	s.mu.Lock()
	now := time.Now()
	for token, item := range s.items {
		if now.After(item.ExpireAt) {
			slog.Info("Cleaning up expired download", "token", token, "file", item.FilePath)
			// Delete file
			err := os.Remove(item.FilePath)
			if err != nil && !os.IsNotExist(err) {
				slog.Error("Failed to delete expired file", "file", item.FilePath, "err", err)
			}
			// Delete directory if it was a custom request temp dir
			// Usually we create a per-request temp dir which we can delete if empty or delete the file.
			// Let's also remove from map
			delete(s.items, token)
		}
	}
	s.mu.Unlock()
}

// NamedFile is a source file that will be bundled into a zip archive.
// SafeName MUST be derived only from validated identifiers (e.g. video IDs),
// never from raw external strings, to prevent zip-slip attacks.
type NamedFile struct {
	// Path is the absolute path to the source file on disk.
	Path string
	// SafeName is the filename used inside the archive. Must contain no path
	// separators or ".." components.
	SafeName string
}

// BundleAsZip bundles the given files into a single zip archive written to a
// temporary file under tempDir. It registers the archive in the store with the
// given TTL and returns the download token.
//
// Zip-slip prevention: each SafeName is cleaned and rejected if it contains
// any path separator or ".." component, ensuring archive entries never escape
// the archive root.
func (s *Store) BundleAsZip(files []NamedFile, archiveName, tempDir string, ttl time.Duration) (string, error) {
	if err := os.MkdirAll(tempDir, 0755); err != nil {
		return "", fmt.Errorf("failed to create temp dir for zip: %w", err)
	}

	tmpFile, err := os.CreateTemp(tempDir, "bulk-*.zip")
	if err != nil {
		return "", fmt.Errorf("failed to create zip temp file: %w", err)
	}
	zipPath := tmpFile.Name()

	zw := zip.NewWriter(tmpFile)

	for _, nf := range files {
		// --- Zip-slip prevention ---
		// Clean the name: remove any path components, only keep the base filename.
		clean := filepath.Base(filepath.Clean(nf.SafeName))
		// Reject names that are empty, ".", or contain separators after cleaning.
		if clean == "" || clean == "." || strings.ContainsAny(clean, `/\`) || strings.Contains(clean, "..") {
			slog.Warn("Skipping unsafe archive entry name", "safeName", nf.SafeName)
			continue
		}

		src, err := os.Open(nf.Path)
		if err != nil {
			slog.Error("Failed to open source file for zip", "path", nf.Path, "err", err)
			continue
		}

		entry, err := zw.Create(clean)
		if err != nil {
			src.Close()
			slog.Error("Failed to create zip entry", "name", clean, "err", err)
			continue
		}

		if _, err := io.Copy(entry, src); err != nil {
			src.Close()
			slog.Error("Failed to copy file into zip", "name", clean, "err", err)
			continue
		}
		src.Close()
	}

	if err := zw.Close(); err != nil {
		tmpFile.Close()
		os.Remove(zipPath)
		return "", fmt.Errorf("failed to finalize zip: %w", err)
	}
	tmpFile.Close()

	token, err := s.Register(zipPath, archiveName, "application/zip", ttl)
	if err != nil {
		os.Remove(zipPath)
		return "", fmt.Errorf("failed to register zip download: %w", err)
	}
	return token, nil
}

