package coaching

import (
	"context"
	"encoding/base64"
	"errors"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/compute/metadata"
	"cloud.google.com/go/storage"
	"google.golang.org/api/iamcredentials/v1"
	"google.golang.org/api/iterator"
)

const recordingSignedURLTTL = 2 * time.Hour

type RecordingObject struct {
	Name    string
	Size    int64
	Updated time.Time
}

type RecordingObjectStore interface {
	FindMP4(ctx context.Context, prefix []string) (RecordingObject, error)
	SignedURL(ctx context.Context, objectName string, ttl time.Duration) (string, error)
}

type gcsRecordingObjectStore struct {
	client              *storage.Client
	bucket              string
	serviceAccountEmail string
}

func NewGCSRecordingObjectStore(ctx context.Context, bucket, serviceAccountEmail string) (RecordingObjectStore, error) {
	client, err := storage.NewClient(ctx)
	if err != nil {
		return nil, err
	}
	return &gcsRecordingObjectStore{
		client:              client,
		bucket:              bucket,
		serviceAccountEmail: serviceAccountEmail,
	}, nil
}

func (s *gcsRecordingObjectStore) FindMP4(ctx context.Context, prefix []string) (RecordingObject, error) {
	if s.bucket == "" {
		return RecordingObject{}, errors.New("recording storage bucket is not configured")
	}
	objectPrefix := recordingObjectPrefix(prefix)
	if objectPrefix == "" {
		return RecordingObject{}, errors.New("recording file prefix is empty")
	}

	it := s.client.Bucket(s.bucket).Objects(ctx, &storage.Query{Prefix: objectPrefix})
	var selected RecordingObject
	for {
		attrs, err := it.Next()
		if errors.Is(err, iterator.Done) {
			break
		}
		if err != nil {
			return RecordingObject{}, err
		}
		if attrs == nil || !strings.HasSuffix(strings.ToLower(attrs.Name), ".mp4") {
			continue
		}
		candidate := RecordingObject{Name: attrs.Name, Size: attrs.Size, Updated: attrs.Updated}
		if selected.Name == "" || betterRecordingObject(candidate, selected) {
			selected = candidate
		}
	}

	if selected.Name == "" {
		return RecordingObject{}, fmt.Errorf("no mp4 recording found under prefix %q", objectPrefix)
	}
	return selected, nil
}

func (s *gcsRecordingObjectStore) SignedURL(ctx context.Context, objectName string, ttl time.Duration) (string, error) {
	if ttl <= 0 {
		ttl = recordingSignedURLTTL
	}
	email, err := s.signingServiceAccountEmail(ctx)
	if err != nil {
		return "", err
	}

	return storage.SignedURL(s.bucket, objectName, &storage.SignedURLOptions{
		Scheme:         storage.SigningSchemeV4,
		Method:         http.MethodGet,
		Expires:        time.Now().Add(ttl),
		GoogleAccessID: email,
		SignBytes:      s.signBytes(ctx, email),
	})
}

func (s *gcsRecordingObjectStore) signingServiceAccountEmail(ctx context.Context) (string, error) {
	if s.serviceAccountEmail != "" {
		return s.serviceAccountEmail, nil
	}
	if v := os.Getenv("GOOGLE_SERVICE_ACCOUNT_EMAIL"); v != "" {
		s.serviceAccountEmail = v
		return v, nil
	}
	if !metadata.OnGCE() {
		return "", errors.New("recording signed URL service account is not configured")
	}
	email, err := metadata.EmailWithContext(ctx, "default")
	if err != nil {
		return "", err
	}
	s.serviceAccountEmail = email
	return email, nil
}

func (s *gcsRecordingObjectStore) signBytes(ctx context.Context, email string) func([]byte) ([]byte, error) {
	return func(payload []byte) ([]byte, error) {
		service, err := iamcredentials.NewService(ctx)
		if err != nil {
			return nil, err
		}
		resp, err := service.Projects.ServiceAccounts.SignBlob(
			"projects/-/serviceAccounts/"+email,
			&iamcredentials.SignBlobRequest{
				Payload: base64.StdEncoding.EncodeToString(payload),
			},
		).Context(ctx).Do()
		if err != nil {
			return nil, err
		}
		return base64.StdEncoding.DecodeString(resp.SignedBlob)
	}
}

func recordingObjectPrefix(parts []string) string {
	clean := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.Trim(part, "/")
		if part != "" {
			clean = append(clean, part)
		}
	}
	if len(clean) == 0 {
		return ""
	}
	return strings.Join(clean, "/") + "/"
}

func betterRecordingObject(candidate, current RecordingObject) bool {
	if candidate.Size != current.Size {
		return candidate.Size > current.Size
	}
	return candidate.Updated.After(current.Updated)
}
