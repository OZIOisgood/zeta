package coaching

import (
	"testing"
	"time"
)

func TestFormatEmailDateTimeUsesRecipientLocaleAndTimezone(t *testing.T) {
	summer := time.Date(2026, time.August, 4, 16, 45, 0, 0, time.UTC)
	winter := time.Date(2026, time.December, 4, 16, 45, 0, 0, time.UTC)

	tests := []struct {
		name     string
		instant  time.Time
		language string
		timezone string
		want     string
	}{
		{
			name:     "German recipient observes summer time",
			instant:  summer,
			language: "de",
			timezone: "Europe/Berlin",
			want:     "Dienstag, 4. August 2026 um 18:45 (Europe/Berlin, UTC+02:00)",
		},
		{
			name:     "German recipient observes winter time",
			instant:  winter,
			language: "de",
			timezone: "Europe/Berlin",
			want:     "Freitag, 4. Dezember 2026 um 17:45 (Europe/Berlin, UTC+01:00)",
		},
		{
			name:     "English recipient sees next calendar day",
			instant:  summer,
			language: "en",
			timezone: "Australia/Melbourne",
			want:     "Wednesday, 5 August 2026 at 02:45 (Australia/Melbourne, UTC+10:00)",
		},
		{
			name:     "French recipient receives translated date",
			instant:  summer,
			language: "fr",
			timezone: "Europe/Paris",
			want:     "mardi 4 août 2026 à 18:45 (Europe/Paris, UTC+02:00)",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			localization, err := newRecipientLocalization(tt.language, tt.timezone)
			if err != nil {
				t.Fatalf("newRecipientLocalization() error = %v", err)
			}
			if got := formatEmailDateTime(tt.instant, localization); got != tt.want {
				t.Fatalf("formatEmailDateTime() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestNewRecipientLocalizationFallsBackToUTC(t *testing.T) {
	localization, err := newRecipientLocalization("de", "Not/A_Timezone")
	if err == nil {
		t.Fatal("newRecipientLocalization() error = nil, want invalid timezone error")
	}

	instant := time.Date(2026, time.August, 4, 16, 45, 0, 0, time.UTC)
	want := "Dienstag, 4. August 2026 um 16:45 (UTC, UTC+00:00)"
	if got := formatEmailDateTime(instant, localization); got != want {
		t.Fatalf("formatEmailDateTime() = %q, want %q", got, want)
	}
}

func TestFormatEmailDurationUsesRecipientLanguage(t *testing.T) {
	tests := []struct {
		name     string
		language string
		minutes  int32
		want     string
	}{
		{name: "English minutes", language: "en", minutes: 45, want: "45 minutes"},
		{name: "English singular hour", language: "en", minutes: 60, want: "1 hour"},
		{name: "German hours and minutes", language: "de", minutes: 90, want: "1 Stunde 30 Minuten"},
		{name: "German plural hours", language: "de", minutes: 120, want: "2 Stunden"},
		{name: "French singular units", language: "fr", minutes: 61, want: "1 heure 1 minute"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			localization, err := newRecipientLocalization(tt.language, "UTC")
			if err != nil {
				t.Fatalf("newRecipientLocalization() error = %v", err)
			}
			if got := formatEmailDuration(tt.minutes, localization); got != tt.want {
				t.Fatalf("formatEmailDuration() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestFormatUTCOffsetSupportsNegativeOffsets(t *testing.T) {
	if got := formatUTCOffset(-4 * int(time.Hour/time.Second)); got != "-04:00" {
		t.Fatalf("formatUTCOffset() = %q, want %q", got, "-04:00")
	}
}
