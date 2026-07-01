package youtubeurlcleaner

import (
	"context"
	"testing"
	"youtube-tools/backend/internal/tools"
)

func TestValidate_EmptyURL(t *testing.T) {
	tool := New()
	err := tool.Validate(tools.Request{URL: ""})
	if err == nil {
		t.Fatal("Validate() should fail on empty URL")
	}
}

func TestValidate_NonYouTubeURL(t *testing.T) {
	tool := New()
	err := tool.Validate(tools.Request{URL: "https://vimeo.com/123456"})
	if err == nil {
		t.Fatal("Validate() should fail on non-YouTube URL")
	}
}

func TestValidate_PlaylistURLWithoutVideoID(t *testing.T) {
	tool := New()
	// A pure playlist URL (no v= param) should fail validation for this video-only tool
	err := tool.Validate(tools.Request{URL: "https://www.youtube.com/playlist?list=PLabcdefghijklmnopqrstuvwxyz12345"})
	if err == nil {
		t.Fatal("Validate() should fail on playlist-only URL (no video ID)")
	}
}

func TestValidate_ValidWatchURL(t *testing.T) {
	tool := New()
	err := tool.Validate(tools.Request{URL: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc123&feature=share"})
	if err != nil {
		t.Fatalf("Validate() failed on valid watch URL: %v", err)
	}
}

func TestValidate_ValidShortURL(t *testing.T) {
	tool := New()
	err := tool.Validate(tools.Request{URL: "https://youtu.be/dQw4w9WgXcQ?si=xyz"})
	if err != nil {
		t.Fatalf("Validate() failed on valid short URL: %v", err)
	}
}

func TestExecute_RemovesTrackingParams(t *testing.T) {
	tool := New()
	ctx := context.Background()
	res, err := tool.Execute(ctx, tools.Request{
		URL: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc123&feature=share&utm_source=test",
	})
	if err != nil {
		t.Fatalf("Execute() error: %v", err)
	}
	result, ok := res.(Result)
	if !ok {
		t.Fatalf("Execute() returned unexpected type %T", res)
	}
	if result.VideoID != "dQw4w9WgXcQ" {
		t.Errorf("VideoID = %q, want %q", result.VideoID, "dQw4w9WgXcQ")
	}
	if result.CleanedUrl != "https://www.youtube.com/watch?v=dQw4w9WgXcQ" {
		t.Errorf("CleanedUrl = %q, want clean URL without tracking params", result.CleanedUrl)
	}
	if result.ShortUrl != "https://youtu.be/dQw4w9WgXcQ" {
		t.Errorf("ShortUrl = %q, want clean short URL", result.ShortUrl)
	}
}

func TestExecute_PreservesTimestamp(t *testing.T) {
	tool := New()
	ctx := context.Background()
	res, err := tool.Execute(ctx, tools.Request{
		URL: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s&si=tracking",
	})
	if err != nil {
		t.Fatalf("Execute() error: %v", err)
	}
	result := res.(Result)
	// Should preserve the t= param in cleaned URLs
	if result.CleanedUrl != "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s" {
		t.Errorf("CleanedUrl = %q, want timestamp preserved", result.CleanedUrl)
	}
	if result.ShortUrl != "https://youtu.be/dQw4w9WgXcQ?t=42s" {
		t.Errorf("ShortUrl = %q, want timestamp preserved", result.ShortUrl)
	}
}
