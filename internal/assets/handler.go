package assets

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/OZIOisgood/zeta/internal/tools"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	muxgo "github.com/muxinc/mux-go"
)

type Handler struct {
	q         *db.Queries
	muxClient *muxgo.APIClient
}

func NewHandler(q *db.Queries) *Handler {
	id := tools.GetEnv("MUX_TOKEN_ID")
	secret := tools.GetEnv("MUX_TOKEN_SECRET")
	cfg := muxgo.NewConfiguration(
		muxgo.WithBasicAuth(id, secret),
	)

	return &Handler{
		q:         q,
		muxClient: muxgo.NewAPIClient(cfg),
	}
}

type CreateAssetRequest struct {
	Title       string   `json:"title"`
	Description string   `json:"description"`
	Filenames   []string `json:"filenames"`
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
}

type AssetItem struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	Thumbnail   string `json:"thumbnail,omitempty"`
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
			Status:      string(a.Status),
			Thumbnail:   thumb,
		}
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
	var req CreateAssetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if req.Title == "" {
		http.Error(w, "Title is required", http.StatusBadRequest)
		return
	}

	ctx := r.Context()

	// 1. Create Asset in DB
	asset, err := h.q.CreateAsset(ctx, db.CreateAssetParams{
		Name:        req.Title,
		Description: req.Description,
	})
	if err != nil {
		fmt.Printf("Error creating asset: %v\n", err)
		http.Error(w, "Failed to create asset", http.StatusInternalServerError)
		return
	}

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
