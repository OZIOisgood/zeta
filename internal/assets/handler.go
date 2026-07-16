package assets

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/i18n"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/notifications"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/OZIOisgood/zeta/internal/pgutil"
	"github.com/OZIOisgood/zeta/internal/preferences"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	muxgo "github.com/muxinc/mux-go"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

type Handler struct {
	q      db.Querier
	mux    MuxClient
	email  email.Sender
	workos auth.UserManagement
	logger *slog.Logger
}

func NewHandler(q db.Querier, mux MuxClient, email email.Sender, workos auth.UserManagement, logger *slog.Logger) *Handler {
	return &Handler{
		q:      q,
		mux:    mux,
		email:  email,
		workos: workos,
		logger: logger,
	}
}

type CreateAssetRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Filenames   []string `json:"filenames"`
	GroupID     string   `json:"group_id"`
}

type VideoResponse struct {
	ID        string `json:"id"`
	UploadURL string `json:"upload_url"`
	Filename  string `json:"filename"`
}

type CreateAssetResponse struct {
	AssetID string          `json:"asset_id"`
	Videos  []VideoResponse `json:"videos"`
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Post("/", h.CreateAsset)
	r.Get("/", h.ListAssets)
	r.Get("/{id}", h.GetAsset)
	r.Post("/{id}/complete", h.CompleteUpload)
	r.Post("/{id}/finalize", h.FinalizeAsset)
}

