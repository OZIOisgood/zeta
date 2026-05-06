package coaching

import "testing"

func TestIsValidSessionDuration(t *testing.T) {
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
			if got := isValidSessionDuration(tt.duration); got != tt.want {
				t.Fatalf("got %v, want %v", got, tt.want)
			}
		})
	}
}
