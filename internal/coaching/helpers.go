package coaching

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
)

// --- UUID helpers ---

func uuidToString(u pgtype.UUID) string {
	if !u.Valid {
		return ""
	}
	return fmt.Sprintf("%x-%x-%x-%x-%x", u.Bytes[0:4], u.Bytes[4:6], u.Bytes[6:8], u.Bytes[8:10], u.Bytes[10:16])
}

func parseUUID(s string) (pgtype.UUID, error) {
	var u pgtype.UUID
	err := u.Scan(s)
	return u, err
}

// parseGroupID extracts the {groupID} URL parameter and parses it as a UUID.
func parseGroupID(r *http.Request) (pgtype.UUID, error) {
	return parseUUID(chi.URLParam(r, "groupID"))
}

// --- Time helpers ---

func parseTime(s string) (pgtype.Time, error) {
	t, err := time.Parse("15:04", s)
	if err != nil {
		return pgtype.Time{}, err
	}
	micros := int64(t.Hour())*int64(time.Hour/time.Microsecond) +
		int64(t.Minute())*int64(time.Minute/time.Microsecond)
	return pgtype.Time{Microseconds: micros, Valid: true}, nil
}

func pgTimeToString(t pgtype.Time) string {
	if !t.Valid {
		return ""
	}
	h, m := pgTimeParts(t)
	return fmt.Sprintf("%02d:%02d", h, m)
}

// pgTimeParts extracts hours and minutes from a pgtype.Time value.
func pgTimeParts(t pgtype.Time) (hours, minutes int) {
	hours = int(t.Microseconds / int64(time.Hour/time.Microsecond))
	minutes = int((t.Microseconds % int64(time.Hour/time.Microsecond)) / int64(time.Minute/time.Microsecond))
	return
}

// parseTimeRange parses start/end HH:MM strings and validates start < end.
// Returns parsed times or an error string suitable for http.Error.
func parseTimeRange(startStr, endStr string) (start, end pgtype.Time, errMsg string) {
	var err error
	start, err = parseTime(startStr)
	if err != nil {
		return pgtype.Time{}, pgtype.Time{}, "Invalid start_time format (use HH:MM)"
	}
	end, err = parseTime(endStr)
	if err != nil {
		return pgtype.Time{}, pgtype.Time{}, "Invalid end_time format (use HH:MM)"
	}
	if start.Microseconds >= end.Microseconds {
		return pgtype.Time{}, pgtype.Time{}, "start_time must be before end_time"
	}
	return start, end, ""
}

// --- Duration ---

func formatDuration(minutes int32) string {
	if minutes < 60 {
		return fmt.Sprintf("%d minutes", minutes)
	}
	h := minutes / 60
	m := minutes % 60
	if m == 0 {
		return fmt.Sprintf("%d hour(s)", h)
	}
	return fmt.Sprintf("%d hour(s) %d minutes", h, m)
}

// --- User ID collection ---

// collectUserIDs de-duplicates expert and student IDs from a list of (expertID, studentID) pairs.
func collectUserIDs(pairs [][2]string) []string {
	seen := make(map[string]struct{}, len(pairs)*2)
	for _, p := range pairs {
		seen[p[0]] = struct{}{}
		seen[p[1]] = struct{}{}
	}
	ids := make([]string, 0, len(seen))
	for id := range seen {
		ids = append(ids, id)
	}
	return ids
}

// --- HTTP response helpers ---

// writeJSON sets Content-Type, writes the given status code, and JSON-encodes v.
func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	if status != http.StatusOK {
		w.WriteHeader(status)
	}
	json.NewEncoder(w).Encode(v) //nolint:errcheck
}