func (h *Handler) CompleteUpload(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	var uuid pgtype.UUID
	if err := uuid.Scan(idStr); err != nil {
		http.Error(w, "Invalid video ID", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	err := h.q.UpdateAssetStatus(ctx, db.UpdateAssetStatusParams{
		ID:     uuid,
		Status: db.AssetStatusPending,
	})
	if err != nil {
		log.ErrorContext(ctx, "asset_complete_upload_failed",
			slog.String("component", "assets"),
			slog.String("asset_id", idStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to update video status", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "asset_complete_upload_succeeded",
		slog.String("component", "assets"),
		slog.String("asset_id", idStr),
	)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

type GroupInfo struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Avatar string `json:"avatar,omitempty"`
}

type AssetItem struct {
	ID          string      `json:"id"`
	Title       string      `json:"title"`
	Description string      `json:"description"`
	OwnerID     string      `json:"owner_id"`
	Status      string      `json:"status"`
	Thumbnail   string      `json:"thumbnail,omitempty"`
	PlaybackID  string      `json:"playback_id,omitempty"`
	ReviewCount int64       `json:"review_count"`
	Videos      []VideoItem `json:"videos,omitempty"`
	Group       *GroupInfo  `json:"group,omitempty"`
}

type VideoItem struct {
	ID          string `json:"id"`
	PlaybackID  string `json:"playback_id"`
	Status      string `json:"status"`
	ReviewCount int64  `json:"review_count"`
}

func (h *Handler) ListAssets(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	userInfo := auth.GetUser(ctx)
	if userInfo == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	assets, err := h.q.ListVisibleAssets(ctx, db.ListVisibleAssetsParams{
		UserID:    userInfo.ID,
		IsStudent: isStudent(userInfo),
	})
	if err != nil {
		log.ErrorContext(ctx, "asset_list_failed",
			slog.String("component", "assets"),
			slog.String("user_id", userInfo.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list videos", http.StatusInternalServerError)
		return
	}

	resp := make([]AssetItem, len(assets))
	for i, a := range assets {
		var thumb string

		playbackID := a.PlaybackID
		if playbackID == "" && a.MuxUploadID != "" {
			// Try to fetch from Mux if we have an upload ID but no playback ID yet
			log.DebugContext(ctx, "asset_fetching_playback_id",
				slog.String("component", "assets"),
				slog.String("mux_upload_id", a.MuxUploadID),
			)
			pid, duration, err := h.fetchPlaybackIDFromMux(ctx, a.MuxUploadID)
			if err == nil && pid != "" {
				playbackID = pid
				// Update DB so we don't fetch again
				err = h.q.UpdateVideoStatus(ctx, db.UpdateVideoStatusParams{
					MuxUploadID: pgtype.Text{String: a.MuxUploadID, Valid: true},
					MuxAssetID:  pgtype.Text{String: "", Valid: false},
					PlaybackID:  pgtype.Text{String: pid, Valid: true},
				})
				if err != nil {
					// Log error but continue
					log.ErrorContext(ctx, "asset_video_status_update_failed",
						slog.String("component", "assets"),
						slog.String("mux_upload_id", a.MuxUploadID),
						slog.Any("err", err),
					)
				}
				h.persistVideoDuration(ctx, a.MuxUploadID, duration)
			}
		}

		if playbackID != "" {
			thumb = fmt.Sprintf("https://image.mux.com/%s/thumbnail.png", playbackID)
		}

		resp[i] = AssetItem{
			ID:          pgutil.UUIDToString(a.ID),
			Title:       a.Name,
			Description: a.Description,
			OwnerID:     a.OwnerID,
			Status:      string(a.Status),
			Thumbnail:   thumb,
			PlaybackID:  playbackID,
			ReviewCount: a.ReviewCount,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) GetAsset(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")

	var uuid pgtype.UUID
	if err := uuid.Scan(idStr); err != nil {
		http.Error(w, "Invalid video ID", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	userInfo := auth.GetUser(ctx)
	if userInfo == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	asset, err := h.q.GetVisibleAsset(ctx, db.GetVisibleAssetParams{
		AssetID:   uuid,
		UserID:    userInfo.ID,
		IsStudent: isStudent(userInfo),
	})
	if err != nil {
		log.ErrorContext(ctx, "asset_get_failed",
			slog.String("component", "assets"),
			slog.String("asset_id", idStr),
			slog.String("user_id", userInfo.ID),
			slog.Any("err", err),
		)
		http.Error(w, "Video not found", http.StatusNotFound)
		return
	}

	// Fetch Videos
	dbVideos, err := h.q.GetAssetVideos(ctx, uuid)
	if err != nil {
		log.ErrorContext(ctx, "asset_videos_get_failed",
			slog.String("component", "assets"),
			slog.String("asset_id", idStr),
			slog.Any("err", err),
		)
	}

	var videos []VideoItem
	currentPlaybackID := asset.PlaybackID

	for _, v := range dbVideos {
		playbackID := ""
		if v.PlaybackID.Valid {
			playbackID = v.PlaybackID.String
		}

		// Handle pending videos
		uploadID := ""
		if v.MuxUploadID.Valid {
			uploadID = v.MuxUploadID.String
		}
		if playbackID == "" && uploadID != "" {
			pid, duration, err := h.fetchPlaybackIDFromMux(ctx, uploadID)
			if err == nil && pid != "" {
				playbackID = pid
				h.q.UpdateVideoStatusByUploadID(ctx, db.UpdateVideoStatusByUploadIDParams{
					MuxUploadID: pgtype.Text{String: uploadID, Valid: true},
					MuxAssetID:  pgtype.Text{String: "", Valid: false},
					PlaybackID:  pgtype.Text{String: pid, Valid: true},
				})
				h.persistVideoDuration(ctx, uploadID, duration)
			}
		} else if uploadID == "" && v.MuxAssetID.Valid && v.MuxAssetID.String != "" && !v.DurationSeconds.Valid {
			// Coaching-import videos are created with mux_asset_id and no upload ID.
			// persistVideoDuration (keyed by upload ID) never fires for them, so
			// capture duration lazily here — but only once: gate on a missing
			// duration so we don't hit the Mux API on every GET after it's stored.
			duration, err := h.durationFromMux(ctx, v.MuxAssetID.String, "")
			if err == nil && duration > 0 {
				if err := h.q.SetVideoDurationByID(ctx, db.SetVideoDurationByIDParams{
					ID:              v.ID,
					DurationSeconds: pgtype.Float8{Float64: duration, Valid: true},
				}); err != nil {
					log.ErrorContext(ctx, "video_duration_update_failed",
						slog.String("component", "assets"),
						slog.String("mux_asset_id", v.MuxAssetID.String),
						slog.Any("err", err),
					)
				}
			}
		}

		videos = append(videos, VideoItem{
			ID:          pgutil.UUIDToString(v.ID),
			PlaybackID:  playbackID,
			Status:      string(v.Status),
			ReviewCount: v.ReviewCount,
		})
	}

	var thumb string
	if currentPlaybackID == "" && len(videos) > 0 {
		for _, v := range videos {
			if v.PlaybackID != "" {
				currentPlaybackID = v.PlaybackID
				break
			}
		}
	}

	if currentPlaybackID != "" {
		thumb = fmt.Sprintf("https://image.mux.com/%s/thumbnail.png", currentPlaybackID)
	}

	var group *GroupInfo
	if asset.GroupID.Valid && asset.GroupName.Valid {
		groupAvatar := ""
		if asset.GroupAvatar.Valid {
			groupAvatar = asset.GroupAvatar.String
		}
		group = &GroupInfo{
			ID:     pgutil.UUIDToString(asset.GroupID),
			Name:   asset.GroupName.String,
			Avatar: groupAvatar,
		}
	}

	resp := AssetItem{
		ID:          pgutil.UUIDToString(asset.ID),
		Title:       asset.Name,
		Description: asset.Description,
		OwnerID:     asset.OwnerID,
		Status:      string(asset.Status),
		Thumbnail:   thumb,
		PlaybackID:  currentPlaybackID,
		Videos:      videos,
		Group:       group,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func isStudent(user *auth.UserContext) bool {
	return user.Role == permissions.RoleStudent
}

// fetchPlaybackIDFromMux resolves the public playback ID for an upload and, as a
// side value, the asset duration in seconds (0 if Mux does not report one yet).
func (h *Handler) fetchPlaybackIDFromMux(ctx context.Context, uploadID string) (string, float64, error) {
	upload, err := h.mux.GetDirectUpload(uploadID)
	if err != nil {
		return "", 0, err
	}

	if upload.Data.Status == "asset_created" && upload.Data.AssetId != "" {
		asset, err := h.mux.GetAsset(upload.Data.AssetId)
		if err != nil {
			return "", 0, err
		}

		for _, pid := range asset.Data.PlaybackIds {
			if pid.Policy == muxgo.PUBLIC {
				return pid.Id, asset.Data.Duration, nil
			}
		}
	}

	return "", 0, fmt.Errorf("playback id not found")
}

// durationFromMux resolves a video's duration in seconds from whichever Mux
// identifier is available: the asset id directly, or the upload id (direct
// uploads, which only carry the upload id until processing completes).
func (h *Handler) durationFromMux(ctx context.Context, muxAssetID, muxUploadID string) (float64, error) {
	if muxAssetID != "" {
		asset, err := h.mux.GetAsset(muxAssetID)
		if err != nil {
			return 0, err
		}
		return asset.Data.Duration, nil
	}
	if muxUploadID != "" {
		return h.durationFromUpload(ctx, muxUploadID)
	}
	return 0, fmt.Errorf("no mux identifier")
}

// durationFromUpload resolves duration via a direct upload's backing asset.
// Unlike fetchPlaybackIDFromMux it does not require a public playback id.
func (h *Handler) durationFromUpload(ctx context.Context, uploadID string) (float64, error) {
	upload, err := h.mux.GetDirectUpload(uploadID)
	if err != nil {
		return 0, err
	}
	if upload.Data.AssetId == "" {
		return 0, fmt.Errorf("upload %s has no asset yet", uploadID)
	}
	asset, err := h.mux.GetAsset(upload.Data.AssetId)
	if err != nil {
		return 0, err
	}
	return asset.Data.Duration, nil
}

// BackfillVideoDurations fills duration_seconds for existing ready videos that
// predate duration capture. Internal endpoint, protected by the scheduler secret.
func (h *Handler) BackfillVideoDurations(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	const batchSize = 100
	videos, err := h.q.ListVideosMissingDuration(ctx, batchSize)
	if err != nil {
		log.ErrorContext(ctx, "video_duration_backfill_list_failed",
			slog.String("component", "assets"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list videos", http.StatusInternalServerError)
		return
	}

	updated := 0
	for _, v := range videos {
		duration, err := h.durationFromMux(ctx, v.MuxAssetID.String, v.MuxUploadID.String)
		if err != nil {
			log.WarnContext(ctx, "video_duration_backfill_fetch_failed",
				slog.String("component", "assets"),
				slog.String("mux_asset_id", v.MuxAssetID.String),
				slog.String("mux_upload_id", v.MuxUploadID.String),
				slog.Any("err", err),
			)
			continue
		}
		if duration <= 0 {
			continue
		}
		if err := h.q.SetVideoDurationByID(ctx, db.SetVideoDurationByIDParams{
			ID:              v.ID,
			DurationSeconds: pgtype.Float8{Float64: duration, Valid: true},
		}); err != nil {
			log.ErrorContext(ctx, "video_duration_backfill_update_failed",
				slog.String("component", "assets"),
				slog.Any("err", err),
			)
			continue
		}
		updated++
	}

	log.InfoContext(ctx, "video_duration_backfill_completed",
		slog.String("component", "assets"),
		slog.Int("scanned", len(videos)),
		slog.Int("updated", updated),
	)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"scanned":  len(videos),
		"updated":  updated,
		"has_more": len(videos) >= batchSize,
	})
}

// persistVideoDuration stores the Mux-reported duration for a video, keyed by its
// upload ID. It is best-effort: failures are logged but never block the request.
func (h *Handler) persistVideoDuration(ctx context.Context, uploadID string, duration float64) {
	if uploadID == "" || duration <= 0 {
		return
	}
	if err := h.q.SetVideoDurationByUploadID(ctx, db.SetVideoDurationByUploadIDParams{
		MuxUploadID:     pgtype.Text{String: uploadID, Valid: true},
		DurationSeconds: pgtype.Float8{Float64: duration, Valid: true},
	}); err != nil {
		logger.From(ctx, h.logger).ErrorContext(ctx, "video_duration_update_failed",
			slog.String("component", "assets"),
			slog.String("mux_upload_id", uploadID),
			slog.Any("err", err),
		)
	}
}

func (h *Handler) CreateAsset(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	userCtx := auth.GetUser(ctx)
	if userCtx == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(userCtx.Permissions, permissions.AssetsCreate) {
		log.WarnContext(ctx, "asset_create_permission_denied",
			slog.String("component", "assets"),
			slog.String("user_id", userCtx.ID),
			slog.String("role", userCtx.Role),
		)
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	var req CreateAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	// Validate Group
	if req.GroupID == "" {
		http.Error(w, "Group ID is required", http.StatusBadRequest)
		return
	}

	var groupID pgtype.UUID
	if err := groupID.Scan(req.GroupID); err != nil {
		http.Error(w, "Invalid group ID", http.StatusBadRequest)
		return
	}

	isMember, err := h.q.CheckUserGroup(ctx, db.CheckUserGroupParams{
		UserID:  userCtx.ID,
		GroupID: groupID,
	})
	if err != nil {
		log.ErrorContext(ctx, "asset_group_check_failed",
			slog.String("component", "assets"),
			slog.String("user_id", userCtx.ID),
			slog.String("group_id", req.GroupID),
			slog.Any("err", err),
		)
		http.Error(w, "Error checking group membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
		log.WarnContext(ctx, "asset_create_not_member",
			slog.String("component", "assets"),
			slog.String("user_id", userCtx.ID),
			slog.String("group_id", req.GroupID),
		)
		http.Error(w, "User is not a member of the group", http.StatusForbidden)
		return
	}

	// 1. Create Asset in DB
	asset, err := h.q.CreateAsset(ctx, db.CreateAssetParams{
		Name:        req.Title,
		Description: req.Description,
		GroupID:     groupID,
		OwnerID:     userCtx.ID,
	})
	if err != nil {
		log.ErrorContext(ctx, "asset_create_failed",
			slog.String("component", "assets"),
			slog.String("user_id", userCtx.ID),
			slog.String("group_id", req.GroupID),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to create video", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "asset_created",
		slog.String("component", "assets"),
		slog.String("user_id", userCtx.ID),
		slog.String("asset_id", pgutil.UUIDToString(asset.ID)),
		slog.String("group_id", req.GroupID),
	)

	// Notify Group Owner
	go func() {
		// Create background context for async operation
		bgCtx := context.Background()
		bgLog := h.logger.With(
			slog.String("component", "assets"),
			slog.String("asset_id", pgutil.UUIDToString(asset.ID)),
		)

		// Fetch group to find owner
		group, err := h.q.GetGroup(bgCtx, asset.GroupID)
		if err != nil {
			bgLog.ErrorContext(bgCtx, "asset_group_fetch_failed",
				slog.Any("err", err),
			)
			return
		}

		// Don't notify if the uploader is the owner
		if group.OwnerID == userCtx.ID {
			bgLog.DebugContext(bgCtx, "asset_uploader_is_owner_skip_notification",
				slog.String("owner_id", group.OwnerID),
			)
			return
		}

		// In-app notification for the owner (the reviewing expert/coach). Recorded
		// independently of email preferences, which only gate the email below.
		notifications.Record(bgCtx, h.q, h.logger, group.OwnerID, notifications.TypeVideoUploaded,
			notifications.VideoUploadedPayload{
				AssetID:      pgutil.UUIDToString(asset.ID),
				VideoTitle:   asset.Name,
				GroupID:      pgutil.UUIDToString(asset.GroupID),
				GroupName:    group.Name,
				UploaderName: fmt.Sprintf("%s %s", userCtx.FirstName, userCtx.LastName),
			})

		if !preferences.AllowsUserEmail(bgCtx, h.q, h.logger, group.OwnerID, preferences.EmailCategoryAssetUploads) {
			bgLog.InfoContext(bgCtx, "asset_notification_skipped_by_preferences",
				slog.String("owner_id", group.OwnerID),
			)
			return
		}

		// Fetch Owner Email from WorkOS
		owner, err := h.workos.GetUser(bgCtx, usermanagement.GetUserOpts{
			User: group.OwnerID,
		})
		if err != nil {
			bgLog.ErrorContext(bgCtx, "asset_notification_owner_fetch_failed",
				slog.String("owner_id", group.OwnerID),
				slog.Any("err", err),
			)
			return
		}

		emailAddr := owner.Email
		if emailAddr == "" {
			bgLog.WarnContext(bgCtx, "asset_notification_owner_no_email",
				slog.String("owner_id", group.OwnerID),
			)
			return
		}

		uploaderPrefs, err := h.q.GetUserPreferences(bgCtx, userCtx.ID)
		if err != nil {
			bgLog.ErrorContext(bgCtx, "asset_notification_uploader_preferences_failed",
				slog.String("user_id", userCtx.ID),
				slog.Any("err", err),
			)
			return
		}
		userName, err := preferences.RequireDisplayName(uploaderPrefs)
		if err != nil {
			bgLog.ErrorContext(bgCtx, "asset_notification_uploader_name_missing",
				slog.String("user_id", userCtx.ID),
				slog.Any("err", err),
			)
			return
		}
		loc := i18n.For(preferences.UserLang(bgCtx, h.q, bgLog, group.OwnerID))
		message := email.Message{
			Copy: email.Copy{
				Preheader: i18n.T(loc, "email.video_uploaded.preheader", map[string]any{"UploaderName": userName}),
				Title:     i18n.T(loc, "email.video_uploaded.title"),
				Intro: i18n.T(loc, "email.video_uploaded.intro", map[string]any{
					"UploaderName": userName,
					"VideoName":    asset.Name,
					"GroupName":    group.Name,
				}),
			},
		}
		subject := i18n.T(loc, "email.video_uploaded.subject")
		err = h.email.SendTemplate([]string{emailAddr}, subject, email.TemplateNotification, message)
		if err != nil {
			bgLog.ErrorContext(bgCtx, "asset_notification_send_failed",
				slog.String("owner_id", group.OwnerID),
				slog.Any("err", err),
			)
		} else {
			bgLog.InfoContext(bgCtx, "asset_notification_sent",
				slog.String("owner_id", group.OwnerID),
			)
		}
	}()

	var videos []VideoResponse

	// 2. Process each file
	for _, filename := range req.Filenames {
		// Call Mux to create direct upload URL
		upload, err := h.createMuxUpload(ctx)
		if err != nil {
			// In a real app, we might want to cleanup the asset or handle partial failures
			log.ErrorContext(ctx, "asset_mux_upload_failed",
				slog.String("component", "assets"),
				slog.String("asset_id", pgutil.UUIDToString(asset.ID)),
				slog.String("filename", filename),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to initiate upload with Mux", http.StatusInternalServerError)
			return
		}

		// Save video metadata to DB
		video, err := h.q.CreateVideo(ctx, db.CreateVideoParams{
			AssetID:     asset.ID,
			MuxUploadID: pgtype.Text{String: upload.Data.Id, Valid: true},
			Status:      db.VideoStatusWaitingUpload,
		})
		if err != nil {
			log.ErrorContext(ctx, "asset_video_create_failed",
				slog.String("component", "assets"),
				slog.String("asset_id", pgutil.UUIDToString(asset.ID)),
				slog.String("filename", filename),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to create video part", http.StatusInternalServerError)
			return
		}

		videos = append(videos, VideoResponse{
			ID:        pgutil.UUIDToString(video.ID),
			UploadURL: upload.Data.Url,
			Filename:  filename,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CreateAssetResponse{
		AssetID: pgutil.UUIDToString(asset.ID),
		Videos:  videos,
	})
}

func (h *Handler) createMuxUpload(ctx context.Context) (*muxgo.UploadResponse, error) {
	request := muxgo.CreateUploadRequest{
		NewAssetSettings: muxgo.CreateAssetRequest{
			PlaybackPolicy: []muxgo.PlaybackPolicy{muxgo.PUBLIC},
		},
		CorsOrigin: "*",
	}

	// Execute the request
	upload, err := h.mux.CreateDirectUpload(request)
	return &upload, err
}

func (h *Handler) FinalizeAsset(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	userInfo := auth.GetUser(ctx)
	if userInfo == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(userInfo.Permissions, permissions.AssetsFinalize) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	var assetID pgtype.UUID
	if err := assetID.Scan(idStr); err != nil {
		http.Error(w, "Invalid video ID", http.StatusBadRequest)
		return
	}

	asset, err := h.q.GetVisibleAsset(ctx, db.GetVisibleAssetParams{
		AssetID:   assetID,
		UserID:    userInfo.ID,
		IsStudent: isStudent(userInfo),
	})
	if err != nil {
		log.WarnContext(ctx, "finalize_asset_visibility_denied",
			slog.String("component", "assets"),
			slog.String("asset_id", idStr),
			slog.String("user_id", userInfo.ID),
			slog.String("role", userInfo.Role),
			slog.Any("err", err),
		)
		http.Error(w, "Video not found", http.StatusNotFound)
		return
	}

	recordingStillOpen, err := h.q.IsRecordingAssetStillOpen(ctx, assetID)
	if err != nil {
		log.ErrorContext(ctx, "finalize_asset_recording_state_failed",
			slog.String("component", "assets"), slog.String("asset_id", idStr), slog.Any("err", err))
		http.Error(w, "Failed to check recording state", http.StatusInternalServerError)
		return
	}
	if recordingStillOpen {
		log.WarnContext(ctx, "finalize_asset_rejected_recording_open",
			slog.String("component", "assets"), slog.String("asset_id", idStr))
		http.Error(w, "Cannot mark video as reviewed while recording parts are still being prepared", http.StatusConflict)
		return
	}

	// Check if all videos have at least one review
	hasUnreviewed, err := h.q.HasVideosWithoutReviews(ctx, assetID)
	if err != nil {
		log.ErrorContext(ctx, "finalize_asset_check_reviews_failed",
			slog.String("component", "assets"),
			slog.String("asset_id", idStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to check reviews", http.StatusInternalServerError)
		return
	}

	if hasUnreviewed {
		log.WarnContext(ctx, "finalize_asset_rejected_no_reviews",
			slog.String("component", "assets"),
			slog.String("asset_id", idStr),
		)
		http.Error(w, "Cannot mark video as reviewed: all video parts must have at least one review", http.StatusBadRequest)
		return
	}

	err = h.q.UpdateAssetStatus(ctx, db.UpdateAssetStatusParams{
		ID:     assetID,
		Status: db.AssetStatusCompleted,
	})
	if err != nil {
		log.ErrorContext(ctx, "finalize_asset_failed",
			slog.String("component", "assets"),
			slog.String("asset_id", idStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to mark video as reviewed", http.StatusInternalServerError)
		return
	}

	// Only send email if the person finalizing is not the owner
	if asset.OwnerID != userInfo.ID {
		if !preferences.AllowsUserEmail(ctx, h.q, h.logger, asset.OwnerID, preferences.EmailCategoryAssetReviews) {
			log.InfoContext(ctx, "finalize_asset_email_skipped_by_preferences",
				slog.String("component", "assets"),
				slog.String("asset_id", idStr),
				slog.String("owner_id", asset.OwnerID),
			)
		} else {
			owner, err := h.workos.GetUser(ctx, usermanagement.GetUserOpts{
				User: asset.OwnerID,
			})
			if err != nil {
				log.ErrorContext(ctx, "finalize_asset_owner_fetch_failed",
					slog.String("component", "assets"),
					slog.String("asset_id", idStr),
					slog.String("owner_id", asset.OwnerID),
					slog.Any("err", err),
				)
			} else {
				loc := i18n.For(preferences.UserLang(ctx, h.q, log, asset.OwnerID))
				subject := i18n.T(loc, "email.video_reviewed.subject")
				message := email.Message{
					Copy: email.Copy{
						Preheader: i18n.T(loc, "email.video_reviewed.preheader", map[string]any{"VideoName": asset.Name}),
						Title:     i18n.T(loc, "email.video_reviewed.title"),
						Intro:     i18n.T(loc, "email.video_reviewed.intro", map[string]any{"VideoName": asset.Name}),
					},
				}
				err = h.email.SendTemplate([]string{owner.Email}, subject, email.TemplateNotification, message)
				if err != nil {
					log.ErrorContext(ctx, "finalize_asset_email_send_failed",
						slog.String("component", "assets"),
						slog.String("asset_id", idStr),
						slog.String("owner_id", asset.OwnerID),
						slog.Any("err", err),
					)
				}
			}
		}
	}

	log.InfoContext(ctx, "finalize_asset_succeeded",
		slog.String("component", "assets"),
		slog.String("asset_id", idStr),
	)

	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "completed"})
}
