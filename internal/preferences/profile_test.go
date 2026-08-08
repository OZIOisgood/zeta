package preferences

import (
	"testing"

	"github.com/OZIOisgood/zeta/internal/db"
)

func TestIsNamePending(t *testing.T) {
	tests := []struct {
		name  string
		prefs db.UserPreference
		want  bool
	}{
		{
			name:  "no alias, no first, no last",
			prefs: db.UserPreference{},
			want:  true,
		},
		{
			name:  "whitespace only",
			prefs: db.UserPreference{FirstName: "  ", LastName: "\t", DisplayName: " "},
			want:  true,
		},
		{
			name:  "alias set",
			prefs: db.UserPreference{DisplayName: "Stable Rider"},
			want:  false,
		},
		{
			name:  "first name only",
			prefs: db.UserPreference{FirstName: "Ada"},
			want:  false,
		},
		{
			name:  "last name only",
			prefs: db.UserPreference{LastName: "Lovelace"},
			want:  false,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := IsNamePending(tt.prefs); got != tt.want {
				t.Fatalf("IsNamePending() = %v, want %v", got, tt.want)
			}
		})
	}
}
