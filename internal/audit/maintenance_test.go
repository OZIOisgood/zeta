package audit

import (
	"testing"
	"time"
)

func TestPartitionName(t *testing.T) {
	got := partitionName(time.Date(2026, 6, 1, 0, 0, 0, 0, time.UTC))
	if got != "audit_events_2026_06" {
		t.Errorf("partitionName = %q, want audit_events_2026_06", got)
	}
}

func TestPartitionUpperBound(t *testing.T) {
	cases := []struct {
		name     string
		wantOK   bool
		wantYear int
		wantMon  time.Month
	}{
		{"audit_events_2026_06", true, 2026, time.July},
		{"audit_events_2026_12", true, 2027, time.January}, // December wraps to next year
		{"audit_events_2026_01", true, 2026, time.February},
		{"audit_events_foo", false, 0, 0},
		{"audit_events_", false, 0, 0},
		{"other_table", false, 0, 0},
		{"public.audit_events_2026_06", true, 2026, time.July},
		{"audit.audit_events_2026_03", true, 2026, time.April},
		{"public.other_table", false, 0, 0},
	}
	for _, c := range cases {
		got, ok := partitionUpperBound(c.name)
		if ok != c.wantOK {
			t.Errorf("%s: ok = %v, want %v", c.name, ok, c.wantOK)
			continue
		}
		if !c.wantOK {
			continue
		}
		if got.Year() != c.wantYear || got.Month() != c.wantMon || got.Day() != 1 {
			t.Errorf("%s: upper bound = %v, want %d-%02d-01", c.name, got, c.wantYear, c.wantMon)
		}
	}
}
