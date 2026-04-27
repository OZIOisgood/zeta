package pgutil

import (
	"testing"

	"github.com/jackc/pgx/v5/pgtype"
)

func TestUUIDToString(t *testing.T) {
	makeUUID := func(b ...byte) pgtype.UUID {
		u := pgtype.UUID{Valid: true}
		copy(u.Bytes[:], b)
		return u
	}

	tests := []struct {
		name string
		input pgtype.UUID
		want string
	}{
		{
			name:  "valid UUID",
			input: makeUUID(0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f, 0x10),
			want:  "01020304-0506-0708-090a-0b0c0d0e0f10",
		},
		{
			name:  "invalid UUID returns empty string",
			input: pgtype.UUID{Valid: false},
			want:  "",
		},
		{
			name:  "all-zero bytes",
			input: pgtype.UUID{Valid: true},
			want:  "00000000-0000-0000-0000-000000000000",
		},
		{
			name:  "all-max bytes",
			input: func() pgtype.UUID {
				u := pgtype.UUID{Valid: true}
				for i := range u.Bytes {
					u.Bytes[i] = 0xff
				}
				return u
			}(),
			want: "ffffffff-ffff-ffff-ffff-ffffffffffff",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := UUIDToString(tc.input)
			if got != tc.want {
				t.Errorf("got %q, want %q", got, tc.want)
			}
		})
	}
}
