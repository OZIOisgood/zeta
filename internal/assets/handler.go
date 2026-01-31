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
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/permissions"
	"github.com/OZIOisgood/zeta/internal/tools"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	muxgo "github.com/muxinc/mux-go"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

type Handler struct {
	q         *db.Queries
	muxClient *muxgo.APIClient
	email     *email.Service
	logger    *slog.Logger
}

func NewHandler(q *db.Queries, email *email.Service, logger *slog.Logger) *Handler {
	id := tools.GetEnv("MUX_TOKEN_ID")
	secret := tools.GetEnv("MUX_TOKEN_SECRET")
	cfg := muxgo.NewConfiguration(
		muxgo.WithBasicAuth(id, secret),
	)

	return &Handler{
		q:         q,
		muxClient: muxgo.NewAPIClient(cfg),
		email:     email,
		logger:    logger,
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
		http.Error(w, "Invalid asset ID", http.StatusBadRequest)
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
		http.Error(w, "Failed to update asset status", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "asset_complete_upload_succeeded",
		slog.String("component", "assets"),
		slog.String("asset_id", idStr),
	)
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

type AssetItem struct {
	ID          string      `json:"id"`
	Title       string      `json:"title"`
	Description string      `json:"description"`
	OwnerID     string      `json:"owner_id"`
	Status      string      `json:"status"`
	Thumbnail   string      `json:"thumbnail,omitempty"`
	PlaybackID  string      `json:"playback_id,omitempty"`
	Videos      []VideoItem `json:"videos,omitempty"`
}

type VideoItem struct {
	ID         string `json:"id"`
	PlaybackID string `json:"playback_id"`
	Status     string `json:"status"`
}

func (h *Handler) ListAssets(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	assets, err := h.q.ListAssets(ctx)
	if err != nil {
		log.ErrorContext(ctx, "asset_list_failed",
			slog.String("component", "assets"),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to list assets", http.StatusInternalServerError)
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
			pid, err := h.fetchPlaybackIDFromMux(ctx, a.MuxUploadID)
			if err == nil && pid != "" {
				playbackID = pid
				// Update DB so we don't fetch again
				err = h.q.UpdateVideoStatus(ctx, db.UpdateVideoStatusParams{
					MuxUploadID: a.MuxUploadID,
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
			}
		}

		if playbackID != "" {
			thumb = fmt.Sprintf("https://image.mux.com/%s/thumbnail.png", playbackID)
		}

		resp[i] = AssetItem{
			ID:          toUUIDString(a.ID),
			Title:       a.Name,
			Description: a.Description,
			OwnerID:     a.OwnerID,
			Status:      string(a.Status),
			Thumbnail:   thumb,
			PlaybackID:  playbackID,
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) GetAsset(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")

	var uuid pgtype.UUID
	if err := uuid.Scan(idStr); err != nil {
		http.Error(w, "Invalid asset ID", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	asset, err := h.q.GetAsset(ctx, uuid)
	if err != nil {
		log.ErrorContext(ctx, "asset_get_failed",
			slog.String("component", "assets"),
			slog.String("asset_id", idStr),
			slog.Any("err", err),
		)
		http.Error(w, "Asset not found", http.StatusNotFound)
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
		if playbackID == "" && v.MuxUploadID != "" {
			pid, err := h.fetchPlaybackIDFromMux(ctx, v.MuxUploadID)
			if err == nil && pid != "" {
				playbackID = pid
				h.q.UpdateVideoStatusByUploadID(ctx, db.UpdateVideoStatusByUploadIDParams{
					MuxUploadID: v.MuxUploadID,
					MuxAssetID:  pgtype.Text{String: "", Valid: false},
					PlaybackID:  pgtype.Text{String: pid, Valid: true},
				})
			}
		}

		videos = append(videos, VideoItem{
			ID:         toUUIDString(v.ID),
			PlaybackID: playbackID,
			Status:     string(v.Status),
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

	resp := AssetItem{
		ID:          toUUIDString(asset.ID),
		Title:       asset.Name,
		Description: asset.Description,
		OwnerID:     asset.OwnerID,
		Status:      string(asset.Status),
		Thumbnail:   thumb,
		PlaybackID:  currentPlaybackID,
		Videos:      videos,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

func (h *Handler) fetchPlaybackIDFromMux(ctx context.Context, uploadID string) (string, error) {
	upload, err := h.muxClient.DirectUploadsApi.GetDirectUpload(uploadID)
	if err != nil {
		return "", err
	}

	if upload.Data.Status == "asset_created" && upload.Data.AssetId != "" {
		asset, err := h.muxClient.AssetsApi.GetAsset(upload.Data.AssetId)
		if err != nil {
			return "", err
		}
		
		for _, pid := range asset.Data.PlaybackIds {
			if pid.Policy == muxgo.PUBLIC {
				return pid.Id, nil
			}
		}
	}
	
	return "", fmt.Errorf("playback id not found")
}

func (h *Handler) CreateAsset(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)
	userCtx := auth.GetUser(ctx)
	if userCtx == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(userCtx.Role, permissions.AssetsCreate) {
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
		http.Error(w, "Failed to create asset", http.StatusInternalServerError)
		return
	}

	log.InfoContext(ctx, "asset_created",
		slog.String("component", "assets"),
		slog.String("user_id", userCtx.ID),
		slog.String("asset_id", toUUIDString(asset.ID)),
		slog.String("group_id", req.GroupID),
	)

	// Notify Group Owner
	go func() {
		// Create background context for async operation
		bgCtx := context.Background()
		bgLog := h.logger.With(
			slog.String("component", "assets"),
			slog.String("asset_id", toUUIDString(asset.ID)),
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

		// Check feature flags on Owner - Removed as per requirements, emails sent always


		// Fetch Owner Email from WorkOS
		owner, err := usermanagement.GetUser(bgCtx, usermanagement.GetUserOpts{
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

		// Send Email
		userName := fmt.Sprintf("%s %s", userCtx.FirstName, userCtx.LastName)
		msg := fmt.Sprintf("User %s uploaded a new video '%s' to group '%s'.", userName, asset.Name, group.Name)
		err = h.email.Send([]string{emailAddr}, "New Asset Uploaded", msg)
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
				slog.String("asset_id", toUUIDString(asset.ID)),
				slog.String("filename", filename),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to initiate upload with Mux", http.StatusInternalServerError)
			return
		}

		// Save video metadata to DB
		video, err := h.q.CreateVideo(ctx, db.CreateVideoParams{
			AssetID:     asset.ID,
			MuxUploadID: upload.Data.Id,
			Status:      db.VideoStatusWaitingUpload,
		})
		if err != nil {
			log.ErrorContext(ctx, "asset_video_create_failed",
				slog.String("component", "assets"),
				slog.String("asset_id", toUUIDString(asset.ID)),
				slog.String("filename", filename),
				slog.Any("err", err),
			)
			http.Error(w, "Failed to create video record", http.StatusInternalServerError)
			return
		}

		videos = append(videos, VideoResponse{
			ID:        toUUIDString(video.ID),
			UploadURL: upload.Data.Url,
			Filename:  filename,
		})
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(CreateAssetResponse{
		AssetID: toUUIDString(asset.ID),
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
	upload, err := h.muxClient.DirectUploadsApi.CreateDirectUpload(request)
	return &upload, err
}

// Helper to convert pgtype.UUID to string.
func toUUIDString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	src := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", src[0:4], src[4:6], src[6:8], src[8:10], src[10:16])
}

func (h *Handler) FinalizeAsset(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	log := logger.From(ctx, h.logger)

	userInfo := auth.GetUser(ctx)
	if userInfo == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !permissions.HasPermission(userInfo.Role, permissions.AssetsFinalize) {
		http.Error(w, "Permission denied", http.StatusForbidden)
		return
	}

	idStr := chi.URLParam(r, "id")
	var assetID pgtype.UUID
	if err := assetID.Scan(idStr); err != nil {
		http.Error(w, "Invalid asset ID", http.StatusBadRequest)
		return
	}

	err := h.q.UpdateAssetStatus(ctx, db.UpdateAssetStatusParams{
		ID:     assetID,
		Status: db.AssetStatusCompleted,
	})
	if err != nil {
		log.ErrorContext(ctx, "finalize_asset_failed",
			slog.String("component", "assets"),
			slog.String("asset_id", idStr),
			slog.Any("err", err),
		)
		http.Error(w, "Failed to finalize asset", http.StatusInternalServerError)
		return
	}

	// Fetch asset details to notify owner
	asset, err := h.q.GetAsset(ctx, assetID)
	if err != nil {
		log.ErrorContext(ctx, "finalize_asset_fetch_failed",
			slog.String("component", "assets"),
			slog.String("asset_id", idStr),
			slog.Any("err", err),
		)
	} else {
		// Only send email if the person finalizing is not the owner
		if asset.OwnerID != userInfo.ID {
			owner, err := usermanagement.GetUser(ctx, usermanagement.GetUserOpts{
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
				subject := "Your video has been reviewed"
				text := fmt.Sprintf("Your video %s has been reviewed and is now finalized.", asset.Name)
				err = h.email.Send([]string{owner.Email}, subject, text)
				if err != nil {
					log.ErrorContext(ctx, "finalize_asset_email_send_failed",
						slog.String("component", "assets"),
						slog.String("asset_id", idStr),
						slog.String("to", owner.Email),
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
