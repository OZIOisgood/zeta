// Package logger provides structured logging using log/slog with context support.
package logger

import (
	"context"
	"io"
	"log/slog"
	"os"
)

type contextKey string

const loggerKey contextKey = "logger"

// New creates a new JSON-formatted slog.Logger configured for production output.
func New() *slog.Logger {
	return newJSONLogger(os.Stdout, slog.LevelInfo)
}

// NewWithLevel creates a new JSON-formatted slog.Logger with a specific log level.
func NewWithLevel(level slog.Level) *slog.Logger {
	return newJSONLogger(os.Stdout, level)
}

func newJSONLogger(w io.Writer, level slog.Level) *slog.Logger {
	handler := slog.NewJSONHandler(w, &slog.HandlerOptions{
		Level: level,
		ReplaceAttr: func(groups []string, attr slog.Attr) slog.Attr {
			if len(groups) != 0 {
				return attr
			}

			switch attr.Key {
			case slog.TimeKey:
				attr.Key = "timestamp"
			case slog.LevelKey:
				attr.Key = "severity"
			case slog.MessageKey:
				attr.Key = "message"
			}
			return attr
		},
	})
	return slog.New(handler)
}

// ParseLevel converts a string level to slog.Level.
// Defaults to LevelInfo if parsing fails.
func ParseLevel(s string) slog.Level {
	var level slog.Level
	if err := level.UnmarshalText([]byte(s)); err != nil {
		return slog.LevelInfo
	}
	return level
}

// With attaches a logger to the context with optional attributes.
func With(ctx context.Context, log *slog.Logger, attrs ...slog.Attr) context.Context {
	if len(attrs) > 0 {
		// Convert slog.Attr to interface{} for With
		args := make([]interface{}, len(attrs))
		for i, attr := range attrs {
			args[i] = attr
		}
		log = log.With(args...)
	}
	return context.WithValue(ctx, loggerKey, log)
}

// From retrieves the logger from context, or returns the fallback if not found.
func From(ctx context.Context, fallback *slog.Logger) *slog.Logger {
	if log, ok := ctx.Value(loggerKey).(*slog.Logger); ok {
		return log
	}
	return fallback
}
