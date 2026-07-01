package downloads

import (
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"os"
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
