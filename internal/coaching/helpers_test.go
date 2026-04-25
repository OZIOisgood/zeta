package coaching

import (
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
)

func TestParseTime(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantH   int
		wantM   int
		wantErr bool
	}{
		{"midnight", "00:00", 0, 0, false},
		{"morning", "09:30", 9, 30, false},
		{"afternoon", "14:45", 14, 45, false},
		{"end of day", "23:59", 23, 59, false},
		{"single digit hour", "9:30", 9, 30, false},
		{"nonsense", "abc", 0, 0, true},
		{"empty", "", 0, 0, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseTime(tt.input)
			if tt.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !got.Valid {
				t.Fatal("expected valid time")
			}
			h, m := pgTimeParts(got)
			if h != tt.wantH || m != tt.wantM {
				t.Errorf("got %02d:%02d, want %02d:%02d", h, m, tt.wantH, tt.wantM)
			}
		})
	}
}

func TestParseTimeRange(t *testing.T) {
	tests := []struct {
		name      string
		start     string
		end       string
		wantError bool
	}{
		{"valid range", "09:00", "17:00", false},
		{"same time", "09:00", "09:00", true},
		{"reversed", "17:00", "09:00", true},
		{"bad start", "abc", "17:00", true},
		{"bad end", "09:00", "xyz", true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, _, errMsg := parseTimeRange(tt.start, tt.end)
			if tt.wantError && errMsg == "" {
				t.Error("expected error message, got empty")
			}
			if !tt.wantError && errMsg != "" {
				t.Errorf("unexpected error: %s", errMsg)
			}
		})
	}
}

func TestPgTimeToString(t *testing.T) {
	pt930, _ := parseTime("09:30")
	pt000, _ := parseTime("00:00")

	tests := []struct {
		name  string
		input pgtype.Time
		want  string
	}{
		{"valid", pt930, "09:30"},
		{"midnight", pt000, "00:00"},
		{"invalid", pgtype.Time{Valid: false}, ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := pgTimeToString(tt.input); got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestFormatDuration(t *testing.T) {
	tests := []struct {
		minutes int32
		want    string
	}{
		{15, "15 minutes"},
		{30, "30 minutes"},
		{59, "59 minutes"},
		{60, "1 hour(s)"},
		{90, "1 hour(s) 30 minutes"},
		{120, "2 hour(s)"},
	}

	for _, tt := range tests {
		t.Run(tt.want, func(t *testing.T) {
			if got := formatDuration(tt.minutes); got != tt.want {
				t.Errorf("formatDuration(%d) = %q, want %q", tt.minutes, got, tt.want)
			}
		})
	}
}

func TestCollectUserIDs(t *testing.T) {
	pairs := [][2]string{
		{"alice", "bob"},
		{"alice", "carol"},
		{"dave", "bob"},
	}

	ids := collectUserIDs(pairs)
	idSet := make(map[string]struct{})
	for _, id := range ids {
		idSet[id] = struct{}{}
	}

	expected := []string{"alice", "bob", "carol", "dave"}
	if len(ids) != len(expected) {
		t.Fatalf("got %d IDs, want %d", len(ids), len(expected))
	}
	for _, e := range expected {
		if _, ok := idSet[e]; !ok {
			t.Errorf("missing expected ID %q", e)
		}
	}
}

func TestUUIDToString(t *testing.T) {
	u := pgtype.UUID{Valid: true}
	copy(u.Bytes[:], []byte{0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10})
	got := uuidToString(u)
	if got != "01020304-0506-0708-090a-0b0c0d0e0f10" {
		t.Errorf("got %q", got)
	}

	if got := uuidToString(pgtype.UUID{Valid: false}); got != "" {
		t.Errorf("expected empty, got %q", got)
	}
}
