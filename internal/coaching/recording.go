package coaching

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
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
	studentParticipantUID = "1"
	expertParticipantUID  = "2"
	recordingBotUID       = "3"
	recordingBotUIDNum    = uint32(3)
)

// RecordingClient abstracts Agora Cloud Recording for tests and for keeping
// HTTP details out of request handlers.
type RecordingClient interface {
	Start(ctx context.Context, req StartRecordingRequest) (StartedRecording, error)
	Stop(ctx context.Context, req StopRecordingRequest) error
}

type StartRecordingRequest struct {
	ChannelName string
	Token       string
	BookingID   string
}

type StartedRecording struct {
	ResourceID     string
	SID            string
	UID            string
	FileNamePrefix []string
}

type StopRecordingRequest struct {
	ChannelName string
	ResourceID  string
	SID         string
	UID         string
}

type AgoraCloudRecordingConfig struct {
	AppID              string
	CustomerID         string
	CustomerSecret     string
	BaseURL            string
	Mode               string
	StorageVendor      int
	StorageRegion      int
	StorageBucket      string
	StorageAccessKey   string
	StorageSecretKey   string
	FileNamePrefix     []string
	MaxIdleTime        int
	TranscodingWidth   int
	TranscodingHeight  int
	TranscodingBitrate int
	TranscodingFPS     int
}

type agoraCloudRecordingClient struct {
	httpClient *http.Client
	logger     *slog.Logger
	cfg        AgoraCloudRecordingConfig
}

func NewAgoraCloudRecordingClient(logger *slog.Logger, cfg AgoraCloudRecordingConfig) RecordingClient {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.sd-rtn.com"
	}
	if cfg.Mode == "" {
		cfg.Mode = "mix"
	}
	if cfg.MaxIdleTime == 0 {
		cfg.MaxIdleTime = 30
	}
	if cfg.TranscodingWidth == 0 {
		cfg.TranscodingWidth = 640
	}
	if cfg.TranscodingHeight == 0 {
		cfg.TranscodingHeight = 360
	}
	if cfg.TranscodingBitrate == 0 {
		cfg.TranscodingBitrate = 1500
	}
	if cfg.TranscodingFPS == 0 {
		cfg.TranscodingFPS = 30
	}
	return &agoraCloudRecordingClient{
		httpClient: &http.Client{Timeout: 15 * time.Second},
		logger:     logger,
		cfg:        cfg,
	}
}

func (c *agoraCloudRecordingClient) Start(ctx context.Context, req StartRecordingRequest) (StartedRecording, error) {
	if err := c.validate(); err != nil {
		return StartedRecording{}, err
	}

	prefix := c.fileNamePrefix(req.BookingID)
	acquireReq := acquireRecordingRequest{
		CName: req.ChannelName,
		UID:   recordingBotUID,
		ClientRequest: acquireClientRequest{
			Scene:               0,
			ResourceExpiredHour: 24,
		},
	}

	var acquireResp acquireRecordingResponse
	if err := c.doJSON(ctx, http.MethodPost, "/v1/apps/"+url.PathEscape(c.cfg.AppID)+"/cloud_recording/acquire", acquireReq, &acquireResp); err != nil {
		return StartedRecording{}, fmt.Errorf("acquire agora recording resource: %w", err)
	}
	if acquireResp.ResourceID == "" {
		return StartedRecording{}, errors.New("acquire agora recording resource: empty resourceId")
	}

	startPath := fmt.Sprintf(
		"/v1/apps/%s/cloud_recording/resourceid/%s/mode/%s/start",
		url.PathEscape(c.cfg.AppID),
		url.PathEscape(acquireResp.ResourceID),
		url.PathEscape(c.cfg.Mode),
	)
	startReq := startRecordingRequest{
		CName: req.ChannelName,
		UID:   recordingBotUID,
		ClientRequest: startClientRequest{
			Token: req.Token,
			RecordingConfig: recordingConfig{
				ChannelType:        0,
				MaxIdleTime:        c.cfg.MaxIdleTime,
				StreamTypes:        2,
				VideoStreamType:    0,
				SubscribeAudioUIDs: []string{"#allstream#"},
				SubscribeVideoUIDs: []string{studentParticipantUID, expertParticipantUID},
				AudioProfile:       1,
				TranscodingConfig: transcodingConfig{
					Width:            c.cfg.TranscodingWidth,
					Height:           c.cfg.TranscodingHeight,
					Bitrate:          c.cfg.TranscodingBitrate,
					FPS:              c.cfg.TranscodingFPS,
					MixedVideoLayout: 1,
					BackgroundColor:  "#000000",
				},
			},
			RecordingFileConfig: recordingFileConfig{
				AVFileType: []string{"hls", "mp4"},
			},
			StorageConfig: storageConfig{
				Vendor:         c.cfg.StorageVendor,
				Region:         c.cfg.StorageRegion,
				Bucket:         c.cfg.StorageBucket,
				AccessKey:      c.cfg.StorageAccessKey,
				SecretKey:      c.cfg.StorageSecretKey,
				FileNamePrefix: prefix,
			},
		},
	}

	var startResp startRecordingResponse
	if err := c.doJSON(ctx, http.MethodPost, startPath, startReq, &startResp); err != nil {
		return StartedRecording{}, fmt.Errorf("start agora recording: %w", err)
	}
	if startResp.SID == "" {
		return StartedRecording{}, errors.New("start agora recording: empty sid")
	}

	return StartedRecording{
		ResourceID:     startResp.ResourceID,
		SID:            startResp.SID,
		UID:            recordingBotUID,
		FileNamePrefix: prefix,
	}, nil
}

