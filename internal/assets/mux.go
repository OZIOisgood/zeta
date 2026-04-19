package assets

import (
	"github.com/OZIOisgood/zeta/internal/tools"
	muxgo "github.com/muxinc/mux-go"
)

//go:generate mockgen -source=mux.go -destination=mocks/mock_mux.go -package=mocks

// MuxClient abstracts the Mux video API for testability.
type MuxClient interface {
	CreateDirectUpload(req muxgo.CreateUploadRequest) (muxgo.UploadResponse, error)
	GetDirectUpload(uploadID string) (muxgo.UploadResponse, error)
	GetAsset(assetID string) (muxgo.AssetResponse, error)
}

// muxClient wraps the real Mux SDK client.
type muxClient struct {
	client *muxgo.APIClient
}

// NewMuxClient creates a real Mux API client from environment variables.
func NewMuxClient() MuxClient {
	id := tools.GetEnv("MUX_TOKEN_ID")
	secret := tools.GetEnv("MUX_TOKEN_SECRET")
	cfg := muxgo.NewConfiguration(
		muxgo.WithBasicAuth(id, secret),
	)
	return &muxClient{client: muxgo.NewAPIClient(cfg)}
}

func (m *muxClient) CreateDirectUpload(req muxgo.CreateUploadRequest) (muxgo.UploadResponse, error) {
	return m.client.DirectUploadsApi.CreateDirectUpload(req)
}

func (m *muxClient) GetDirectUpload(uploadID string) (muxgo.UploadResponse, error) {
	return m.client.DirectUploadsApi.GetDirectUpload(uploadID)
}

func (m *muxClient) GetAsset(assetID string) (muxgo.AssetResponse, error) {
	return m.client.AssetsApi.GetAsset(assetID)
}
