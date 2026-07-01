package thumbnaildownloader

import (
	"testing"
	"youtube-tools/backend/internal/tools"
)

// newTestTool builds a Tool with nil deps — sufficient for Validate() tests
// since Validate() only uses urlkit (no external calls).
func newTestTool() *Tool {
	return &Tool{dlStore: nil, config: nil}
}

func TestValidate_EmptyURL(t *testing.T) {
	tool := newTestTool()
	err := tool.Validate(tools.Request{URL: "", Options: map[string]string{"resolution": "max"}})
	if err == nil {
		t.Fatal("Validate() should fail on empty URL")
	}
}

func TestValidate_InvalidURL(t *testing.T) {
	tool := newTestTool()
	err := tool.Validate(tools.Request{URL: "https://notYouTube.com/watch?v=abc", Options: map[string]string{"resolution": "max"}})
	if err == nil {
		t.Fatal("Validate() should fail on non-YouTube URL")
	}
}

func TestValidate_MissingResolution(t *testing.T) {
	tool := newTestTool()
	err := tool.Validate(tools.Request{
		URL:     "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		Options: map[string]string{},
	})
	if err == nil {
		t.Fatal("Validate() should fail when resolution is missing")
	}
}

func TestValidate_InvalidResolution(t *testing.T) {
	for _, bad := range []string{"ultra", "4k", "720p", ""} {
		err := newTestTool().Validate(tools.Request{
			URL:     "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			Options: map[string]string{"resolution": bad},
		})
		if err == nil {
			t.Errorf("Validate() should fail on resolution=%q", bad)
		}
	}
}

func TestValidate_ValidResolutions(t *testing.T) {
	for _, res := range []string{"max", "high", "medium", "standard"} {
		err := newTestTool().Validate(tools.Request{
			URL:     "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
			Options: map[string]string{"resolution": res},
		})
		if err != nil {
			t.Errorf("Validate() failed on valid resolution=%q: %v", res, err)
		}
	}
}

func TestValidate_ShortsURL(t *testing.T) {
	tool := newTestTool()
	err := tool.Validate(tools.Request{
		URL:     "https://www.youtube.com/shorts/dQw4w9WgXcQ",
		Options: map[string]string{"resolution": "high"},
	})
	if err != nil {
		t.Errorf("Validate() failed on Shorts URL: %v", err)
	}
}