func (c *agoraCloudRecordingClient) Stop(ctx context.Context, req StopRecordingRequest) error {
	if err := c.validate(); err != nil {
		return err
	}

	stopPath := fmt.Sprintf(
		"/v1/apps/%s/cloud_recording/resourceid/%s/sid/%s/mode/%s/stop",
		url.PathEscape(c.cfg.AppID),
		url.PathEscape(req.ResourceID),
		url.PathEscape(req.SID),
		url.PathEscape(c.cfg.Mode),
	)
	stopReq := stopRecordingRequest{
		CName: req.ChannelName,
		UID:   req.UID,
		ClientRequest: stopClientRequest{
			AsyncStop: false,
		},
	}

	if err := c.doJSON(ctx, http.MethodPost, stopPath, stopReq, nil); err != nil {
		var apiErr agoraAPIError
		if errors.As(err, &apiErr) && apiErr.StatusCode == http.StatusNotFound {
			return nil
		}
		return fmt.Errorf("stop agora recording: %w", err)
	}
	return nil
}

func (c *agoraCloudRecordingClient) validate() error {
	if c.cfg.AppID == "" || c.cfg.CustomerID == "" || c.cfg.CustomerSecret == "" {
		return errors.New("agora cloud recording credentials are not configured")
	}
	if c.cfg.StorageBucket == "" || c.cfg.StorageAccessKey == "" || c.cfg.StorageSecretKey == "" {
		return errors.New("agora cloud recording storage is not configured")
	}
	return nil
}

func (c *agoraCloudRecordingClient) fileNamePrefix(bookingID string) []string {
	prefix := append([]string{}, c.cfg.FileNamePrefix...)
	prefix = append(prefix, sanitizeAgoraPathPart(bookingID))
	return prefix
}

