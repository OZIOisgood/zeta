package coaching

import "testing"

func TestIsValidSessionDuration(t *testing.T) {
	defaultHandler := &Handler{
		minSessionDuration:  DefaultMinSessionDuration,
		sessionDurationStep: DefaultSessionDurationStep,
	}
	tests := []struct {
		name     string
		duration int32
		want     bool
	}{
		{"minimum valid", 15, true},
		{"maximum valid", 120, true},
		{"valid five minute increment", 35, true},
		{"below minimum", 10, false},
		{"above maximum", 125, false},
		{"not five minute increment", 17, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := defaultHandler.isValidSessionDuration(tt.duration); got != tt.want {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}

func TestIsValidSessionDurationAllowsOneMinuteDevSessions(t *testing.T) {
	h := &Handler{minSessionDuration: 1, sessionDurationStep: 1}

	for _, duration := range []int32{1, 5, 119, 120} {
		if !h.isValidSessionDuration(duration) {
			t.Errorf("duration %d should be valid", duration)
		}
	}
	for _, duration := range []int32{0, 121} {
		if h.isValidSessionDuration(duration) {
			t.Errorf("duration %d should be invalid", duration)
		}
	}
}
