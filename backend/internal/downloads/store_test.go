package downloads

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestStore_RegisterAndGet(t *testing.T) {
	store := NewStore()

	// Create a temp file to register
	f, err := os.CreateTemp(t.TempDir(), "test-*.txt")
	if err != nil {
		t.Fatalf("failed to create temp file: %v", err)
	}
	f.WriteString("hello")
	f.Close()

	token, err := store.Register(f.Name(), "test.txt", "text/plain", 10*time.Minute)
	if err != nil {
		t.Fatalf("Register() failed: %v", err)
	}
	if token == "" {
		t.Fatal("Register() returned empty token")
	}

	item, ok := store.Get(token)
	if !ok {
		t.Fatal("Get() returned false for a valid unexpired token")
	}
	if item.FilePath != f.Name() {
		t.Errorf("Get() FilePath = %q, want %q", item.FilePath, f.Name())
	}
	if item.OriginalName != "test.txt" {
		t.Errorf("Get() OriginalName = %q, want %q", item.OriginalName, "test.txt")
	}
}

func TestStore_TokenIsUnguessable(t *testing.T) {
	store := NewStore()
	dir := t.TempDir()

	tokens := make(map[string]bool)
	for i := 0; i < 20; i++ {
		f, _ := os.CreateTemp(dir, "*.txt")
		f.Close()
		tok, err := store.Register(f.Name(), "x.txt", "text/plain", time.Minute)
		if err != nil {
			t.Fatalf("Register() error: %v", err)
		}
		if tokens[tok] {
			t.Fatalf("Duplicate token generated: %q", tok)
		}
		tokens[tok] = true
		// Each token should be 32 hex characters (16 random bytes)
		if len(tok) != 32 {
			t.Errorf("token length = %d, want 32", len(tok))
		}
	}
}

func TestStore_ExpiredTokenReturnsNotFound(t *testing.T) {
	store := NewStore()

	f, _ := os.CreateTemp(t.TempDir(), "*.txt")
	f.WriteString("data")
	f.Close()

	// Register with a very short TTL
	token, err := store.Register(f.Name(), "x.txt", "text/plain", 1*time.Millisecond)
	if err != nil {
		t.Fatalf("Register() error: %v", err)
	}

	// Wait for expiry
	time.Sleep(10 * time.Millisecond)

	_, ok := store.Get(token)
	if ok {
		t.Error("Get() returned true for an expired token, want false")
	}
}

func TestStore_CleanupRemovesExpiredEntries(t *testing.T) {
	store := NewStore()
	dir := t.TempDir()

	// Register one expired and one valid entry
	expiredFile := filepath.Join(dir, "expired.txt")
	os.WriteFile(expiredFile, []byte("exp"), 0644)
	expiredTok, _ := store.Register(expiredFile, "expired.txt", "text/plain", 1*time.Millisecond)

	validFile := filepath.Join(dir, "valid.txt")
	os.WriteFile(validFile, []byte("val"), 0644)
	validTok, _ := store.Register(validFile, "valid.txt", "text/plain", 10*time.Minute)

	// Wait for the short TTL to expire
	time.Sleep(10 * time.Millisecond)

	store.Cleanup()

	// Expired entry should be gone
	_, ok := store.Get(expiredTok)
	if ok {
		t.Error("expired entry still present after Cleanup()")
	}
	// Expired file should be deleted from disk
	if _, err := os.Stat(expiredFile); !os.IsNotExist(err) {
		t.Error("expired file still on disk after Cleanup()")
	}

	// Valid entry should survive
	_, ok = store.Get(validTok)
	if !ok {
		t.Error("valid entry was incorrectly removed by Cleanup()")
	}
}

func TestStore_GetUnknownTokenReturnsFalse(t *testing.T) {
	store := NewStore()
	_, ok := store.Get("nonexistent-token")
	if ok {
		t.Error("Get() returned true for unknown token")
	}
}
