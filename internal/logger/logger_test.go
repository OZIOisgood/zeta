package logger

import (
	"bytes"
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestJSONLoggerUsesCloudLoggingFields(t *testing.T) {
	var output bytes.Buffer
	log := newJSONLogger(&output, slog.LevelInfo)
	log.Error("request_failed", slog.String("component", "test"))

	var entry map[string]any
	if err := json.Unmarshal(output.Bytes(), &entry); err != nil {
		t.Fatalf("decode log entry: %v", err)
	}

	for key, want := range map[string]any{
		"severity":  "ERROR",
		"message":   "request_failed",
		"component": "test",
	} {
		if got := entry[key]; got != want {
			t.Errorf("entry[%q] = %#v, want %#v", key, got, want)
		}
	}
	for _, legacyKey := range []string{"time", "level", "msg"} {
		if _, ok := entry[legacyKey]; ok {
			t.Errorf("unexpected legacy key %q in log entry", legacyKey)
		}
	}
	if _, ok := entry["timestamp"]; !ok {
		t.Error("expected timestamp in log entry")
	}
}

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

func TestParseCloudTraceContext(t *testing.T) {
	sampled := true
	notSampled := false
	tests := []struct {
		name   string
		header string
		want   cloudTraceContext
		ok     bool
	}{
		{
			name:   "trace span and sampled option",
			header: "105445aa7843bc8bf206b12000100000/123;o=1",
			want: cloudTraceContext{
				traceID: "105445aa7843bc8bf206b12000100000",
				spanID:  "000000000000007b",
				sampled: &sampled,
			},
			ok: true,
		},
		{
			name:   "unsampled trace without span",
			header: "105445AA7843BC8BF206B12000100000;o=0",
			want: cloudTraceContext{
				traceID: "105445aa7843bc8bf206b12000100000",
				sampled: &notSampled,
			},
			ok: true,
		},
		{name: "empty header", ok: false},
		{name: "short trace id", header: "abc/123;o=1", ok: false},
		{name: "non hexadecimal trace id", header: "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz/123;o=1", ok: false},
		{name: "non decimal span id", header: "105445aa7843bc8bf206b12000100000/abc;o=1", ok: false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := parseCloudTraceContext(tt.header)
			if ok != tt.ok {
				t.Fatalf("ok = %t, want %t", ok, tt.ok)
			}
			if !tt.ok {
				return
			}
			if got.traceID != tt.want.traceID || got.spanID != tt.want.spanID {
				t.Errorf("trace = %#v, want %#v", got, tt.want)
			}
			if (got.sampled == nil) != (tt.want.sampled == nil) {
				t.Fatalf("sampled presence = %v, want %v", got.sampled, tt.want.sampled)
			}
			if got.sampled != nil && *got.sampled != *tt.want.sampled {
				t.Errorf("sampled = %t, want %t", *got.sampled, *tt.want.sampled)
			}
		})
	}
}

func TestMiddlewareAddsCloudTraceFields(t *testing.T) {
	var output bytes.Buffer
	log := newJSONLogger(&output, slog.LevelInfo)
	handler := Middleware(log, "zeta-project")(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	}))

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	req.Header.Set("X-Request-Id", "request-123")
	req.Header.Set("X-Cloud-Trace-Context", "105445aa7843bc8bf206b12000100000/123;o=1")
	handler.ServeHTTP(httptest.NewRecorder(), req)

	var entry map[string]any
	if err := json.Unmarshal(output.Bytes(), &entry); err != nil {
		t.Fatalf("decode log entry: %v", err)
	}

	want := map[string]any{
		"logging.googleapis.com/trace":         "projects/zeta-project/traces/105445aa7843bc8bf206b12000100000",
		"logging.googleapis.com/spanId":        "000000000000007b",
		"logging.googleapis.com/trace_sampled": true,
		"request_id":                           "request-123",
		"status":                               float64(http.StatusNoContent),
	}
	for key, value := range want {
		if got := entry[key]; got != value {
			t.Errorf("entry[%q] = %#v, want %#v", key, got, value)
		}
	}
}
