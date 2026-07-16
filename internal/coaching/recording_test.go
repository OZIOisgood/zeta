package coaching

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"slices"
	"strings"
	"testing"
	"time"

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

func TestAgoraStartRecordingSubscribesBothParticipantVideos(t *testing.T) {
	var capturedStart startRecordingRequest

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/cloud_recording/acquire"):
			writeTestJSON(t, w, acquireRecordingResponse{ResourceID: "resource-1"})
		case strings.Contains(r.URL.Path, "/cloud_recording/resourceid/resource-1/mode/mix/start"):
			if err := json.NewDecoder(r.Body).Decode(&capturedStart); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			writeTestJSON(t, w, startRecordingResponse{ResourceID: "resource-1", SID: "sid-1"})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := NewAgoraCloudRecordingClient(slog.Default(), AgoraCloudRecordingConfig{
		AppID:              "app-id",
		CustomerID:         "customer-id",
		CustomerSecret:     "customer-secret",
		BaseURL:            server.URL,
		StorageVendor:      1,
		StorageRegion:      0,
		StorageBucket:      "recordings",
		StorageAccessKey:   "access-key",
		StorageSecretKey:   "secret-key",
		TranscodingWidth:   1280,
		TranscodingHeight:  720,
		TranscodingBitrate: 2000,
		TranscodingFPS:     30,
	})

	_, err := client.Start(context.Background(), StartRecordingRequest{
		ChannelName: "coaching_booking-1",
		Token:       "recording-token",
		BookingID:   "booking-1",
	})
	if err != nil {
		t.Fatalf("Start() error = %v", err)
	}

	gotVideoUIDs := capturedStart.ClientRequest.RecordingConfig.SubscribeVideoUIDs
	wantVideoUIDs := []string{studentParticipantUID, expertParticipantUID}
	if !slices.Equal(gotVideoUIDs, wantVideoUIDs) {
		t.Fatalf("subscribeVideoUids = %v, want %v", gotVideoUIDs, wantVideoUIDs)
	}

	gotAudioUIDs := capturedStart.ClientRequest.RecordingConfig.SubscribeAudioUIDs
	wantAudioUIDs := []string{"#allstream#"}
	if !slices.Equal(gotAudioUIDs, wantAudioUIDs) {
		t.Fatalf("subscribeAudioUids = %v, want %v", gotAudioUIDs, wantAudioUIDs)
	}
}

func TestAgoraStartWebRecordingUsesPrivateRendererPage(t *testing.T) {
	var capturedAcquire acquireRecordingRequest
	var capturedStart startRecordingRequest
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/cloud_recording/acquire"):
			if err := json.NewDecoder(r.Body).Decode(&capturedAcquire); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			writeTestJSON(t, w, acquireRecordingResponse{ResourceID: "resource-web"})
		case strings.Contains(r.URL.Path, "/resourceid/resource-web/mode/web/start"):
			if err := json.NewDecoder(r.Body).Decode(&capturedStart); err != nil {
				http.Error(w, err.Error(), http.StatusBadRequest)
				return
			}
			writeTestJSON(t, w, startRecordingResponse{ResourceID: "resource-web", SID: "sid-web"})
		default:
			http.NotFound(w, r)
		}
	}))
	defer server.Close()

	client := NewAgoraCloudRecordingClient(slog.Default(), AgoraCloudRecordingConfig{
		AppID: "app-id", CustomerID: "customer-id", CustomerSecret: "customer-secret",
		BaseURL: server.URL, Mode: "web", StorageVendor: 6, StorageBucket: "recordings",
		StorageAccessKey: "access-key", StorageSecretKey: "secret-key",
		FileNamePrefix: []string{"live"}, TranscodingWidth: 1280, TranscodingHeight: 720,
	})
	started, err := client.Start(context.Background(), StartRecordingRequest{
		ChannelName: "coaching_booking", Token: "provider-token", BookingID: "booking-1",
		AttemptID: "attempt-2", UID: recordingBotUID,
		RendererURL: "https://app.example/recording-view#cap=secret",
	})
	if err != nil {
		t.Fatalf("Start() error = %v", err)
	}
	if capturedAcquire.ClientRequest.Scene != 1 {
		t.Fatalf("acquire scene = %d, want 1", capturedAcquire.ClientRequest.Scene)
	}
	if capturedStart.ClientRequest.RecordingConfig != nil {
		t.Fatal("web recording unexpectedly included composite recordingConfig")
	}
	extensions := capturedStart.ClientRequest.ExtensionServiceConfig
	if extensions == nil || len(extensions.ExtensionServices) != 1 {
		t.Fatalf("extensionServiceConfig = %#v, want one web recorder service", extensions)
	}
	service := extensions.ExtensionServices[0]
	if service.ServiceParam.URL != "https://app.example/recording-view#cap=secret" {
		t.Fatalf("renderer URL = %q", service.ServiceParam.URL)
	}
	if service.ServiceParam.VideoWidth != 1280 || service.ServiceParam.VideoHeight != 720 {
		t.Fatalf("renderer size = %dx%d, want 1280x720", service.ServiceParam.VideoWidth, service.ServiceParam.VideoHeight)
	}
	if !slices.Equal(started.FileNamePrefix, []string{"live", "booking1", "attempt2"}) {
		t.Fatalf("file prefix = %v", started.FileNamePrefix)
	}
}

func TestNewRendererCapabilityStoresOnlyHash(t *testing.T) {
	plaintext, hash, err := newRendererCapability()
	if err != nil {
		t.Fatalf("newRendererCapability() error = %v", err)
	}
	if len(plaintext) < 40 || len(hash) != sha256.Size {
		t.Fatalf("capability sizes = plaintext %d, hash %d", len(plaintext), len(hash))
	}
	want := sha256.Sum256([]byte(plaintext))
	if !slices.Equal(hash, want[:]) {
		t.Fatal("stored hash does not match capability SHA-256")
	}
	if strings.Contains(string(hash), plaintext) {
		t.Fatal("hash unexpectedly contains plaintext capability")
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

func TestRecordingShouldStopOnParticipantLeaveAfterScheduledEnd(t *testing.T) {
	now := time.Date(2026, 7, 7, 20, 0, 0, 0, time.UTC)
	booking := db.CoachingBooking{
		ScheduledAt:     pgtype.Timestamptz{Time: now.Add(-29 * time.Minute), Valid: true},
		DurationMinutes: 30,
	}
	if recordingShouldStopOnParticipantLeave(booking, now) {
		t.Fatal("recording should keep running when a participant leaves before scheduled end")
	}

	booking.ScheduledAt = pgtype.Timestamptz{Time: now.Add(-30 * time.Minute), Valid: true}
	if !recordingShouldStopOnParticipantLeave(booking, now) {
		t.Fatal("recording should stop when a participant leaves at or after scheduled end")
	}
}

func writeTestJSON(t *testing.T, w http.ResponseWriter, value any) {
	t.Helper()
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(value); err != nil {
		t.Fatalf("encode response: %v", err)
	}
}
