package urlkit

import "testing"

func TestExtractVideoID(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{"Direct ID", "dQw4w9WgXcQ", "dQw4w9WgXcQ", false},
		{"Standard URL", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ", false},
		{"URL with params", "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "dQw4w9WgXcQ", false},
		{"Short URL", "https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ", false},
		{"Short URL with params", "https://youtu.be/dQw4w9WgXcQ?t=10", "dQw4w9WgXcQ", false},
		{"Shorts URL", "https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ", false},
		{"Embed URL", "https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ", false},
		{"V URL", "https://www.youtube.com/v/dQw4w9WgXcQ", "dQw4w9WgXcQ", false},
		{"No schema URL", "www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ", false},
		{"Invalid ID length", "dQw4w9WgXc", "", true},
		{"Invalid domain", "https://google.com/watch?v=dQw4w9WgXcQ", "", true},
		{"Empty input", "", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ExtractVideoID(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ExtractVideoID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("ExtractVideoID() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestExtractPlaylistID(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr bool
	}{
		{"Direct ID", "PL4fGSI4dGk1gyB4_v16d2sWwX-x-N0F23", "PL4fGSI4dGk1gyB4_v16d2sWwX-x-N0F23", false},
		{"Standard Playlist URL", "https://www.youtube.com/playlist?list=PL4fGSI4dGk1gyB4_v16d2sWwX-x-N0F23", "PL4fGSI4dGk1gyB4_v16d2sWwX-x-N0F23", false},
		{"Playlist URL with other params", "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PL4fGSI4dGk1gyB4_v16d2sWwX-x-N0F23", "PL4fGSI4dGk1gyB4_v16d2sWwX-x-N0F23", false},
		{"Invalid playlist ID", "short_id", "", true},
		{"Invalid URL no list", "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ExtractPlaylistID(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ExtractPlaylistID() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if got != tt.want {
				t.Errorf("ExtractPlaylistID() got = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestExtractChannelValue(t *testing.T) {
	tests := []struct {
		name         string
		input        string
		wantVal      string
		wantID       bool
		wantHandle   bool
		wantErr      bool
	}{
		{"Direct ID", "UCK8sQmJBp8GCxrOtXWBpyEA", "UCK8sQmJBp8GCxrOtXWBpyEA", true, false, false},
		{"Direct Handle", "@Google", "@Google", false, true, false},
		{"Channel URL", "https://www.youtube.com/channel/UCK8sQmJBp8GCxrOtXWBpyEA", "UCK8sQmJBp8GCxrOtXWBpyEA", true, false, false},
		{"Handle URL", "https://www.youtube.com/@Google", "@Google", false, true, false},
		{"Custom URL", "https://www.youtube.com/c/Google", "Google", false, false, false},
		{"User URL", "https://www.youtube.com/user/Google", "Google", false, false, false},
		{"Invalid ID shape", "UCtoo_short", "", false, false, true},
		{"Invalid host", "https://other.com/@Google", "", false, false, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotVal, gotID, gotHandle, err := ExtractChannelValue(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ExtractChannelValue() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if gotVal != tt.wantVal || gotID != tt.wantID || gotHandle != tt.wantHandle {
				t.Errorf("ExtractChannelValue() got = (%v, %v, %v), want = (%v, %v, %v)", gotVal, gotID, gotHandle, tt.wantVal, tt.wantID, tt.wantHandle)
			}
		})
	}
}
