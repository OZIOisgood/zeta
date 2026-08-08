package coaching

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	muxgo "github.com/muxinc/mux-go"
)

const maxRecordingImportsPerRun = int32(25)

type RecordingMuxClient interface {
	CreateAsset(req muxgo.CreateAssetRequest) (muxgo.AssetResponse, error)
	GetAsset(assetID string) (muxgo.AssetResponse, error)
}

func (h *Handler) ProcessRecordingImports(w http.ResponseWriter, r *http.Request) {
	result, err := h.processPendingRecordingImports(r.Context(), maxRecordingImportsPerRun)
	if err != nil {
		logger.From(r.Context(), h.logger).ErrorContext(r.Context(), "recording_import_process_failed",
			slog.String("component", "coaching"), slog.Any("err", err))
		http.Error(w, "Failed to process recordings", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, result)
}

type recordingImportRunResult struct {
	Processed int `json:"processed"`
	Ready     int `json:"ready"`
	Deferred  int `json:"deferred"`
	Failed    int `json:"failed"`
}

func (h *Handler) kickRecordingImportProcessing(ctx context.Context) {
	if h.recordingStore == nil || h.recordingMux == nil {
		return
	}
	go func() {
		runCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Minute)
		defer cancel()
		if _, err := h.processPendingRecordingImports(runCtx, 5); err != nil {
			logger.From(runCtx, h.logger).ErrorContext(runCtx, "recording_import_background_failed",
				slog.String("component", "coaching"), slog.Any("err", err))
		}
	}()
}

func (h *Handler) discoverRecordingPartFiles(ctx context.Context, part db.CoachingBookingRecording) error {
	if h.recordingStore == nil || len(part.OutputPrefix) == 0 {
		return nil
	}
	var objects []RecordingObject
	var err error
	if lister, ok := h.recordingStore.(recordingObjectLister); ok {
		objects, err = lister.ListMP4(ctx, part.OutputPrefix)
	} else {
		var object RecordingObject
		object, err = h.recordingStore.FindMP4(ctx, part.OutputPrefix)
		if err == nil {
			objects = []RecordingObject{object}
		}
	}
	if err != nil {
		return err
	}
	for index, object := range objects {
		if _, err := h.q.EnsureRecordingPartImport(ctx, db.EnsureRecordingPartImportParams{
			RecordingID: part.ID, FileIndex: int32(index + 1), GcsObjectName: nullableText(object.Name),
		}); err != nil {
			return err
		}
	}
	return nil
}

func (h *Handler) discoverStoppedRecordingFiles(ctx context.Context) error {
	parts, err := h.q.ListStoppedRecordingPartsForDiscovery(ctx, 100)
	if err != nil {
		return err
	}
	for _, part := range parts {
		if err := h.discoverRecordingPartFiles(ctx, part); err != nil && !errors.Is(err, ErrRecordingMP4NotFound) {
			return err
		}
	}
	return nil
}

func (h *Handler) processPendingRecordingImports(ctx context.Context, limit int32) (recordingImportRunResult, error) {
	var result recordingImportRunResult
	if h.recordingStore == nil || h.recordingMux == nil {
		return result, nil
	}
	if err := h.discoverStoppedRecordingFiles(ctx); err != nil {
		return result, err
	}
	if limit <= 0 {
		limit = maxRecordingImportsPerRun
	}
	imports, err := h.q.ClaimPendingRecordingPartImports(ctx, limit)
	if err != nil {
		return result, err
	}
	result.Processed = len(imports)
	for _, pending := range imports {
		ready, deferred, err := h.processRecordingPartImport(ctx, pending)
		switch {
		case err != nil:
			result.Failed++
		case ready:
			result.Ready++
		case deferred:
			result.Deferred++
		}
	}
	return result, nil
}

