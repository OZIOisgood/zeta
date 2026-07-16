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

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/go-chi/chi/v5"
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
	AttemptID   string
	UID         string
	RendererURL string
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

// Agora recommends checking Page Recording after receiving the SID because a
// successful Start response does not prove that the renderer page loaded.
var agoraWebQueryBackoff = []time.Duration{
	5 * time.Second,
	10 * time.Second,
	15 * time.Second,
	30 * time.Second,
	30 * time.Second,
}

func NewAgoraCloudRecordingClient(logger *slog.Logger, cfg AgoraCloudRecordingConfig) RecordingClient {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://api.sd-rtn.com"
	}
	if cfg.Mode == "" {
		cfg.Mode = "mix"
	}
	if cfg.MaxIdleTime == 0 {
		cfg.MaxIdleTime = 120
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

	recordingUID := req.UID
	if recordingUID == "" {
		recordingUID = recordingBotUID
	}
	prefix := c.fileNamePrefix(req.BookingID, req.AttemptID)
	scene := 0
	if c.cfg.Mode == "web" {
		scene = 1
		if strings.TrimSpace(req.RendererURL) == "" {
			return StartedRecording{}, errors.New("web page recording requires a renderer URL")
		}
	}
	acquireReq := acquireRecordingRequest{
		CName: req.ChannelName,
		UID:   recordingUID,
		ClientRequest: acquireClientRequest{
			Scene:               scene,
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
		UID:   recordingUID,
		ClientRequest: startClientRequest{
			Token: req.Token,
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
	if c.cfg.Mode == "web" {
		startReq.ClientRequest.RecordingFileConfig = &recordingFileConfig{AVFileType: []string{"hls", "mp4"}}
		startReq.ClientRequest.ExtensionServiceConfig = &extensionServiceConfig{
			ErrorHandlePolicy: "error_abort",
			ExtensionServices: []extensionService{
				{
					ServiceName:       "web_recorder_service",
					ErrorHandlePolicy: "error_abort",
					ServiceParam: webRecorderServiceParam{
						URL:              req.RendererURL,
						AudioProfile:     1,
						VideoWidth:       c.cfg.TranscodingWidth,
						VideoHeight:      c.cfg.TranscodingHeight,
						VideoBitrate:     c.cfg.TranscodingBitrate,
						VideoFPS:         c.cfg.TranscodingFPS,
						MaxRecordingHour: 4,
						ReadyTimeout:     60,
						// Let the renderer load, join Agora, subscribe, and paint its
						// first usable frame before Agora starts producing video files.
						OnHold: true,
						// Agora measures this value in minutes. Zeta sessions are at most 120 minutes.
						MaxVideoDuration: 240,
					},
				},
			},
		}
	} else {
		startReq.ClientRequest.RecordingConfig = &recordingConfig{
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
		}
		startReq.ClientRequest.RecordingFileConfig = &recordingFileConfig{
			AVFileType: []string{"hls", "mp4"},
		}
	}

	var startResp startRecordingResponse
	if err := c.doJSON(ctx, http.MethodPost, startPath, startReq, &startResp); err != nil {
		return StartedRecording{}, fmt.Errorf("start agora recording: %w", err)
	}
	if startResp.SID == "" {
		return StartedRecording{}, errors.New("start agora recording: empty sid")
	}
	if c.cfg.Mode == "web" {
		if err := c.waitForWebRecording(ctx, req.ChannelName, recordingUID, acquireResp.ResourceID, startResp.SID); err != nil {
			_ = c.Stop(context.WithoutCancel(ctx), StopRecordingRequest{
				ChannelName: req.ChannelName, ResourceID: acquireResp.ResourceID, SID: startResp.SID, UID: recordingUID,
			})
			return StartedRecording{}, err
		}
		if err := c.resumeWebRecording(ctx, req.ChannelName, recordingUID, acquireResp.ResourceID, startResp.SID); err != nil {
			_ = c.Stop(context.WithoutCancel(ctx), StopRecordingRequest{
				ChannelName: req.ChannelName, ResourceID: acquireResp.ResourceID, SID: startResp.SID, UID: recordingUID,
			})
			return StartedRecording{}, err
		}
	}

	return StartedRecording{
		ResourceID:     startResp.ResourceID,
		SID:            startResp.SID,
		UID:            recordingUID,
		FileNamePrefix: prefix,
	}, nil
}

func (c *agoraCloudRecordingClient) resumeWebRecording(ctx context.Context, channelName, uid, resourceID, sid string) error {
	updatePath := fmt.Sprintf(
		"/v1/apps/%s/cloud_recording/resourceid/%s/sid/%s/mode/web/update",
		url.PathEscape(c.cfg.AppID), url.PathEscape(resourceID), url.PathEscape(sid),
	)
	updateReq := updateRecordingRequest{
		CName: channelName,
		UID:   uid,
		ClientRequest: updateClientRequest{
			WebRecordingConfig: webRecordingConfig{OnHold: false},
		},
	}
	if err := c.doJSON(ctx, http.MethodPost, updatePath, updateReq, nil); err != nil {
		return fmt.Errorf("resume agora page recording: %w", err)
	}
	return nil
}

func (c *agoraCloudRecordingClient) waitForWebRecording(ctx context.Context, channelName, uid, resourceID, sid string) error {
	queryPath := fmt.Sprintf(
		"/v1/apps/%s/cloud_recording/resourceid/%s/sid/%s/mode/web/query",
		url.PathEscape(c.cfg.AppID), url.PathEscape(resourceID), url.PathEscape(sid),
	)
	for _, delay := range agoraWebQueryBackoff {
		timer := time.NewTimer(delay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return ctx.Err()
		case <-timer.C:
		}
		var queryResp queryRecordingResponse
		if err := c.doJSON(ctx, http.MethodGet, queryPath, nil, &queryResp); err != nil {
			continue
		}
		if queryResp.ServerResponse.Status == 4 || queryResp.ServerResponse.Status == 5 {
			return nil
		}
		if queryResp.ServerResponse.Status == 20 {
			return errors.New("agora page recording exited unexpectedly")
		}
	}
	return fmt.Errorf("agora page recording did not become ready for channel %s", channelName)
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

func (c *agoraCloudRecordingClient) fileNamePrefix(bookingID, attemptID string) []string {
	prefix := append([]string{}, c.cfg.FileNamePrefix...)
	prefix = append(prefix, sanitizeAgoraPathPart(bookingID))
	if attemptID != "" {
		prefix = append(prefix, sanitizeAgoraPathPart(attemptID))
	}
	return prefix
}

func (c *agoraCloudRecordingClient) doJSON(ctx context.Context, method, path string, body any, out any) error {
	base := strings.TrimRight(c.cfg.BaseURL, "/")
	var payload []byte
	var bodyReader io.Reader
	if body != nil {
		var err error
		payload, err = json.Marshal(body)
		if err != nil {
			return err
		}
		bodyReader = bytes.NewReader(payload)
	}

	httpReq, err := http.NewRequestWithContext(ctx, method, base+path, bodyReader)
	if err != nil {
		return err
	}
	if body != nil {
		httpReq.Header.Set("Content-Type", "application/json;charset=utf-8")
	}
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
	Token                  string                  `json:"token,omitempty"`
	StorageConfig          storageConfig           `json:"storageConfig"`
	RecordingConfig        *recordingConfig        `json:"recordingConfig,omitempty"`
	RecordingFileConfig    *recordingFileConfig    `json:"recordingFileConfig,omitempty"`
	ExtensionServiceConfig *extensionServiceConfig `json:"extensionServiceConfig,omitempty"`
}

type extensionServiceConfig struct {
	ErrorHandlePolicy string             `json:"errorHandlePolicy"`
	ExtensionServices []extensionService `json:"extensionServices"`
}

type extensionService struct {
	ServiceName       string                  `json:"serviceName"`
	ErrorHandlePolicy string                  `json:"errorHandlePolicy"`
	ServiceParam      webRecorderServiceParam `json:"serviceParam"`
}

type webRecorderServiceParam struct {
	URL              string `json:"url"`
	AudioProfile     int    `json:"audioProfile"`
	VideoWidth       int    `json:"videoWidth"`
	VideoHeight      int    `json:"videoHeight"`
	VideoBitrate     int    `json:"videoBitrate"`
	VideoFPS         int    `json:"videoFps"`
	MaxRecordingHour int    `json:"maxRecordingHour"`
	ReadyTimeout     int    `json:"readyTimeout"`
	OnHold           bool   `json:"onhold"`
	MaxVideoDuration int    `json:"maxVideoDuration"`
}

type updateRecordingRequest struct {
	CName         string              `json:"cname"`
	UID           string              `json:"uid"`
	ClientRequest updateClientRequest `json:"clientRequest"`
}

type updateClientRequest struct {
	WebRecordingConfig webRecordingConfig `json:"webRecordingConfig"`
}

type webRecordingConfig struct {
	OnHold bool `json:"onhold"`
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

type queryRecordingResponse struct {
	ServerResponse struct {
		Status int `json:"status"`
	} `json:"serverResponse"`
}

type stopRecordingRequest struct {
	CName         string            `json:"cname"`
	UID           string            `json:"uid"`
	ClientRequest stopClientRequest `json:"clientRequest"`
}

type stopClientRequest struct {
	AsyncStop bool `json:"async_stop"`
}

func (h *Handler) CleanupFinishedRecordings(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	if _, err := h.q.MarkEmptyRecordingPartsWithoutFreshHumans(ctx, int32(h.recordingPresenceTTL/time.Second)); err != nil {
		log.ErrorContext(ctx, "mark_empty_recording_parts_failed",
			slog.String("component", "coaching"), slog.Any("err", err))
	}

	parts, err := h.q.ListRecordingPartsReadyToStop(ctx, db.ListRecordingPartsReadyToStopParams{
		EmptyGraceSeconds: int32(h.recordingEmptyGrace / time.Second),
		EndGraceSeconds:   int32(h.recordingEndGrace / time.Second),
		LimitCount:        100,
	})
	if err != nil {
		log.ErrorContext(ctx, "list_recording_parts_ready_to_stop_failed",
			slog.String("component", "coaching"), slog.Any("err", err))
		http.Error(w, "Failed to list recording parts", http.StatusInternalServerError)
		return
	}
	stopped := 0
	for _, part := range parts {
		if err := h.stopRecordingPart(ctx, part); err != nil {
			log.ErrorContext(ctx, "recording_part_cleanup_failed",
				slog.String("component", "coaching"), slog.String("recording_id", uuidToString(part.ID)), slog.Any("err", err))
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
		"parts_processed":  len(parts),
		"parts_stopped":    stopped,
		"imports":          imports.Processed,
		"imports_ready":    imports.Ready,
		"imports_deferred": imports.Deferred,
		"imports_failed":   imports.Failed,
	})
}

func recordingBookingEnd(booking db.CoachingBooking) time.Time {
	return booking.ScheduledAt.Time.Add(time.Duration(booking.DurationMinutes) * time.Minute)
}

func participantUIDForBooking(userID string, booking db.CoachingBooking) uint32 {
	if userID == booking.ExpertID {
		return 2
	}
	return 1
}

func participantRoleForBooking(userID string, booking db.CoachingBooking) string {
	if userID == booking.ExpertID {
		return "expert"
	}
	return "student"
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
