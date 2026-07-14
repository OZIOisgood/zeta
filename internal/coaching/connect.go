package coaching

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	rtctokenbuilder "github.com/AgoraIO-Community/go-tokenbuilder/rtctokenbuilder2"
	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

const (
	// TokenExpiration is the Agora token lifetime in seconds.
	TokenExpiration = uint32(3600)
)

type connectResponse struct {
	AppID           string    `json:"app_id"`
	Channel         string    `json:"channel"`
	Token           string    `json:"token"`
	UID             uint32    `json:"uid"`
	ScheduledAt     time.Time `json:"scheduled_at"`
	DurationMinutes int32     `json:"duration_minutes"`
	CanEndSession   bool      `json:"can_end_session"`
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
	if booking.EndedAt.Valid {
		http.Error(w, "Session has ended", http.StatusBadRequest)
		return
	}

	// Time-window check: 15 min before → scheduled_at + duration.
	now := time.Now()
	windowStart := booking.ScheduledAt.Time.Add(-h.connectWindow)
	windowEnd := booking.ScheduledAt.Time.Add(time.Duration(booking.DurationMinutes) * time.Minute)

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

	token, err := rtctokenbuilder.BuildTokenWithUid(
		h.agoraAppID,
		h.agoraAppCertificate,
		channelName,
		uid,
		rtctokenbuilder.RolePublisher,
		TokenExpiration,
		TokenExpiration,
	)
	if err != nil {
		log.ErrorContext(ctx, "agora_token_build_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to generate video token", http.StatusInternalServerError)
		return
	}

	if err := h.ensureRecordingStarted(ctx, booking, user.ID, channelName); err != nil {
		log.ErrorContext(ctx, "booking_recording_start_failed",
			slog.String("component", "coaching"),
			slog.String("booking_id", uuidToString(booking.ID)),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to start recording", http.StatusInternalServerError)
		return
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
		ScheduledAt:     booking.ScheduledAt.Time,
		DurationMinutes: booking.DurationMinutes,
		CanEndSession:   booking.ExpertID == user.ID,
	})
}

// EndBooking ends an in-progress session at the expert's request. Ending a
// session blocks future connection attempts and immediately stops its active
// recording before the end state is persisted.
func (h *Handler) EndBooking(w http.ResponseWriter, r *http.Request) {
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

	booking, err := h.q.GetBooking(ctx, db.GetBookingParams{ID: bookingID, ExpertID: user.ID})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Booking not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch booking", http.StatusInternalServerError)
		return
	}
	if booking.ExpertID != user.ID {
		http.Error(w, "Only the session expert can end the session", http.StatusForbidden)
		return
	}
	if booking.IsCancelled || booking.EndedAt.Valid {
		http.Error(w, "Session is no longer active", http.StatusConflict)
		return
	}
	if !bookingInProgress(booking, time.Now()) {
		http.Error(w, "Session is not in progress", http.StatusBadRequest)
		return
	}

	if err := h.stopRecordingForBooking(ctx, booking.ID); err != nil {
		log.ErrorContext(ctx, "end_booking_recording_stop_failed",
			slog.String("component", "coaching"),
			slog.String("booking_id", uuidToString(booking.ID)),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to stop session recording", http.StatusInternalServerError)
		return
	}

	_, err = h.q.EndBooking(ctx, db.EndBookingParams{
		ID:      booking.ID,
		EndedBy: pgtype.Text{String: user.ID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Session is no longer active", http.StatusConflict)
			return
		}
		log.ErrorContext(ctx, "end_booking_failed",
			slog.String("component", "coaching"),
			slog.String("booking_id", uuidToString(booking.ID)),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to end session", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "booking_ended",
		slog.String("component", "coaching"),
		slog.String("booking_id", uuidToString(booking.ID)),
	)
	writeJSON(w, http.StatusOK, map[string]string{"status": "ended"})
}

func bookingInProgress(booking db.CoachingBooking, now time.Time) bool {
	return !now.Before(booking.ScheduledAt.Time) && now.Before(recordingBookingEnd(booking))
}
