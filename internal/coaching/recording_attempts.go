package coaching

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"
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
	recordingRendererUID       = uint32(4)
	rendererCapabilityTTL      = 15 * time.Minute
	rendererCapabilityMaxUses  = int32(5)
	presenceReconcileExtraWait = 2 * time.Second
)

type bookingPresenceRequest struct {
	ConnectionID   string `json:"connection_id"`
	EventSeq       int64  `json:"event_seq"`
	State          string `json:"state"`
	AudioPublished bool   `json:"audio_published"`
	AudioEnabled   bool   `json:"audio_enabled"`
	VideoPublished bool   `json:"video_published"`
	VideoEnabled   bool   `json:"video_enabled"`
}

type bookingPresenceResponse struct {
	Status          string `json:"status"`
	RecordingStatus string `json:"recording_status"`
}

// UpdateBookingPresence is the server-authoritative human occupancy signal.
// A successful Agora join is reported as joined even when no tracks exist.
func (h *Handler) UpdateBookingPresence(w http.ResponseWriter, r *http.Request) {
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
		http.Error(w, "Booking not found", http.StatusNotFound)
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var req bookingPresenceRequest
	if err := decoder.Decode(&req); err != nil {
		http.Error(w, "Invalid presence payload", http.StatusBadRequest)
		return
	}
	connectionID, err := parseUUID(req.ConnectionID)
	if err != nil || req.EventSeq <= 0 {
		http.Error(w, "Invalid presence sequence", http.StatusBadRequest)
		return
	}
	if req.State != "joined" && req.State != "reconnecting" && req.State != "left" {
		http.Error(w, "Invalid presence state", http.StatusBadRequest)
		return
	}

	role := "expert"
	uid := int32(2)
	if user.ID == booking.StudentID {
		role = "student"
		uid = 1
	}
	connectionState := "connected"
	if req.State == "reconnecting" {
		connectionState = "reconnecting"
	} else if req.State == "left" {
		connectionState = "disconnected"
	}

	if req.EventSeq == 1 && req.State == "joined" {
		_, err = h.q.ActivateParticipantState(ctx, db.ActivateParticipantStateParams{
			BookingID: booking.ID, ParticipantRole: role, UserID: user.ID, AgoraUid: uid,
			ConnectionGeneration: connectionID, LastEventSeq: req.EventSeq,
			AudioPublished: req.AudioPublished, AudioEnabled: req.AudioEnabled,
			VideoPublished: req.VideoPublished, VideoEnabled: req.VideoEnabled,
		})
	} else {
		_, err = h.q.RefreshParticipantState(ctx, db.RefreshParticipantStateParams{
			BookingID: booking.ID, ParticipantRole: role, ConnectionGeneration: connectionID,
			ConnectionState: connectionState, LastEventSeq: req.EventSeq,
			AudioPublished: req.AudioPublished, AudioEnabled: req.AudioEnabled,
			VideoPublished: req.VideoPublished, VideoEnabled: req.VideoEnabled,
		})
	}
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			http.Error(w, "Stale presence update", http.StatusConflict)
			return
		}
		log.ErrorContext(ctx, "coaching_presence_update_failed", slog.String("component", "coaching"), slog.Any("err", err))
		http.Error(w, "Failed to update presence", http.StatusInternalServerError)
		return
	}

	activeHumans, err := h.q.CountFreshHumanParticipants(ctx, db.CountFreshHumanParticipantsParams{
		BookingID:    booking.ID,
		FreshSeconds: int32(h.recordingPresenceTTL / time.Second),
	})
	if err != nil {
		log.ErrorContext(ctx, "coaching_presence_count_failed", slog.String("component", "coaching"), slog.Any("err", err))
		writeJSON(w, http.StatusOK, bookingPresenceResponse{Status: "ok", RecordingStatus: "unknown"})
		return
	}

	recordingStatus := "disabled"
	if h.recordingEnabled {
		recordingStatus = "idle"
		if activeHumans > 0 {
			if attempt, getErr := h.q.GetActiveRecordingAttempt(ctx, booking.ID); getErr == nil {
				recordingStatus = string(attempt.Status)
				_ = h.q.ClearRecordingAttemptEmptySince(ctx, attempt.ID)
			} else if errors.Is(getErr, pgx.ErrNoRows) && req.State == "joined" {
				recordingStatus = "starting"
				h.startRecordingAttemptAsync(ctx, booking)
			}
		} else if attempt, getErr := h.q.GetActiveRecordingAttempt(ctx, booking.ID); getErr == nil {
			recordingStatus = string(attempt.Status)
			_ = h.q.SetRecordingAttemptEmptySince(ctx, attempt.ID)
			h.reconcileRecordingAfterGrace(ctx, booking.ID)
		}
	}

	writeJSON(w, http.StatusOK, bookingPresenceResponse{Status: "ok", RecordingStatus: recordingStatus})
}

