package coaching

import (
	"testing"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestParticipantUIDForBooking(t *testing.T) {
	booking := db.CoachingBooking{
		StudentID: "student-1",
		ExpertID:  "expert-1",
	}

	if got := participantUIDForBooking("student-1", booking); got != 1 {
		t.Fatalf("student uid = %d, want 1", got)
	}
	if got := participantUIDForBooking("expert-1", booking); got != 2 {
		t.Fatalf("expert uid = %d, want 2", got)
	}
}

func TestRecordingStateHelpers(t *testing.T) {
	tests := []struct {
		status         db.CoachingRecordingStatus
		alreadyStarted bool
		canStop        bool
	}{
		{db.CoachingRecordingStatusStarting, false, true},
		{db.CoachingRecordingStatusStarted, true, true},
		{db.CoachingRecordingStatusStopping, true, true},
		{db.CoachingRecordingStatusStopped, true, false},
		{db.CoachingRecordingStatusFailed, false, false},
	}

	for _, tt := range tests {
		recording := db.CoachingBookingRecording{Status: tt.status}
		if got := recordingAlreadyStarted(recording); got != tt.alreadyStarted {
			t.Fatalf("recordingAlreadyStarted(%q) = %v, want %v", tt.status, got, tt.alreadyStarted)
		}
		if got := recordingCanStop(recording); got != tt.canStop {
			t.Fatalf("recordingCanStop(%q) = %v, want %v", tt.status, got, tt.canStop)
		}
	}
}

func TestSanitizeAgoraPathPart(t *testing.T) {
	got := sanitizeAgoraPathPart("booking_123-456")
	if got != "booking123456" {
		t.Fatalf("sanitizeAgoraPathPart() = %q, want %q", got, "booking123456")
	}
}

func TestTruncateRecordingError(t *testing.T) {
	short := truncateRecordingError("short")
	if short != "short" {
		t.Fatalf("short error = %q, want short", short)
	}

	long := make([]byte, 600)
	for i := range long {
		long[i] = 'x'
	}
	truncated := truncateRecordingError(string(long))
	if len(truncated) != 500 {
		t.Fatalf("truncated error length = %d, want 500", len(truncated))
	}
}

func TestRecordingCanStopRequiresIdentifiersInCaller(t *testing.T) {
	recording := db.CoachingBookingRecording{
		Status:     db.CoachingRecordingStatusStarted,
		ResourceID: pgtype.Text{String: "resource", Valid: true},
		Sid:        pgtype.Text{String: "sid", Valid: true},
	}
	if !recordingCanStop(recording) {
		t.Fatal("recordingCanStop() = false, want true")
	}
}
