package auth

import (
	"log/slog"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

// visitor is one client's token bucket plus the last time it was used,
// so idle buckets can be pruned.
type visitor struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

// IPRateLimiter throttles requests per client IP with a token bucket each.
// It protects unauthenticated credential endpoints (token exchange/refresh)
// from brute-force and WorkOS cost amplification. State is per instance;
// with multiple replicas the effective limit scales with the replica count,
// which is acceptable for abuse protection.
type IPRateLimiter struct {
	logger *slog.Logger

	mu        sync.Mutex
	visitors  map[string]*visitor
	rate      rate.Limit
	burst     int
	ttl       time.Duration
	lastPrune time.Time
	now       func() time.Time
}

// NewIPRateLimiter allows `burst` immediate requests per IP, refilling at
// `perMinute` requests per minute. Idle buckets are dropped after 10 minutes.
func NewIPRateLimiter(logger *slog.Logger, perMinute, burst int) *IPRateLimiter {
	return &IPRateLimiter{
		logger:   logger,
		visitors: make(map[string]*visitor),
		rate:     rate.Limit(float64(perMinute) / 60.0),
		burst:    burst,
		ttl:      10 * time.Minute,
		now:      time.Now,
	}
}

// Middleware rejects requests over the per-IP limit with 429.
func (l *IPRateLimiter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !l.allow(clientIP(r)) {
			// Deliberately no IP in the log line — client addresses are PII.
			l.logger.WarnContext(r.Context(), "auth_rate_limited",
				slog.String("component", "auth"),
				slog.String("path", r.URL.Path),
			)
			w.Header().Set("Retry-After", "60")
			http.Error(w, "Too many requests", http.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (l *IPRateLimiter) allow(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	now := l.now()
	if now.Sub(l.lastPrune) > l.ttl {
		for key, v := range l.visitors {
			if now.Sub(v.lastSeen) > l.ttl {
				delete(l.visitors, key)
			}
		}
		l.lastPrune = now
	}

	v, ok := l.visitors[ip]
	if !ok {
		v = &visitor{limiter: rate.NewLimiter(l.rate, l.burst)}
		l.visitors[ip] = v
	}
	v.lastSeen = now
	return v.limiter.AllowN(now, 1)
}

// clientIP extracts the originating client address. X-Forwarded-For accumulates
// hops left-to-right and only the RIGHTMOST entry was appended by our trusted
// proxy (Cloud Run / Google Front End); everything left of it is caller-supplied
// and trivially forgeable. Keying the limiter on a forgeable value would let any
// caller mint a fresh bucket per request — see internal/audit/context.go, which
// makes the same choice for the forensic trail.
//
// Assumes Cloud Run's direct ingress (no external HTTPS load balancer in front —
// infra/terraform defines domain mappings, no url_map/backend_service). Behind a
// GCLB the chain becomes <caller-supplied>, <client-ip>, <lb-ip> and the correct
// entry would be the second-to-last; revisit this when the topology changes.
//
// A rightmost entry that is not a valid IP cannot have come from the proxy, so
// it is discarded rather than used as a map key.
func clientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if ip := strings.TrimSpace(parts[len(parts)-1]); net.ParseIP(ip) != nil {
			return ip
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