func (h *Handler) startRecordingAttemptAsync(ctx context.Context, booking db.CoachingBooking) {
	go func() {
		runCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 45*time.Second)
		defer cancel()
		if err := h.startRecordingAttempt(runCtx, booking); err != nil && !errors.Is(err, pgx.ErrNoRows) {
			logger.From(runCtx, h.logger).ErrorContext(runCtx, "coaching_recording_attempt_start_failed",
				slog.String("component", "coaching"),
				slog.String("booking_id", uuidToString(booking.ID)),
				slog.Any("err", err),
			)
		}
	}()
}

func (h *Handler) startRecordingAttempt(ctx context.Context, booking db.CoachingBooking) error {
	if !h.recordingEnabled || h.recordingClient == nil {
		return nil
	}
	if _, err := h.q.EnsureRecordingCollection(ctx, booking.ID); err != nil {
		return err
	}
	attempt, err := h.q.ClaimNextRecordingAttempt(ctx, db.ClaimNextRecordingAttemptParams{
		BookingID: booking.ID, RecordingMode: h.recordingMode, ProviderUid: recordingBotUID,
	})
	if err != nil {
		return err
	}

	capability, tokenHash, err := newRendererCapability()
	if err != nil {
		_ = h.q.MarkRecordingAttemptFailed(ctx, db.MarkRecordingAttemptFailedParams{ID: attempt.ID, Error: nullableText(err.Error())})
		return err
	}
	if _, err := h.q.CreateRendererCapability(ctx, db.CreateRendererCapabilityParams{
		AttemptID:   attempt.ID,
		TokenHash:   tokenHash,
		RendererUid: int32(recordingRendererUID),
		ExpiresAt:   pgtype.Timestamptz{Time: time.Now().Add(rendererCapabilityTTL), Valid: true},
	}); err != nil {
		_ = h.q.MarkRecordingAttemptFailed(ctx, db.MarkRecordingAttemptFailedParams{ID: attempt.ID, Error: nullableText(err.Error())})
		return err
	}

	channelName := "coaching_" + uuidToString(booking.ID)
	providerTokenTTL := uint32(max(300, int(time.Until(recordingBookingEnd(booking).Add(h.recordingEndGrace)).Seconds())))
	recordingToken, err := rtctokenbuilder.BuildTokenWithUid(
		h.agoraAppID, h.agoraAppCertificate, channelName, recordingBotUIDNum,
		rtctokenbuilder.RolePublisher, providerTokenTTL, providerTokenTTL,
	)
	if err != nil {
		_ = h.q.MarkRecordingAttemptFailed(ctx, db.MarkRecordingAttemptFailedParams{ID: attempt.ID, Error: nullableText(err.Error())})
		return err
	}
	rendererURL := strings.TrimRight(h.appBaseURL, "/") + "/recording-view#cap=" + capability
	started, err := h.recordingClient.Start(ctx, StartRecordingRequest{
		ChannelName: channelName,
		Token:       recordingToken,
		BookingID:   uuidToString(booking.ID),
		AttemptID:   uuidToString(attempt.ID),
		UID:         attempt.ProviderUid,
		RendererURL: rendererURL,
	})
	if err != nil {
		_ = h.q.RevokeRendererCapability(ctx, attempt.ID)
		_ = h.q.MarkRecordingAttemptFailed(ctx, db.MarkRecordingAttemptFailedParams{ID: attempt.ID, Error: nullableText(truncateRecordingError(err.Error()))})
		return err
	}
	if _, err := h.q.MarkRecordingAttemptStarted(ctx, db.MarkRecordingAttemptStartedParams{
		ID:         attempt.ID,
		ResourceID: nullableText(started.ResourceID),
		Sid:        nullableText(started.SID),
		FilePrefix: started.FileNamePrefix,
	}); err != nil {
		_ = h.recordingClient.Stop(ctx, StopRecordingRequest{
			ChannelName: channelName, ResourceID: started.ResourceID, SID: started.SID, UID: started.UID,
		})
		return err
	}
	return nil
}

func newRendererCapability() (plaintext string, tokenHash []byte, err error) {
	raw := make([]byte, 32)
	if _, err := rand.Read(raw); err != nil {
		return "", nil, err
	}
	plaintext = base64.RawURLEncoding.EncodeToString(raw)
	digest := sha256.Sum256([]byte(plaintext))
	return plaintext, digest[:], nil
}

func (h *Handler) reconcileRecordingAfterGrace(ctx context.Context, bookingID pgtype.UUID) {
	go func() {
		delay := h.recordingEmptyGrace + presenceReconcileExtraWait
		timer := time.NewTimer(delay)
		defer timer.Stop()
		<-timer.C
		runCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 30*time.Second)
		defer cancel()
		activeHumans, err := h.q.CountFreshHumanParticipants(runCtx, db.CountFreshHumanParticipantsParams{
			BookingID: bookingID, FreshSeconds: int32(h.recordingPresenceTTL / time.Second),
		})
		if err != nil || activeHumans > 0 {
			return
		}
		attempt, err := h.q.GetActiveRecordingAttempt(runCtx, bookingID)
		if err != nil || !attempt.EmptySinceAt.Valid || time.Since(attempt.EmptySinceAt.Time) < h.recordingEmptyGrace {
			return
		}
		if err := h.stopRecordingAttempt(runCtx, attempt); err != nil {
			logger.From(runCtx, h.logger).ErrorContext(runCtx, "coaching_recording_attempt_stop_failed",
				slog.String("component", "coaching"), slog.String("attempt_id", uuidToString(attempt.ID)), slog.Any("err", err))
		}
	}()
}

