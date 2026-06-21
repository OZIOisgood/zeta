package contact

import (
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

type rateLimitEntry struct {
	count       int
	windowStart time.Time
}

type rateLimiter struct {
	mu      sync.Mutex
	limit   int
	window  time.Duration
	entries map[string]rateLimitEntry
	lastGC  time.Time
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	return &rateLimiter{limit: limit, window: window, entries: make(map[string]rateLimitEntry)}
}

func (l *rateLimiter) Allow(key string, now time.Time) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	if l.lastGC.IsZero() || now.Sub(l.lastGC) >= l.window {
		for entryKey, entry := range l.entries {
			if now.Sub(entry.windowStart) >= l.window {
				delete(l.entries, entryKey)
			}
		}
		l.lastGC = now
	}

	entry := l.entries[key]
	if entry.windowStart.IsZero() || now.Sub(entry.windowStart) >= l.window {
		l.entries[key] = rateLimitEntry{count: 1, windowStart: now}
		return true
	}
	if entry.count >= l.limit {
		return false
	}
	entry.count++
	l.entries[key] = entry
	return true
}

func rateLimitKey(r *http.Request) string {
	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err != nil {
		host = strings.TrimSpace(r.RemoteAddr)
	}
	return host
}