func (h *Handler) processRecordingPartImport(ctx context.Context, pending db.ClaimPendingRecordingPartImportsRow) (ready, deferred bool, err error) {
	objectName := textOrEmpty(pending.GcsObjectName)
	if objectName == "" {
		err := errors.New("recording import has no GCS object")
		h.markRecordingPartImportFailed(ctx, pending.ID, err)
		return false, false, err
	}
	muxAssetID := textOrEmpty(pending.MuxAssetID)
	playbackID := textOrEmpty(pending.MuxPlaybackID)
	if muxAssetID == "" {
		signedURL, err := h.recordingStore.SignedURL(ctx, objectName, recordingSignedURLTTL)
		if err != nil {
			h.markRecordingPartImportFailed(ctx, pending.ID, err)
			return false, false, err
		}
		assetResp, err := h.recordingMux.CreateAsset(muxgo.CreateAssetRequest{
			Input: []muxgo.InputSettings{{Url: signedURL}}, PlaybackPolicy: []muxgo.PlaybackPolicy{muxgo.PUBLIC},
			Passthrough: "coaching_recording_part:" + uuidToString(pending.RecordingID),
		})
		if err != nil {
			h.markRecordingPartImportFailed(ctx, pending.ID, err)
			return false, false, err
		}
		muxAssetID = assetResp.Data.Id
		playbackID = publicPlaybackID(assetResp.Data.PlaybackIds)
		if muxAssetID == "" {
			err := errors.New("mux create asset response did not include asset id")
			h.markRecordingPartImportFailed(ctx, pending.ID, err)
			return false, false, err
		}
		if _, err := h.q.MarkRecordingPartImportMuxCreated(ctx, db.MarkRecordingPartImportMuxCreatedParams{
			ID: pending.ID, MuxAssetID: nullableText(muxAssetID), MuxPlaybackID: nullableText(playbackID),
		}); err != nil {
			return false, false, err
		}
	}

	assetResp, err := h.recordingMux.GetAsset(muxAssetID)
	if err != nil {
		h.markRecordingPartImportFailed(ctx, pending.ID, err)
		return false, false, err
	}
	if playbackID == "" {
		playbackID = publicPlaybackID(assetResp.Data.PlaybackIds)
	}
	switch strings.ToLower(assetResp.Data.Status) {
	case "ready":
		if playbackID == "" {
			err := errors.New("ready mux asset has no public playback id")
			h.markRecordingPartImportFailed(ctx, pending.ID, err)
			return false, false, err
		}
		return h.createReviewableRecordingPart(ctx, pending, muxAssetID, playbackID, assetResp.Data.Duration)
	case "errored":
		err := fmt.Errorf("mux asset %s errored", muxAssetID)
		h.markRecordingPartImportFailed(ctx, pending.ID, err)
		return false, false, err
	default:
		_, err := h.q.MarkRecordingPartImportMuxCreated(ctx, db.MarkRecordingPartImportMuxCreatedParams{
			ID: pending.ID, MuxAssetID: nullableText(muxAssetID), MuxPlaybackID: nullableText(playbackID),
		})
		return false, true, err
	}
}