func (c *agoraCloudRecordingClient) doJSON(ctx context.Context, method, path string, body any, out any) error {
	base := strings.TrimRight(c.cfg.BaseURL, "/")
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	httpReq, err := http.NewRequestWithContext(ctx, method, base+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	httpReq.Header.Set("Content-Type", "application/json;charset=utf-8")
	credential := base64.StdEncoding.EncodeToString([]byte(c.cfg.CustomerID + ":" + c.cfg.CustomerSecret))
	httpReq.Header.Set("Authorization", "Basic "+credential)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if err != nil {
		return err
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return agoraAPIError{StatusCode: resp.StatusCode, Body: string(respBody)}
	}
	if out == nil || len(respBody) == 0 {
		return nil
	}
	if err := json.Unmarshal(respBody, out); err != nil {
		return err
	}
	return nil
}

type agoraAPIError struct {
	StatusCode int
	Body       string
}

func (e agoraAPIError) Error() string {
	if e.Body == "" {
		return fmt.Sprintf("agora returned HTTP %d", e.StatusCode)
	}
	return fmt.Sprintf("agora returned HTTP %d: %s", e.StatusCode, e.Body)
}

type acquireRecordingRequest struct {
	CName         string               `json:"cname"`
	UID           string               `json:"uid"`
	ClientRequest acquireClientRequest `json:"clientRequest"`
}

type acquireClientRequest struct {
	Scene               int `json:"scene"`
	ResourceExpiredHour int `json:"resourceExpiredHour"`
}

type acquireRecordingResponse struct {
	ResourceID string `json:"resourceId"`
}

type startRecordingRequest struct {
	CName         string             `json:"cname"`
	UID           string             `json:"uid"`
	ClientRequest startClientRequest `json:"clientRequest"`
}

type startClientRequest struct {
	Token               string              `json:"token,omitempty"`
	StorageConfig       storageConfig       `json:"storageConfig"`
	RecordingConfig     recordingConfig     `json:"recordingConfig"`
	RecordingFileConfig recordingFileConfig `json:"recordingFileConfig"`
}

type recordingConfig struct {
	ChannelType        int               `json:"channelType"`
	MaxIdleTime        int               `json:"maxIdleTime"`
	StreamTypes        int               `json:"streamTypes"`
	VideoStreamType    int               `json:"videoStreamType"`
	SubscribeAudioUIDs []string          `json:"subscribeAudioUids"`
	SubscribeVideoUIDs []string          `json:"subscribeVideoUids"`
	AudioProfile       int               `json:"audioProfile"`
	TranscodingConfig  transcodingConfig `json:"transcodingConfig"`
}

type transcodingConfig struct {
	Width            int    `json:"width"`
	Height           int    `json:"height"`
	Bitrate          int    `json:"bitrate"`
	FPS              int    `json:"fps"`
	MixedVideoLayout int    `json:"mixedVideoLayout"`
	BackgroundColor  string `json:"backgroundColor"`
}

type recordingFileConfig struct {
	AVFileType []string `json:"avFileType"`
}

type storageConfig struct {
	Vendor         int      `json:"vendor"`
	Region         int      `json:"region"`
	Bucket         string   `json:"bucket"`
	AccessKey      string   `json:"accessKey"`
	SecretKey      string   `json:"secretKey"`
	FileNamePrefix []string `json:"fileNamePrefix,omitempty"`
}

type startRecordingResponse struct {
	ResourceID string `json:"resourceId"`
	SID        string `json:"sid"`
}

type stopRecordingRequest struct {
	CName         string            `json:"cname"`
	UID           string            `json:"uid"`
	ClientRequest stopClientRequest `json:"clientRequest"`
}

type stopClientRequest struct {
	AsyncStop bool `json:"async_stop"`
}

func (h *Handler) ensureRecordingStarted(ctx context.Context, booking db.CoachingBooking, userID, channelName string) error {
	if !h.recordingEnabled {
		return nil
	}
	if h.recordingClient == nil {
		return errors.New("recording is enabled but no recording client is configured")
	}
	if h.pool == nil {
		return errors.New("recording requires a database pool")
	}

	recordingToken, err := rtctokenbuilder.BuildTokenWithUid(
		h.agoraAppID,
		h.agoraAppCertificate,
		channelName,
		recordingBotUIDNum,
		rtctokenbuilder.RolePublisher,
		TokenExpiration,
		TokenExpiration,
	)
	if err != nil {
		return fmt.Errorf("build recording token: %w", err)
	}

	tx, err := h.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	qtx := db.New(tx)
	lockedBooking, err := qtx.GetBookingForRecordingUpdate(ctx, db.GetBookingForRecordingUpdateParams{
		ID:       booking.ID,
		ExpertID: userID,
	})
	if err != nil {
		return err
	}
	existingRecording, err := qtx.GetBookingRecordingForUpdate(ctx, lockedBooking.ID)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return err
	}
	if err == nil && recordingAlreadyStarted(existingRecording) {
		return tx.Commit(ctx)
	}

	started, err := h.recordingClient.Start(ctx, StartRecordingRequest{
		ChannelName: channelName,
		Token:       recordingToken,
		BookingID:   uuidToString(booking.ID),
	})
	if err != nil {
		_ = qtx.MarkBookingRecordingFailed(ctx, db.MarkBookingRecordingFailedParams{
			BookingID: booking.ID,
			Error:     pgtype.Text{String: truncateRecordingError(err.Error()), Valid: true},
		})
		_ = tx.Commit(ctx)
		return err
	}

	_, err = qtx.MarkBookingRecordingStarted(ctx, db.MarkBookingRecordingStartedParams{
		BookingID:  booking.ID,
		ResourceID: pgtype.Text{String: started.ResourceID, Valid: true},
		Sid:        pgtype.Text{String: started.SID, Valid: true},
		Uid:        pgtype.Text{String: started.UID, Valid: true},
		FilePrefix: started.FileNamePrefix,
	})
	if err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (h *Handler) StopBookingRecording(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	user := auth.GetUser(ctx)
	if user == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	bookingID, err := parseUUIDFromRequest(r)
	if err != nil {
		http.Error(w, "Invalid booking ID", http.StatusBadRequest)
		return
	}

	booking, err := h.q.GetBooking(ctx, db.GetBookingParams{
		ID:       bookingID,
		ExpertID: user.ID,
	})
	if err != nil {
		http.Error(w, "Booking not found", http.StatusNotFound)
		return
	}

	if err := h.stopRecordingForBooking(ctx, booking.ID); err != nil {
		log := logger.From(ctx, h.logger)
		log.ErrorContext(ctx, "booking_recording_stop_failed",
			slog.String("component", "coaching"),
			slog.String("booking_id", uuidToString(booking.ID)),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to stop recording", http.StatusInternalServerError)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handler) CleanupFinishedRecordings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	bookings, err := h.q.ListRecordingsPastEnd(ctx, 100)
	if err != nil {
		log.ErrorContext(ctx, "list_finished_recordings_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list recordings", http.StatusInternalServerError)
		return
	}

	stopped := 0
	for _, booking := range bookings {
		if err := h.stopRecordingForBooking(ctx, booking.BookingID); err != nil {
			log.ErrorContext(ctx, "finished_recording_cleanup_failed",
				slog.String("component", "coaching"),
				slog.String("booking_id", uuidToString(booking.BookingID)),
				slog.Any("err", err),
			)
			continue
		}
		stopped++
	}

	imports, err := h.processPendingRecordingImports(ctx, maxRecordingImportsPerRun)
	if err != nil {
		log.ErrorContext(ctx, "recording_import_cleanup_process_failed",
			slog.String("component", "coaching"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to process recording imports", http.StatusInternalServerError)
		return
	}

	writeJSON(w, http.StatusOK, map[string]int{
		"processed":        len(bookings),
		"stopped":          stopped,
		"imports":          imports.Processed,
		"imports_ready":    imports.Ready,
		"imports_deferred": imports.Deferred,
		"imports_failed":   imports.Failed,
	})
}

func (h *Handler) stopRecordingForBooking(ctx context.Context, bookingID pgtype.UUID) error {
	if !h.recordingEnabled || h.recordingClient == nil {
		return nil
	}

	stopping, err := h.q.MarkBookingRecordingStopping(ctx, bookingID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil
		}
		return err
	}
	if !recordingCanStop(stopping) {
		return nil
	}
	if !stopping.ResourceID.Valid || !stopping.Sid.Valid {
		return nil
	}

	recordingUID := recordingBotUID
	if stopping.Uid.Valid && stopping.Uid.String != "" {
		recordingUID = stopping.Uid.String
	}
	err = h.recordingClient.Stop(ctx, StopRecordingRequest{
		ChannelName: "coaching_" + uuidToString(stopping.BookingID),
		ResourceID:  stopping.ResourceID.String,
		SID:         stopping.Sid.String,
		UID:         recordingUID,
	})
	if err != nil {
		_ = h.q.MarkBookingRecordingFailed(ctx, db.MarkBookingRecordingFailedParams{
			BookingID: stopping.BookingID,
			Error:     pgtype.Text{String: truncateRecordingError(err.Error()), Valid: true},
		})
		return err
	}

	_, err = h.q.MarkBookingRecordingStopped(ctx, stopping.BookingID)
	if err != nil {
		return err
	}
	if err := h.enqueueRecordingImport(ctx, stopping.BookingID); err != nil {
		return err
	}
	h.kickRecordingImportProcessing(ctx)
	return nil
}

func recordingAlreadyStarted(recording db.CoachingBookingRecording) bool {
	return recording.Status == db.CoachingRecordingStatusStarted ||
		recording.Status == db.CoachingRecordingStatusStopping ||
		recording.Status == db.CoachingRecordingStatusStopped
}

func recordingCanStop(recording db.CoachingBookingRecording) bool {
	return recording.Status == db.CoachingRecordingStatusStarted ||
		recording.Status == db.CoachingRecordingStatusStarting ||
		recording.Status == db.CoachingRecordingStatusStopping
}

func participantUIDForBooking(userID string, booking db.CoachingBooking) uint32 {
	if userID == booking.StudentID {
		return 1
	}
	return 2
}

func sanitizeAgoraPathPart(value string) string {
	replacer := strings.NewReplacer("-", "", "_", "")
	return replacer.Replace(value)
}

func truncateRecordingError(value string) string {
	const maxLen = 500
	if len(value) <= maxLen {
		return value
	}
	return value[:maxLen]
}

func parseUUIDFromRequest(r *http.Request) (pgtype.UUID, error) {
	return parseUUID(strings.TrimSpace(chi.URLParam(r, "bookingID")))
}
