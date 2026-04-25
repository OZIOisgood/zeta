package coaching

import (
	"testing"
	"time"
)

func TestBookingStatus(t *testing.T) {
	tests := []struct {
		name        string
		scheduledAt time.Time
		isCancelled bool
		want        string
	}{
		{"cancelled", time.Now().Add(time.Hour), true, "cancelled"},
		{"done", time.Now().Add(-time.Hour), false, "done"},
		{"pending", time.Now().Add(time.Hour), false, "pending"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := bookingStatus(tt.scheduledAt, tt.isCancelled); got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}
