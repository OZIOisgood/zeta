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

// slotStarts extracts StartsAt from each SlotResponse for readable error output.
func slotStarts(slots []SlotResponse) []time.Time {
	out := make([]time.Time, len(slots))
	for i, s := range slots {
		out[i] = s.StartsAt
	}
	return out
}

func TestAlignSlotStartToDurationGridUsesLocalDay(t *testing.T) {
	loc, err := time.LoadLocation("Europe/Rome")
	if err != nil {
		t.Fatal(err)
	}

	windowStart := time.Date(2025, 1, 20, 16, 1, 0, 0, loc).UTC()
	got := alignSlotStartToDurationGrid(windowStart, 15*time.Minute, loc)
	want := time.Date(2025, 1, 20, 16, 15, 0, 0, loc).UTC()

	if !got.Equal(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
}

func TestComputeSlots(t *testing.T) {
	loc := time.UTC

	// 2025-01-20 is a Monday.
	monday := time.Date(2025, 1, 20, 0, 0, 0, 0, time.UTC)
	rangeStart := monday
	rangeEnd := monday.AddDate(0, 0, 1)

	start900, _ := parseTime("09:00")
	start1333, _ := parseTime("13:33")
	start1601, _ := parseTime("16:01")
	start1646, _ := parseTime("16:46")
	end1200, _ := parseTime("12:00")
	end1030, _ := parseTime("10:30")
	end1400, _ := parseTime("14:00")
	end1700, _ := parseTime("17:00")

	// Availability: Monday 09:00–12:00 UTC, yields three 60-min slots.
	mondayAvail := []db.CoachingAvailability{{
		ExpertID:  "expert-1",
		DayOfWeek: 1, // Monday
		StartTime: start900,
		EndTime:   end1200,
	}}

	tests := []struct {
		name       string
		avail      []db.CoachingAvailability
		blocked    []db.CoachingBlockedSlot
		bookings   []db.CoachingBooking
		minNotice  time.Time
		duration   int32
		wantStarts []time.Time
	}{
		{
			name:       "no availability: no slots",
			avail:      nil,
			minNotice:  monday,
			duration:   60,
			wantStarts: nil,
		},
		{
			name:      "basic: three 60-min slots in 09:00–12:00 window",
			avail:     mondayAvail,
			minNotice: monday, // far in the past, no filtering
			duration:  60,
			wantStarts: []time.Time{
				time.Date(2025, 1, 20, 9, 0, 0, 0, time.UTC),
				time.Date(2025, 1, 20, 10, 0, 0, 0, time.UTC),
				time.Date(2025, 1, 20, 11, 0, 0, 0, time.UTC),
			},
		},
		{
			// Window 09:00–10:30 with 60-min slots:
			// 09:00+60m=10:00 ≤ 10:30 → fits; 10:00+60m=11:00 > 10:30 → doesn't fit.
			name: "partial window: slot that doesn't fit is excluded",
			avail: []db.CoachingAvailability{{
				ExpertID: "expert-1", DayOfWeek: 1,
				StartTime: start900, EndTime: end1030,
			}},
			minNotice: monday,
			duration:  60,
			wantStarts: []time.Time{
				time.Date(2025, 1, 20, 9, 0, 0, 0, time.UTC),
			},
		},
		{
			// minNotice = 10:30. Slots that START before 10:30 must be excluded.
			// 09:00 slot starts at 09:00 < 10:30 → excluded.
			// 10:00 slot starts at 10:00 < 10:30 → excluded.   ← BUG: current
			//   code checks slotEnd (11:00 > 10:30) and shows this slot.
			// 11:00 slot starts at 11:00 ≥ 10:30 → shown.
			name:      "minNotice: excludes slots whose START is before the notice deadline",
			avail:     mondayAvail,
			minNotice: time.Date(2025, 1, 20, 10, 30, 0, 0, time.UTC),
			duration:  60,
			wantStarts: []time.Time{
				time.Date(2025, 1, 20, 11, 0, 0, 0, time.UTC),
			},
		},
		{
			// Full-day blocked slot must remove all slots for that day.
			name:  "full-day block: no slots for the blocked day",
			avail: mondayAvail,
			blocked: []db.CoachingBlockedSlot{{
				BlockedDate: pgtype.Date{Time: time.Date(2025, 1, 20, 0, 0, 0, 0, time.UTC), Valid: true},
				// StartTime / EndTime left as zero → Valid:false → full-day block
			}},
			minNotice:  monday,
			duration:   60,
			wantStarts: nil,
		},
		{
			// Booking at 10:00–11:00 should remove only the 10:00 slot.
			name:  "booking: only the overlapping slot is removed",
			avail: mondayAvail,
			bookings: []db.CoachingBooking{{
				ScheduledAt:     pgtype.Timestamptz{Time: time.Date(2025, 1, 20, 10, 0, 0, 0, time.UTC), Valid: true},
				DurationMinutes: 60,
			}},
			minNotice: monday,
			duration:  60,
			wantStarts: []time.Time{
				time.Date(2025, 1, 20, 9, 0, 0, 0, time.UTC),
				time.Date(2025, 1, 20, 11, 0, 0, 0, time.UTC),
			},
		},
		{
			name: "15-minute slots align odd availability starts to the next duration boundary",
			avail: []db.CoachingAvailability{{
				ExpertID: "expert-1", DayOfWeek: 1,
				StartTime: start1601, EndTime: end1700,
			}},
			minNotice: monday,
			duration:  15,
			wantStarts: []time.Time{
				time.Date(2025, 1, 20, 16, 15, 0, 0, time.UTC),
				time.Date(2025, 1, 20, 16, 30, 0, 0, time.UTC),
				time.Date(2025, 1, 20, 16, 45, 0, 0, time.UTC),
			},
		},
		{
			name: "5-minute slots align to minute values ending in 0 or 5",
			avail: []db.CoachingAvailability{{
				ExpertID: "expert-1", DayOfWeek: 1,
				StartTime: start1646, EndTime: end1700,
			}},
			minNotice: monday,
			duration:  5,
			wantStarts: []time.Time{
				time.Date(2025, 1, 20, 16, 50, 0, 0, time.UTC),
				time.Date(2025, 1, 20, 16, 55, 0, 0, time.UTC),
			},
		},
		{
			name: "10-minute slots align to ten-minute boundaries",
			avail: []db.CoachingAvailability{{
				ExpertID: "expert-1", DayOfWeek: 1,
				StartTime: start1333, EndTime: end1400,
			}},
			minNotice: monday,
			duration:  10,
			wantStarts: []time.Time{
				time.Date(2025, 1, 20, 13, 40, 0, 0, time.UTC),
				time.Date(2025, 1, 20, 13, 50, 0, 0, time.UTC),
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := computeSlots(tc.avail, tc.blocked, tc.bookings, loc,
				rangeStart, rangeEnd, tc.minNotice, tc.duration)

			if len(got) != len(tc.wantStarts) {
				t.Fatalf("got %d slots %v, want %d %v",
					len(got), slotStarts(got), len(tc.wantStarts), tc.wantStarts)
			}
			for i, want := range tc.wantStarts {
				if !got[i].StartsAt.Equal(want) {
					t.Errorf("slot[%d]: got %v, want %v", i, got[i].StartsAt, want)
				}
			}
		})
	}
}
