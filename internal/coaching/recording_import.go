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
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	result, err := h.processPendingRecordingImports(ctx, maxRecordingImportsPerRun)
	if err != nil {
		log.ErrorContext(ctx, "recording_import_process_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
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

func (h *Handler) enqueueRecordingImport(ctx context.Context, bookingID pgtype.UUID) error {
	if h.recordingStore == nil || h.recordingMux == nil {
		return nil
	}
	_, err := h.q.EnsureRecordingImportPending(ctx, bookingID)
	return err
}

func (h *Handler) kickRecordingImportProcessing(ctx context.Context) {
	if h.recordingStore == nil || h.recordingMux == nil {
		return
	}
	go func() {
		runCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), 2*time.Minute)
		defer cancel()
		if _, err := h.processPendingRecordingImports(runCtx, 5); err != nil {
			log := logger.From(runCtx, h.logger)
			log.ErrorContext(runCtx, "recording_import_background_failed",
				slog.String("component", "coaching"),
				slog.Any("err", err),
			)
		}
	}()
}

func (h *Handler) processPendingRecordingImports(ctx context.Context, limit int32) (recordingImportRunResult, error) {
	var result recordingImportRunResult
	if h.recordingStore == nil || h.recordingMux == nil {
		return result, nil
	}
	if limit <= 0 {
		limit = maxRecordingImportsPerRun
	}

	if _, err := h.q.CreateMissingRecordingImports(ctx); err != nil {
		return result, err
	}

	imports, err := h.q.ListPendingRecordingImports(ctx, limit)
	if err != nil {
		return result, err
	}
	result.Processed = len(imports)

	for _, pending := range imports {
		ready, deferred, err := h.processRecordingImport(ctx, pending)
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

func (h *Handler) processRecordingImport(ctx context.Context, pending db.ListPendingRecordingImportsRow) (ready bool, deferred bool, err error) {
	log := logger.From(ctx, h.logger)
	bookingID := uuidToString(pending.BookingID)

	if _, err := h.q.MarkRecordingImportImporting(ctx, pending.BookingID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return false, true, nil
		}
		return false, false, err
	}

	object := RecordingObject{Name: textOrEmpty(pending.GcsObjectName)}
	if object.Name == "" {
		object, err = h.recordingStore.FindMP4(ctx, pending.FilePrefix)
		if err != nil {
			h.markRecordingImportFailed(ctx, pending.BookingID, err)
			log.ErrorContext(ctx, "recording_import_mp4_lookup_failed",
				slog.String("component", "coaching"),
				slog.String("booking_id", bookingID),
				slog.Any("err", err),
			)
			return false, false, err
		}
	}

	muxAssetID := textOrEmpty(pending.MuxAssetID)
	playbackID := textOrEmpty(pending.MuxPlaybackID)
	if muxAssetID == "" {
		signedURL, err := h.recordingStore.SignedURL(ctx, object.Name, recordingSignedURLTTL)
		if err != nil {
			h.markRecordingImportFailed(ctx, pending.BookingID, err)
			return false, false, err
		}

		assetResp, err := h.recordingMux.CreateAsset(muxgo.CreateAssetRequest{
			Input: []muxgo.InputSettings{
				{Url: signedURL},
			},
			PlaybackPolicy: []muxgo.PlaybackPolicy{muxgo.PUBLIC},
			Passthrough:    "coaching_recording:" + bookingID,
		})
		if err != nil {
			h.markRecordingImportFailed(ctx, pending.BookingID, err)
			return false, false, err
		}
		muxAssetID = assetResp.Data.Id
		playbackID = publicPlaybackID(assetResp.Data.PlaybackIds)
		if muxAssetID == "" {
			err := errors.New("mux create asset response did not include asset id")
			h.markRecordingImportFailed(ctx, pending.BookingID, err)
			return false, false, err
		}

		_, err = h.q.MarkRecordingImportMuxCreated(ctx, db.MarkRecordingImportMuxCreatedParams{
			BookingID:     pending.BookingID,
			GcsObjectName: pgtype.Text{String: object.Name, Valid: true},
			MuxAssetID:    pgtype.Text{String: muxAssetID, Valid: true},
			MuxPlaybackID: nullableText(playbackID),
		})
		if err != nil {
			return false, false, err
		}
		log.InfoContext(ctx, "recording_import_mux_asset_created",
			slog.String("component", "coaching"),
			slog.String("booking_id", bookingID),
			slog.String("mux_asset_id", muxAssetID),
		)
	}

	assetResp, err := h.recordingMux.GetAsset(muxAssetID)
	if err != nil {
		h.markRecordingImportFailed(ctx, pending.BookingID, err)
		return false, false, err
	}
	if playbackID == "" {
		playbackID = publicPlaybackID(assetResp.Data.PlaybackIds)
	}

	switch strings.ToLower(assetResp.Data.Status) {
	case "ready":
		if playbackID == "" {
			err := errors.New("ready mux asset has no public playback id")
			h.markRecordingImportFailed(ctx, pending.BookingID, err)
			return false, false, err
		}
		return h.createReviewableRecordingAsset(ctx, pending, object.Name, muxAssetID, playbackID, assetResp.Data.Duration)
	case "errored":
		err := fmt.Errorf("mux asset %s errored", muxAssetID)
		h.markRecordingImportFailed(ctx, pending.BookingID, err)
		return false, false, err
	default:
		_, err = h.q.MarkRecordingImportMuxCreated(ctx, db.MarkRecordingImportMuxCreatedParams{
			BookingID:     pending.BookingID,
			GcsObjectName: pgtype.Text{String: object.Name, Valid: true},
			MuxAssetID:    pgtype.Text{String: muxAssetID, Valid: true},
			MuxPlaybackID: nullableText(playbackID),
		})
		return false, true, err
	}
}

func (h *Handler) createReviewableRecordingAsset(ctx context.Context, pending db.ListPendingRecordingImportsRow, objectName, muxAssetID, playbackID string, duration float64) (bool, bool, error) {
	if pending.AssetID.Valid && pending.VideoID.Valid {
		_, err := h.q.MarkRecordingImportReady(ctx, db.MarkRecordingImportReadyParams{
			BookingID:     pending.BookingID,
			GcsObjectName: pgtype.Text{String: objectName, Valid: true},
			MuxAssetID:    pgtype.Text{String: muxAssetID, Valid: true},
			MuxPlaybackID: pgtype.Text{String: playbackID, Valid: true},
			AssetID:       pending.AssetID,
			VideoID:       pending.VideoID,
		})
		if err != nil {
			return false, false, err
		}
		h.persistImportDuration(ctx, pending.VideoID, duration)
		return true, false, nil
	}

	tx, err := h.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return false, false, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	qtx := db.New(tx)
	title := recordingAssetTitle(pending)
	description := recordingAssetDescription(pending)
	asset, err := qtx.CreateAsset(ctx, db.CreateAssetParams{
		Name:        title,
		Description: description,
		GroupID:     pending.GroupID,
		OwnerID:     pending.StudentID,
	})
	if err != nil {
		return false, false, err
	}
	video, err := qtx.CreateVideoFromMuxAsset(ctx, db.CreateVideoFromMuxAssetParams{
		AssetID:    asset.ID,
		MuxAssetID: pgtype.Text{String: muxAssetID, Valid: true},
		PlaybackID: pgtype.Text{String: playbackID, Valid: true},
	})
	if err != nil {
		return false, false, err
	}
	if err := qtx.UpdateAssetStatus(ctx, db.UpdateAssetStatusParams{
		ID:     asset.ID,
		Status: db.AssetStatusPending,
	}); err != nil {
		return false, false, err
	}
	if _, err := qtx.MarkRecordingImportReady(ctx, db.MarkRecordingImportReadyParams{
		BookingID:     pending.BookingID,
		GcsObjectName: pgtype.Text{String: objectName, Valid: true},
		MuxAssetID:    pgtype.Text{String: muxAssetID, Valid: true},
		MuxPlaybackID: pgtype.Text{String: playbackID, Valid: true},
		AssetID:       asset.ID,
		VideoID:       video.ID,
	}); err != nil {
		return false, false, err
	}
	if err := tx.Commit(ctx); err != nil {
		return false, false, err
	}

	// Persist duration outside the transaction (best-effort; SetVideoDurationByID
	// is a no-op if already set, so retries are safe).
	h.persistImportDuration(ctx, video.ID, duration)

	log := logger.From(ctx, h.logger)
	log.InfoContext(ctx, "recording_import_ready",
		slog.String("component", "coaching"),
		slog.String("booking_id", uuidToString(pending.BookingID)),
		slog.String("asset_id", uuidToString(asset.ID)),
		slog.String("video_id", uuidToString(video.ID)),
		slog.String("mux_asset_id", muxAssetID),
	)
	return true, false, nil
}

// persistImportDuration stores the Mux-reported duration for a coaching-import
// video by its DB ID. Best-effort: failures are logged but never block the caller.
func (h *Handler) persistImportDuration(ctx context.Context, videoID pgtype.UUID, duration float64) {
	if !videoID.Valid || duration <= 0 {
		return
	}
	if err := h.q.SetVideoDurationByID(ctx, db.SetVideoDurationByIDParams{
		ID:              videoID,
		DurationSeconds: pgtype.Float8{Float64: duration, Valid: true},
	}); err != nil {
		h.logger.WarnContext(ctx, "recording_import_duration_persist_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
	}
}

func (h *Handler) markRecordingImportFailed(ctx context.Context, bookingID pgtype.UUID, cause error) {
	_ = h.q.MarkRecordingImportFailed(ctx, db.MarkRecordingImportFailedParams{
		BookingID: bookingID,
		Error:     pgtype.Text{String: truncateRecordingError(cause.Error()), Valid: true},
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

func recordingAssetTitle(pending db.ListPendingRecordingImportsRow) string {
	if pending.SessionTypeName != "" {
		return "Live coaching recording: " + pending.SessionTypeName
	}
	return "Live coaching recording"
}

func recordingAssetDescription(pending db.ListPendingRecordingImportsRow) string {
	if !pending.ScheduledAt.Valid {
		return "Automatically imported from a live coaching session recording."
	}
	return "Automatically imported from the live coaching session on " +
		pending.ScheduledAt.Time.Format(time.RFC1123) + "."
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