func (h *Handler) stopRecordingAttempt(ctx context.Context, attempt db.CoachingRecordingAttempt) error {
	stopping, err := h.q.MarkRecordingAttemptStopping(ctx, attempt.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}
	if stopping.ResourceID.Valid && stopping.Sid.Valid {
		if err := h.recordingClient.Stop(ctx, StopRecordingRequest{
			ChannelName: "coaching_" + uuidToString(stopping.BookingID),
			ResourceID:  stopping.ResourceID.String,
			SID:         stopping.Sid.String,
			UID:         stopping.ProviderUid,
		}); err != nil {
			_ = h.q.MarkRecordingAttemptFailed(ctx, db.MarkRecordingAttemptFailedParams{ID: stopping.ID, Error: nullableText(truncateRecordingError(err.Error()))})
			return err
		}
	}
	if _, err := h.q.MarkRecordingAttemptStopped(ctx, stopping.ID); err != nil {
		return err
	}
	_ = h.q.RevokeRendererCapability(ctx, stopping.ID)
	if _, err := h.q.EnsureAttemptImportPending(ctx, stopping.ID); err != nil {
		return err
	}
	h.kickRecordingImportProcessing(ctx)
	return nil
}

type rendererExchangeRequest struct {
	Capability string `json:"capability"`
}

type rendererExchangeResponse struct {
	AttemptID       string                  `json:"attempt_id"`
	AppID           string                  `json:"app_id"`
	Channel         string                  `json:"channel"`
	Token           string                  `json:"token"`
	UID             uint32                  `json:"uid"`
	TokenExpiresAt  time.Time               `json:"token_expires_at"`
	ScheduledAt     time.Time               `json:"scheduled_at"`
	ScheduledEndsAt time.Time               `json:"scheduled_ends_at"`
	Student         participantPresentation `json:"student"`
	Expert          participantPresentation `json:"expert"`
}

func (h *Handler) ExchangeRecordingRendererCapability(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Referrer-Policy", "no-referrer")
	r.Body = http.MaxBytesReader(w, r.Body, 4096)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var req rendererExchangeRequest
	if err := decoder.Decode(&req); err != nil || len(req.Capability) < 40 {
		http.Error(w, "Recording view unavailable", http.StatusNotFound)
		return
	}
	digest := sha256.Sum256([]byte(req.Capability))
	capability, err := h.q.ExchangeRendererCapability(r.Context(), db.ExchangeRendererCapabilityParams{
		TokenHash: digest[:], MaxExchanges: rendererCapabilityMaxUses,
	})
	if err != nil {
		http.Error(w, "Recording view unavailable", http.StatusNotFound)
		return
	}
	contextRow, err := h.q.GetRecordingRendererContext(r.Context(), capability.AttemptID)
	if err != nil || (contextRow.AttemptStatus != db.CoachingRecordingStatusStarting && contextRow.AttemptStatus != db.CoachingRecordingStatusStarted) {
		http.Error(w, "Recording view unavailable", http.StatusNotFound)
		return
	}

	channelName := "coaching_" + uuidToString(contextRow.BookingID)
	hardStop := contextRow.ScheduledAt.Time.Add(time.Duration(contextRow.DurationMinutes)*time.Minute + h.recordingEndGrace)
	tokenTTL := uint32(max(300, int(time.Until(hardStop).Seconds())))
	token, err := rtctokenbuilder.BuildTokenWithUid(
		h.agoraAppID, h.agoraAppCertificate, channelName, uint32(capability.RendererUid),
		rtctokenbuilder.RoleSubscriber, tokenTTL, tokenTTL,
	)
	if err != nil {
		http.Error(w, "Recording view unavailable", http.StatusNotFound)
		return
	}
	student, err := h.participantPresentation(r.Context(), contextRow.StudentID, studentParticipantUID, "student")
	if err != nil {
		http.Error(w, "Recording view unavailable", http.StatusNotFound)
		return
	}
	expert, err := h.participantPresentation(r.Context(), contextRow.ExpertID, expertParticipantUID, "expert")
	if err != nil {
		http.Error(w, "Recording view unavailable", http.StatusNotFound)
		return
	}
	writeJSON(w, http.StatusOK, rendererExchangeResponse{
		AttemptID: uuidToString(capability.AttemptID), AppID: h.agoraAppID, Channel: channelName,
		Token: token, UID: uint32(capability.RendererUid), TokenExpiresAt: time.Now().Add(time.Duration(tokenTTL) * time.Second),
		ScheduledAt:     contextRow.ScheduledAt.Time,
		ScheduledEndsAt: contextRow.ScheduledAt.Time.Add(time.Duration(contextRow.DurationMinutes) * time.Minute),
		Student:         student, Expert: expert,
	})
}
