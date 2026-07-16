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
	presenceReconcileExtraWait = 2 * time.Second
	recordingProviderAgoraPage = "agora_page"
)

type bookingPresenceRequest struct {
	ConnectionID string `json:"connection_id"`
	State        string `json:"state"`
}

type bookingPresenceResponse struct {
	Status          string `json:"status"`
	RecordingStatus string `json:"recording_status"`
}

// UpdateBookingPresence tracks only authenticated human liveness. Joining the
// Agora channel counts even if camera and microphone permissions were denied.
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

	r.Body = http.MaxBytesReader(w, r.Body, 1024)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var req bookingPresenceRequest
	if err := decoder.Decode(&req); err != nil || (req.State != "joined" && req.State != "reconnecting" && req.State != "left") {
		http.Error(w, "Invalid presence payload", http.StatusBadRequest)
		return
	}
	connectionID, err := parseUUID(req.ConnectionID)
	if err != nil {
		http.Error(w, "Invalid connection ID", http.StatusBadRequest)
		return
	}
	role := "expert"
	if user.ID == booking.StudentID {
		role = "student"
	}

	if req.State == "left" {
		if _, err := h.q.RemoveBookingPresence(ctx, db.RemoveBookingPresenceParams{
			BookingID: booking.ID, ParticipantRole: role, ConnectionID: connectionID,
		}); err != nil {
			log.ErrorContext(ctx, "coaching_presence_remove_failed", slog.String("component", "coaching"), slog.Any("err", err))
			http.Error(w, "Failed to update presence", http.StatusInternalServerError)
			return
		}
	} else {
		if _, err := h.q.UpsertBookingPresence(ctx, db.UpsertBookingPresenceParams{
			BookingID: booking.ID, ParticipantRole: role, ConnectionID: connectionID,
		}); err != nil {
			log.ErrorContext(ctx, "coaching_presence_update_failed", slog.String("component", "coaching"), slog.Any("err", err))
			http.Error(w, "Failed to update presence", http.StatusInternalServerError)
			return
		}
		_ = h.q.ClearRecordingPartEmptySince(ctx, booking.ID)
	}

	activeHumans, err := h.q.CountFreshBookingParticipants(ctx, db.CountFreshBookingParticipantsParams{
		BookingID: booking.ID, FreshSeconds: int32(h.recordingPresenceTTL / time.Second),
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
			if part, getErr := h.q.GetActiveRecordingPart(ctx, booking.ID); getErr == nil {
				recordingStatus = string(part.Status)
			} else if errors.Is(getErr, pgx.ErrNoRows) {
				recordingStatus = "starting"
				h.startRecordingPartAsync(ctx, booking)
			}
		} else if part, getErr := h.q.GetActiveRecordingPart(ctx, booking.ID); getErr == nil {
			recordingStatus = string(part.Status)
			if _, markErr := h.q.MarkEmptyRecordingPartsWithoutFreshHumans(ctx, int32(h.recordingPresenceTTL/time.Second)); markErr == nil {
				h.reconcileRecordingAfterGrace(ctx, booking.ID)
			}
		}
	}

	writeJSON(w, http.StatusOK, bookingPresenceResponse{Status: "ok", RecordingStatus: recordingStatus})
}

func (h *Handler) startRecordingPartAsync(ctx context.Context, booking db.CoachingBooking) {
	go func() {
		runCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 105*time.Second)
		defer cancel()
		if err := h.startRecordingPart(runCtx, booking); err != nil && !errors.Is(err, pgx.ErrNoRows) {
			logger.From(runCtx, h.logger).ErrorContext(runCtx, "coaching_recording_part_start_failed",
				slog.String("component", "coaching"), slog.String("booking_id", uuidToString(booking.ID)), slog.Any("err", err))
		}
	}()
}

