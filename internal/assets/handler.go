package assets

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/email"
	"github.com/OZIOisgood/zeta/internal/features"
	"github.com/OZIOisgood/zeta/internal/tools"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	muxgo "github.com/muxinc/mux-go"
	"github.com/workos/workos-go/v4/pkg/usermanagement"
)

type Handler struct {
	q         *db.Queries
	muxClient *muxgo.APIClient
	features  *features.Handler
	email     *email.Service
}

func NewHandler(q *db.Queries, features *features.Handler, email *email.Service) *Handler {
	id := tools.GetEnv("MUX_TOKEN_ID")
	secret := tools.GetEnv("MUX_TOKEN_SECRET")
	cfg := muxgo.NewConfiguration(
		muxgo.WithBasicAuth(id, secret),
	)

	return &Handler{
		q:         q,
		muxClient: muxgo.NewAPIClient(cfg),
		features:  features,
		email:     email,
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
}

func (h *Handler) CompleteUpload(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "id")
	var uuid pgtype.UUID
	if err := uuid.Scan(idStr); err != nil {
		http.Error(w, "Invalid asset ID", http.StatusBadRequest)
		return
	}

	ctx := r.Context()
	err := h.q.UpdateAssetStatus(ctx, db.UpdateAssetStatusParams{
		ID:     uuid,
		Status: db.AssetStatusPending,
	})
	if err != nil {
		fmt.Printf("Error updating asset status: %v\n", err)
		http.Error(w, "Failed to update asset status", http.StatusInternalServerError)
		return
	}

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
	assets, err := h.q.ListAssets(ctx)
	if err != nil {
		fmt.Printf("Error listing assets: %v\n", err)
		http.Error(w, "Failed to list assets", http.StatusInternalServerError)
		return
	}

	resp := make([]AssetItem, len(assets))
	for i, a := range assets {
		var thumb string
		
		playbackID := a.PlaybackID
		if playbackID == "" && a.MuxUploadID != "" {
			// Try to fetch from Mux if we have an upload ID but no playback ID yet
			log.Printf("Fetching status for upload %s", a.MuxUploadID)
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
                    fmt.Printf("Error updating video status: %v\n", err)
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
	asset, err := h.q.GetAsset(ctx, uuid)
	if err != nil {
		fmt.Printf("Error getting asset: %v\n", err)
		http.Error(w, "Asset not found", http.StatusNotFound)
		return
	}

	// Fetch Videos
	dbVideos, err := h.q.GetAssetVideos(ctx, uuid)
	if err != nil {
		fmt.Printf("Error getting videos: %v\n", err)
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
	userCtx := auth.GetUser(ctx)
	if userCtx == nil {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	if !h.features.HasFeature(userCtx.ID, "create-asset") {
		http.Error(w, "Feature not enabled", http.StatusForbidden)
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
		fmt.Printf("Error checking group membership: %v\n", err)
		http.Error(w, "Error checking group membership", http.StatusInternalServerError)
		return
	}
	if !isMember {
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
		fmt.Printf("Error creating asset: %v\n", err)
		http.Error(w, "Failed to create asset", http.StatusInternalServerError)
		return
	}

	// Notify Group Owner
	go func() {
		fmt.Printf("[Email Notification] Starting notification process for asset %v\n", asset.ID)
		
		// Fetch group to find owner
		group, err := h.q.GetGroup(context.Background(), asset.GroupID)
		if err != nil {
			fmt.Printf("[Email Notification] Error fetching group for email notification: %v\n", err)
			return
		}
		fmt.Printf("[Email Notification] Group: %s, Owner: %s\n", group.Name, group.OwnerID)

		// Don't notify if the uploader is the owner
		if group.OwnerID == userCtx.ID {
			fmt.Println("[Email Notification] Uploader is the owner, skipping.")
			return
		}

		// Check feature flags on Owner
		hasBaseFeature := h.features.HasFeature(group.OwnerID, "receive-email-notifications")
		if !hasBaseFeature {
			fmt.Printf("[Email Notification] Owner %s does not have 'receive-email-notifications' enabled\n", group.OwnerID)
			return
		}
		
		hasSpecificFeature := h.features.HasFeature(group.OwnerID, "receive-email-notifications--new-asset-in-group")
		if !hasSpecificFeature {
			fmt.Printf("[Email Notification] Owner %s does not have 'receive-email-notifications--new-asset-in-group' enabled\n", group.OwnerID)
			return
		}

		// Fetch Owner Email from WorkOS
		owner, err := usermanagement.GetUser(context.Background(), usermanagement.GetUserOpts{
			User: group.OwnerID,
		})
		if err != nil {
			fmt.Printf("[Email Notification] Error fetching owner from WorkOS: %v\n", err)
			return
		}

		emailAddr := owner.Email
		if emailAddr == "" {
			fmt.Printf("[Email Notification] Owner has no email address\n")
			return
		}
		fmt.Printf("[Email Notification] sending email to %s\n", emailAddr)

		// Send Email
		msg := fmt.Sprintf("User %s uploaded a new video '%s' to group '%s'.", userCtx.Name, asset.Name, group.Name)
		err = h.email.Send([]string{emailAddr}, "New Asset Uploaded", msg)
		if err != nil {
			fmt.Printf("[Email Notification] Error sending email: %v\n", err)
		} else {
			fmt.Printf("[Email Notification] Email sent successfully\n")
		}
	}()

	var videos []VideoResponse

	// 2. Process each file
	for _, filename := range req.Filenames {
		// Call Mux to create direct upload URL
		upload, err := h.createMuxUpload(ctx)
		if err != nil {
			// In a real app, we might want to cleanup the asset or handle partial failures
			http.Error(w, "Failed to initiate upload with Mux", http.StatusInternalServerError)
			return
		}

		// Save video metadata to DB
		// Convert uuid from pgtype if needed, but sqlc generates pgtype.UUID usually unless configured otherwise.
		// Let's check db/models.go to see what types are used.
		// Assuming generic uuid handling for now, or string if using text.
		// Migration used UUID.
		
		video, err := h.q.CreateVideo(ctx, db.CreateVideoParams{
			AssetID:     asset.ID,
			MuxUploadID: upload.Data.Id,
			Status:      db.VideoStatusWaitingUpload,
		})
		if err != nil {
			http.Error(w, "Failed to create video record", http.StatusInternalServerError)
			return
		}
		
		// Convert pgtype.UUID to string if necessary.
		// I'll need to check the generated types.

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
