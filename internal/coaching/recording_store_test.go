package coaching

import (
	"testing"
	"time"
)

func TestRecordingObjectPrefix(t *testing.T) {
	got := recordingObjectPrefix([]string{"liveCoachingRecordings", "/abc123/", ""})
	want := "liveCoachingRecordings/abc123/"
	if got != want {
		t.Fatalf("recordingObjectPrefix() = %q, want %q", got, want)
	}
}

func TestBetterRecordingObject(t *testing.T) {
	now := time.Now()
	tests := []struct {
		name      string
		candidate RecordingObject
		current   RecordingObject
		want      bool
	}{
		{
			name:      "larger object wins",
			candidate: RecordingObject{Name: "new.mp4", Size: 2, Updated: now.Add(-time.Hour)},
			current:   RecordingObject{Name: "old.mp4", Size: 1, Updated: now},
			want:      true,
		},
		{
			name:      "newer object wins when size equal",
			candidate: RecordingObject{Name: "new.mp4", Size: 1, Updated: now},
			current:   RecordingObject{Name: "old.mp4", Size: 1, Updated: now.Add(-time.Hour)},
			want:      true,
		},
		{
			name:      "smaller object loses",
			candidate: RecordingObject{Name: "new.mp4", Size: 1, Updated: now},
			current:   RecordingObject{Name: "old.mp4", Size: 2, Updated: now.Add(-time.Hour)},
			want:      false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := betterRecordingObject(tt.candidate, tt.current); got != tt.want {
				t.Fatalf("betterRecordingObject() = %v, want %v", got, tt.want)
			}
		})
	}
}
