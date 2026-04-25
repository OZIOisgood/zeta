package coaching

import (
	"testing"
	"time"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/jackc/pgx/v5/pgtype"
)

func TestOverlapsBooking(t *testing.T) {
	now := time.Date(2025, 1, 15, 10, 0, 0, 0, time.UTC)
	booking := db.CoachingBooking{
		ScheduledAt:     pgtype.Timestamptz{Time: now, Valid: true},
		DurationMinutes: 60,
	}

	tests := []struct {
		name      string
		slotStart time.Time
		slotEnd   time.Time
		want      bool
	}{
		{"before", now.Add(-2 * time.Hour), now.Add(-time.Hour), false},
		{"after", now.Add(2 * time.Hour), now.Add(3 * time.Hour), false},
		{"overlapping start", now.Add(-30 * time.Minute), now.Add(30 * time.Minute), true},
		{"overlapping end", now.Add(30 * time.Minute), now.Add(90 * time.Minute), true},
		{"contained", now.Add(15 * time.Minute), now.Add(45 * time.Minute), true},
		{"containing", now.Add(-30 * time.Minute), now.Add(90 * time.Minute), true},
		{"adjacent after", now.Add(time.Hour), now.Add(2 * time.Hour), false},
		{"adjacent before", now.Add(-time.Hour), now, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := overlapsBooking(tt.slotStart, tt.slotEnd, []db.CoachingBooking{booking}); got != tt.want {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsBlocked_FullDay(t *testing.T) {
	loc := time.UTC
	blockedDate := pgtype.Date{Time: time.Date(2025, 1, 15, 0, 0, 0, 0, time.UTC), Valid: true}
	blocked := []db.CoachingBlockedSlot{
		{BlockedDate: blockedDate},
	}

	slotStart := time.Date(2025, 1, 15, 10, 0, 0, 0, time.UTC)
	slotEnd := time.Date(2025, 1, 15, 11, 0, 0, 0, time.UTC)

	if !isBlocked(slotStart, slotEnd, blocked, loc) {
		t.Error("expected full-day block to block slot")
	}
}

func TestIsBlocked_PartialDay(t *testing.T) {
	loc := time.UTC
	blockedDate := pgtype.Date{Time: time.Date(2025, 1, 15, 0, 0, 0, 0, time.UTC), Valid: true}
	startTime, _ := parseTime("12:00")
	endTime, _ := parseTime("14:00")
	blocked := []db.CoachingBlockedSlot{
		{BlockedDate: blockedDate, StartTime: startTime, EndTime: endTime},
	}

	tests := []struct {
		name      string
		slotStart time.Time
		slotEnd   time.Time
		want      bool
	}{
		{"before block", time.Date(2025, 1, 15, 10, 0, 0, 0, time.UTC), time.Date(2025, 1, 15, 11, 0, 0, 0, time.UTC), false},
		{"overlapping", time.Date(2025, 1, 15, 11, 30, 0, 0, time.UTC), time.Date(2025, 1, 15, 12, 30, 0, 0, time.UTC), true},
		{"inside block", time.Date(2025, 1, 15, 12, 30, 0, 0, time.UTC), time.Date(2025, 1, 15, 13, 30, 0, 0, time.UTC), true},
		{"after block", time.Date(2025, 1, 15, 14, 0, 0, 0, time.UTC), time.Date(2025, 1, 15, 15, 0, 0, 0, time.UTC), false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := isBlocked(tt.slotStart, tt.slotEnd, blocked, loc); got != tt.want {
				t.Errorf("got %v, want %v", got, tt.want)
			}
		})
	}
}