func (h *Handler) createReviewableRecordingPart(ctx context.Context, pending db.ClaimPendingRecordingPartImportsRow, muxAssetID, playbackID string, duration float64) (bool, bool, error) {
	if pending.VideoID.Valid {
		_, err := h.q.MarkRecordingPartImportReady(ctx, db.MarkRecordingPartImportReadyParams{
			ID: pending.ID, MuxAssetID: nullableText(muxAssetID), MuxPlaybackID: nullableText(playbackID), VideoID: pending.VideoID,
		})
		return err == nil, false, err
	}
	tx, err := h.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return false, false, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck
	qtx := db.New(tx)
	booking, err := qtx.GetBookingForRecordingAssetUpdate(ctx, pending.BookingID)
	if err != nil {
		return false, false, err
	}
	assetID := booking.RecordingAssetID
	if !assetID.Valid {
		asset, err := qtx.CreateAsset(ctx, db.CreateAssetParams{
			Name: recordingPartAssetTitle(pending), Description: recordingPartAssetDescription(pending),
			GroupID: pending.GroupID, OwnerID: pending.StudentID,
		})
		if err != nil {
			return false, false, err
		}
		if err := qtx.UpdateAssetStatus(ctx, db.UpdateAssetStatusParams{ID: asset.ID, Status: db.AssetStatusPending}); err != nil {
			return false, false, err
		}
		booking, err = qtx.AssignBookingRecordingAsset(ctx, db.AssignBookingRecordingAssetParams{ID: pending.BookingID, RecordingAssetID: asset.ID})
		if err != nil {
			return false, false, err
		}
		assetID = booking.RecordingAssetID
	}
	sortOrder := pending.PartNumber*1000 + pending.FileIndex
	video, err := qtx.CreateOrderedVideoFromMuxAsset(ctx, db.CreateOrderedVideoFromMuxAssetParams{
		AssetID: assetID, MuxAssetID: nullableText(muxAssetID), PlaybackID: nullableText(playbackID),
		SortOrder: pgtype.Int4{Int32: sortOrder, Valid: true},
	})
	if err != nil {
		return false, false, err
	}
	if _, err := qtx.MarkRecordingPartImportReady(ctx, db.MarkRecordingPartImportReadyParams{
		ID: pending.ID, MuxAssetID: nullableText(muxAssetID), MuxPlaybackID: nullableText(playbackID), VideoID: video.ID,
	}); err != nil {
		return false, false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return false, false, err
	}
	h.persistImportDuration(ctx, video.ID, duration)
	logger.From(ctx, h.logger).InfoContext(ctx, "recording_part_import_ready",
		slog.String("component", "coaching"), slog.String("booking_id", uuidToString(pending.BookingID)),
		slog.String("recording_id", uuidToString(pending.RecordingID)), slog.String("asset_id", uuidToString(assetID)),
		slog.String("video_id", uuidToString(video.ID)), slog.String("mux_asset_id", muxAssetID))
	return true, false, nil
}

func (h *Handler) persistImportDuration(ctx context.Context, videoID pgtype.UUID, duration float64) {
	if !videoID.Valid || duration <= 0 {
		return
	}
	if err := h.q.SetVideoDurationByID(ctx, db.SetVideoDurationByIDParams{
		ID: videoID, DurationSeconds: pgtype.Float8{Float64: duration, Valid: true},
	}); err != nil {
		h.logger.WarnContext(ctx, "recording_import_duration_persist_failed", slog.String("component", "coaching"), slog.Any("err", err))
	}
}

func (h *Handler) markRecordingPartImportFailed(ctx context.Context, importID pgtype.UUID, cause error) {
	_ = h.q.MarkRecordingPartImportFailed(ctx, db.MarkRecordingPartImportFailedParams{
		ID: importID, Error: nullableText(truncateRecordingError(cause.Error())),
	})
}

func publicPlaybackID(ids []muxgo.PlaybackId) string {
	for _, id := range ids {
		if id.Policy == muxgo.PUBLIC {
			return id.Id
		}
	}
	return ""
}

func recordingPartAssetTitle(pending db.ClaimPendingRecordingPartImportsRow) string {
	if pending.SessionTypeName != "" {
		return "Live coaching recording: " + pending.SessionTypeName
	}
	return "Live coaching recording"
}

func recordingPartAssetDescription(pending db.ClaimPendingRecordingPartImportsRow) string {
	if !pending.ScheduledAt.Valid {
		return "Automatically imported from a live coaching session recording."
	}
	return "Automatically imported from the live coaching session on " + pending.ScheduledAt.Time.Format(time.RFC1123) + "."
}

func textOrEmpty(value pgtype.Text) string {
	if !value.Valid {
		return ""
	}
	return value.String
}

func nullableText(value string) pgtype.Text {
	return pgtype.Text{String: value, Valid: value != ""}
}
