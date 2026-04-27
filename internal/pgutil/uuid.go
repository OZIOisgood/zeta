package pgutil

import (
	"fmt"

	"github.com/jackc/pgx/v5/pgtype"
)

// UUIDToString converts a pgtype.UUID to its canonical hyphenated hex string.
// Returns an empty string when the UUID is not valid.
func UUIDToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	src := u.Bytes
	return fmt.Sprintf("%x-%x-%x-%x-%x", src[0:4], src[4:6], src[6:8], src[8:10], src[10:16])
}
