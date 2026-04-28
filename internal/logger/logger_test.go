package logger

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestParseLevel(t *testing.T) {
	tests := []struct {
		input string
		want  slog.Level
	}{
		{"DEBUG", slog.LevelDebug},
		{"INFO", slog.LevelInfo},
		{"WARN", slog.LevelWarn},
		{"ERROR", slog.LevelError},
		{"debug", slog.LevelDebug},
		{"info", slog.LevelInfo},
		// Invalid input defaults to LevelInfo.
		{"", slog.LevelInfo},
		{"UNKNOWN", slog.LevelInfo},
		{"trace", slog.LevelInfo},
	}

	for _, tc := range tests {
		t.Run(tc.input, func(t *testing.T) {
			got := ParseLevel(tc.input)
			if got != tc.want {
				t.Errorf("ParseLevel(%q) = %v, want %v", tc.input, got, tc.want)
			}
		})
	}
}

func TestWithAndFrom(t *testing.T) {
	base := slog.Default()

	tests := []struct {
		name  string
		ctx   context.Context
		check func(*testing.T, *slog.Logger)
	}{
		{
			name: "stored logger returned",
			ctx:  With(context.Background(), base),
			check: func(t *testing.T, got *slog.Logger) {
				if got != base {
					t.Error("expected the stored logger")
				}
			},
		},
		{
			name: "fallback returned when context is empty",
			ctx:  context.Background(),
			check: func(t *testing.T, got *slog.Logger) {
				if got != base {
					t.Error("expected the fallback logger")
				}
			},
		},
		{
			name: "With attrs produces a new instance",
			ctx:  With(context.Background(), base, slog.String("key", "val")),
			check: func(t *testing.T, got *slog.Logger) {
				if got == base {
					t.Error("expected a new logger instance, got the same pointer")
				}
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			tc.check(t, From(tc.ctx, base))
		})
	}
}

func TestResponseWriter(t *testing.T) {
	tests := []struct {
		name       string
		act        func(*ResponseWriter)
		wantStatus int
		wantBytes  int
	}{
		{
			name:       "defaults to 200 before WriteHeader called",
			wantStatus: http.StatusOK,
		},
		{
			name:       "WriteHeader records the status code",
			act:        func(rw *ResponseWriter) { rw.WriteHeader(404) },
			wantStatus: 404,
		},
		{
			name:       "Write accumulates byte count",
			act:        func(rw *ResponseWriter) { rw.Write([]byte("hello")); rw.Write([]byte("world")) },
			wantStatus: http.StatusOK,
			wantBytes:  10,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			rw := &ResponseWriter{ResponseWriter: httptest.NewRecorder(), statusCode: http.StatusOK}
			if tc.act != nil {
				tc.act(rw)
			}
			if rw.statusCode != tc.wantStatus {
				t.Errorf("statusCode = %d, want %d", rw.statusCode, tc.wantStatus)
			}
			if rw.bytes != tc.wantBytes {
				t.Errorf("bytes = %d, want %d", rw.bytes, tc.wantBytes)
			}
		})
	}
}
