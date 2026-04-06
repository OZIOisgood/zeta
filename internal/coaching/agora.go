package coaching

import (
	"crypto/sha256"
	"encoding/binary"
	"fmt"
	"os"

	rtctokenbuilder "github.com/AgoraIO/Tools/DynamicKey/AgoraDynamicKey/go/src/rtctokenbuilder2"
)

// ChannelName returns the Agora channel name for a coaching session.
func ChannelName(sessionID string) string {
	return fmt.Sprintf("coaching_%s", sessionID)
}

// UserUID returns a deterministic uint32 UID derived from a user ID string.
func UserUID(userID string) uint32 {
	h := sha256.Sum256([]byte(userID))
	// Use first 4 bytes as uint32, mask to avoid 0 (Agora rejects UID 0)
	uid := binary.BigEndian.Uint32(h[:4])
	if uid == 0 {
		uid = 1
	}
	return uid
}

// GenerateToken builds an Agora RTC token for the given channel and user.
func GenerateToken(channelName string, uid uint32) (string, string, error) {
	appID := os.Getenv("AGORA_APP_ID")
	appCertificate := os.Getenv("AGORA_APP_CERTIFICATE")

	if appID == "" || appCertificate == "" {
		return "", "", fmt.Errorf("AGORA_APP_ID and AGORA_APP_CERTIFICATE must be set")
	}

	token, err := rtctokenbuilder.BuildTokenWithUid(
		appID,
		appCertificate,
		channelName,
		uid,
		rtctokenbuilder.RolePublisher,
		3600, // token expiration (1 hour)
		3600, // privilege expiration (1 hour)
	)
	if err != nil {
		return "", "", fmt.Errorf("build agora token: %w", err)
	}

	return appID, token, nil
}