func (h *Handler) startRecordingPart(ctx context.Context, booking db.CoachingBooking) error {
	if !h.recordingEnabled || h.recordingClient == nil {
		return nil
	}
	capability, tokenHash, err := newRendererCapability()
	if err != nil {
		return err
	}
	hardStop := recordingBookingEnd(booking).Add(h.recordingEndGrace)
	if hardStop.Before(time.Now().Add(5 * time.Minute)) {
		hardStop = time.Now().Add(5 * time.Minute)
	}
	part, err := h.q.ClaimNextRecordingPart(ctx, db.ClaimNextRecordingPartParams{
		BookingID: booking.ID, Provider: recordingProviderAgoraPage,
		ProviderUid: nullableText(recordingBotUID), RendererTokenHash: tokenHash,
		RendererTokenExpiresAt: pgtype.Timestamptz{Time: hardStop.Add(5 * time.Minute), Valid: true},
	})
	if err != nil {
		return err
	}

	channelName := "coaching_" + uuidToString(booking.ID)
	providerTokenTTL := uint32(max(300, int(time.Until(hardStop).Seconds())))
	recordingToken, err := rtctokenbuilder.BuildTokenWithUid(
		h.agoraAppID, h.agoraAppCertificate, channelName, recordingBotUIDNum,
		rtctokenbuilder.RolePublisher, providerTokenTTL, providerTokenTTL,
	)
	if err != nil {
		_ = h.q.MarkRecordingPartFailed(ctx, db.MarkRecordingPartFailedParams{ID: part.ID, Error: nullableText(err.Error())})
		return err
	}
	rendererURL := strings.TrimRight(h.appBaseURL, "/") + "/recording-view#cap=" + capability
	started, err := h.recordingClient.Start(ctx, StartRecordingRequest{
		ChannelName: channelName, Token: recordingToken, BookingID: uuidToString(booking.ID),
		AttemptID: uuidToString(part.ID), UID: recordingBotUID, RendererURL: rendererURL,
	})
	if err != nil {
		_ = h.q.MarkRecordingPartFailed(ctx, db.MarkRecordingPartFailedParams{ID: part.ID, Error: nullableText(truncateRecordingError(err.Error()))})
		return err
	}
	_, err = h.q.MarkRecordingPartStarted(ctx, db.MarkRecordingPartStartedParams{
		ID: part.ID, ProviderResourceID: nullableText(started.ResourceID),
		ProviderRecordingID: nullableText(started.SID), ProviderUid: nullableText(started.UID),
		OutputPrefix: started.FileNamePrefix,
	})
	if err != nil {
		_ = h.recordingClient.Stop(ctx, StopRecordingRequest{
			ChannelName: channelName, ResourceID: started.ResourceID, SID: started.SID, UID: started.UID,
		})
	}
	return err
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
		timer := time.NewTimer(h.recordingEmptyGrace + presenceReconcileExtraWait)
		defer timer.Stop()
		<-timer.C
		runCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 30*time.Second)
		defer cancel()
		active, err := h.q.CountFreshBookingParticipants(runCtx, db.CountFreshBookingParticipantsParams{
			BookingID: bookingID, FreshSeconds: int32(h.recordingPresenceTTL / time.Second),
		})
		if err != nil || active > 0 {
			return
		}
		part, err := h.q.GetActiveRecordingPart(runCtx, bookingID)
		if err != nil || !part.EmptySinceAt.Valid || time.Since(part.EmptySinceAt.Time) < h.recordingEmptyGrace {
			return
		}
		if err := h.stopRecordingPart(runCtx, part); err != nil {
			logger.From(runCtx, h.logger).ErrorContext(runCtx, "coaching_recording_part_stop_failed",
				slog.String("component", "coaching"), slog.String("recording_id", uuidToString(part.ID)), slog.Any("err", err))
		}
	}()
}

func (h *Handler) stopRecordingPart(ctx context.Context, part db.CoachingBookingRecording) error {
	stopping, err := h.q.MarkRecordingPartStopping(ctx, part.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}
	if !stopping.ProviderResourceID.Valid || !stopping.ProviderRecordingID.Valid {
		_ = h.q.MarkRecordingPartFailed(ctx, db.MarkRecordingPartFailedParams{
			ID: stopping.ID, Error: nullableText("recording never returned a provider handle"),
		})
		return nil
	}
	uid := recordingBotUID
	if stopping.ProviderUid.Valid && stopping.ProviderUid.String != "" {
		uid = stopping.ProviderUid.String
	}
	if err := h.recordingClient.Stop(ctx, StopRecordingRequest{
		ChannelName: "coaching_" + uuidToString(stopping.BookingID),
		ResourceID:  stopping.ProviderResourceID.String, SID: stopping.ProviderRecordingID.String, UID: uid,
	}); err != nil {
		// Keep `stopping`: the durable cleanup job will retry transient failures.
		return err
	}
	stopped, err := h.q.MarkRecordingPartStopped(ctx, stopping.ID)
	if err != nil {
		return err
	}
	if err := h.discoverRecordingPartFiles(ctx, stopped); err != nil && !errors.Is(err, ErrRecordingMP4NotFound) {
		return err
	}
	h.kickRecordingImportProcessing(ctx)
	return nil
}

type rendererExchangeRequest struct {
	Capability string `json:"capability"`
}

type rendererExchangeResponse struct {
	AppID   string                  `json:"app_id"`
	Channel string                  `json:"channel"`
	Token   string                  `json:"token"`
	UID     uint32                  `json:"uid"`
	Student participantPresentation `json:"student"`
	Expert  participantPresentation `json:"expert"`
}

func (h *Handler) ExchangeRecordingRendererCapability(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Referrer-Policy", "no-referrer")
	r.Body = http.MaxBytesReader(w, r.Body, 1024)
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	var req rendererExchangeRequest
	if err := decoder.Decode(&req); err != nil || len(req.Capability) < 40 {
		http.Error(w, "Recording view unavailable", http.StatusNotFound)
		return
	}
	digest := sha256.Sum256([]byte(req.Capability))
	contextRow, err := h.q.ExchangeRecordingRendererCapability(r.Context(), digest[:])
	if err != nil {
		http.Error(w, "Recording view unavailable", http.StatusNotFound)
		return
	}
	channelName := "coaching_" + uuidToString(contextRow.BookingID)
	hardStop := contextRow.ScheduledAt.Time.Add(time.Duration(contextRow.DurationMinutes)*time.Minute + h.recordingEndGrace)
	tokenTTL := uint32(max(300, int(time.Until(hardStop).Seconds())))
	token, err := rtctokenbuilder.BuildTokenWithUid(
		h.agoraAppID, h.agoraAppCertificate, channelName, recordingRendererUID,
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
		AppID: h.agoraAppID, Channel: channelName, Token: token, UID: recordingRendererUID,
		Student: student, Expert: expert,
	})
}
