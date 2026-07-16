package coaching

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	rtctokenbuilder "github.com/AgoraIO-Community/go-tokenbuilder/rtctokenbuilder2"
	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/preferences"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
)

const (
	// TokenExpiration is the Agora token lifetime in seconds.
	TokenExpiration = uint32(3600)
)

type connectResponse struct {
	AppID           string                  `json:"app_id"`
	Channel         string                  `json:"channel"`
	Token           string                  `json:"token"`
	UID             uint32                  `json:"uid"`
	ConnectionID    string                  `json:"connection_id"`
	CallerRole      string                  `json:"caller_role"`
	ScheduledAt     time.Time               `json:"scheduled_at"`
	ScheduledEndsAt time.Time               `json:"scheduled_ends_at"`
	Student         participantPresentation `json:"student"`
	Expert          participantPresentation `json:"expert"`
}

type participantPresentation struct {
	UID         uint32 `json:"uid"`
	Role        string `json:"role"`
	DisplayName string `json:"display_name"`
	Avatar      string `json:"avatar,omitempty"`
}

// ConnectToBooking generates an Agora RTC token for an existing booking.
// The caller must be a participant (student or expert) and the current time
// must fall within the connectable window.
func (h *Handler) ConnectToBooking(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	bookingID, err := parseUUID(chi.URLParam(r, "bookingID"))
	if err != nil {
		http.Error(w, "Invalid booking ID", http.StatusBadRequest)
		return
	}

	// GetBooking scopes to expert_id OR student_id = user.ID.
	booking, err := h.q.GetBooking(ctx, db.GetBookingParams{
		ID:       bookingID,
		ExpertID: user.ID,
	})
	if err != nil {
		http.Error(w, "Booking not found", http.StatusNotFound)
		return
	}

	if booking.IsCancelled {
		http.Error(w, "Booking is cancelled", http.StatusBadRequest)
		return
	}

	// Time-window check: 15 min before → scheduled_at + duration.
	now := time.Now()
	windowStart := booking.ScheduledAt.Time.Add(-h.connectWindow)
	windowEnd := booking.ScheduledAt.Time.Add(time.Duration(booking.DurationMinutes)*time.Minute + h.recordingEndGrace)

	if now.Before(windowStart) {
		http.Error(w, "Too early to join — the session hasn't started yet", http.StatusBadRequest)
		return
	}
	if now.After(windowEnd) {
		http.Error(w, "Session has ended", http.StatusBadRequest)
		return
	}

	if h.agoraAppID == "" || h.agoraAppCertificate == "" {
		log.ErrorContext(ctx, "agora_config_missing", slog.String("component", "coaching"))
		http.Error(w, "Video calling is not configured", http.StatusServiceUnavailable)
		return
	}

	channelName := "coaching_" + uuidToString(booking.ID)
	uid := participantUIDForBooking(user.ID, booking)

	tokenTTL := uint32(max(300, int(time.Until(windowEnd).Seconds())))
	token, err := rtctokenbuilder.BuildTokenWithUid(
		h.agoraAppID,
		h.agoraAppCertificate,
		channelName,
		uid,
		rtctokenbuilder.RolePublisher,
		tokenTTL,
		tokenTTL,
	)
	if err != nil {
		log.ErrorContext(ctx, "agora_token_build_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to generate video token", http.StatusInternalServerError)
		return
	}

	student, err := h.participantPresentation(ctx, booking.StudentID, studentParticipantUID, "student")
	if err != nil {
		log.ErrorContext(ctx, "coaching_participant_presentation_failed", slog.String("component", "coaching"), slog.Any("err", err))
		http.Error(w, "Failed to prepare session", http.StatusInternalServerError)
		return
	}
	expert, err := h.participantPresentation(ctx, booking.ExpertID, expertParticipantUID, "expert")
	if err != nil {
		log.ErrorContext(ctx, "coaching_participant_presentation_failed", slog.String("component", "coaching"), slog.Any("err", err))
		http.Error(w, "Failed to prepare session", http.StatusInternalServerError)
		return
	}
	callerRole := "expert"
	if user.ID == booking.StudentID {
		callerRole = "student"
	}

	log.InfoContext(ctx, "agora_token_issued",
		slog.String("component", "coaching"),
		slog.String("booking_id", uuidToString(booking.ID)),
		slog.String("channel", channelName),
		slog.Uint64("uid", uint64(uid)),
	)

	writeJSON(w, http.StatusOK, connectResponse{
		AppID:           h.agoraAppID,
		Channel:         channelName,
		Token:           token,
		UID:             uid,
		ConnectionID:    uuid.NewString(),
		CallerRole:      callerRole,
		ScheduledAt:     booking.ScheduledAt.Time,
		ScheduledEndsAt: booking.ScheduledAt.Time.Add(time.Duration(booking.DurationMinutes) * time.Minute),
		Student:         student,
		Expert:          expert,
	})
}

func (h *Handler) participantPresentation(ctx context.Context, userID, agoraUID, role string) (participantPresentation, error) {
	prefs, err := h.q.GetUserPreferences(ctx, userID)
	if err != nil {
		return participantPresentation{}, err
	}
	return participantPresentation{
		UID:         uint32(mustParseNumericUID(agoraUID)),
		Role:        role,
		DisplayName: preferences.PublicDisplayName(prefs),
		Avatar:      prefs.Avatar,
	}, nil
}

func mustParseNumericUID(value string) int {
	if value == studentParticipantUID {
		return 1
	}
	return 2
}
