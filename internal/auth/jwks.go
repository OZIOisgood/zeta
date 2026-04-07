package auth

import (
	"crypto/rsa"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"
)

// jwksKey holds a single parsed RSA public key from a JWKS response.
type jwksKey struct {
	kid       string
	publicKey *rsa.PublicKey
}

// jwksHTTPClient is used for all JWKS fetches. A short timeout prevents a slow
// or unresponsive WorkOS endpoint from stalling all in-flight auth requests.
var jwksHTTPClient = &http.Client{Timeout: 5 * time.Second}

// JWKSCache fetches and caches RSA public keys from a JWKS endpoint.
// Keys are refreshed after ttl. On fetch failure the last known keys are kept
// (fail-open for availability), but if no keys have ever been loaded the
// middleware will reject all tokens (fail-closed on cold start).
type JWKSCache struct {
	url       string
	ttl       time.Duration
	mu        sync.RWMutex
	keys      map[string]*rsa.PublicKey // keyed by kid
	fetchedAt time.Time
}

func NewJWKSCache(url string, ttl time.Duration) *JWKSCache {
	return &JWKSCache{
		url:  url,
		ttl:  ttl,
		keys: make(map[string]*rsa.PublicKey),
	}
}

// GetKey returns the RSA public key for the given kid, refreshing if needed.
func (c *JWKSCache) GetKey(kid string) (*rsa.PublicKey, error) {
	c.mu.RLock()
	expired := time.Since(c.fetchedAt) > c.ttl
	key, found := c.keys[kid]
	c.mu.RUnlock()

	if found && !expired {
		return key, nil
	}

	// Refresh (only one goroutine at a time)
	c.mu.Lock()
	defer c.mu.Unlock()

	// Double-check after acquiring write lock
	if time.Since(c.fetchedAt) <= c.ttl {
		if k, ok := c.keys[kid]; ok {
			return k, nil
		}
	}

	if err := c.fetch(); err != nil {
		// If we already have keys, keep serving them (stale-on-error)
		if len(c.keys) > 0 {
			if k, ok := c.keys[kid]; ok {
				return k, nil
			}
			return nil, fmt.Errorf("jwks: kid %q not found (using stale cache after fetch error: %w)", kid, err)
		}
		return nil, fmt.Errorf("jwks: fetch failed and no cached keys available: %w", err)
	}

	key, found = c.keys[kid]
	if !found {
		return nil, fmt.Errorf("jwks: kid %q not found in JWKS", kid)
	}
	return key, nil
}

// fetch downloads and parses the JWKS. Must be called with write lock held.
func (c *JWKSCache) fetch() error {
	resp, err := jwksHTTPClient.Get(c.url) // #nosec G107 — URL is a compile-time constant from env
	if err != nil {
		return fmt.Errorf("jwks: http get: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("jwks: unexpected status %d", resp.StatusCode)
	}

	var jwks struct {
		Keys []struct {
			Kid string `json:"kid"`
			Kty string `json:"kty"`
			Alg string `json:"alg"`
			Use string `json:"use"`
			N   string `json:"n"`
			E   string `json:"e"`
		} `json:"keys"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("jwks: decode: %w", err)
	}

	newKeys := make(map[string]*rsa.PublicKey, len(jwks.Keys))
	for _, k := range jwks.Keys {
		if k.Kty != "RSA" || k.Use != "sig" {
			continue
		}
		pub, err := parseRSAPublicKey(k.N, k.E)
		if err != nil {
			return fmt.Errorf("jwks: parse key %q: %w", k.Kid, err)
		}
		newKeys[k.Kid] = pub
	}

	if len(newKeys) == 0 {
		return fmt.Errorf("jwks: no RSA signing keys found in response")
	}

	c.keys = newKeys
	c.fetchedAt = time.Now()
	return nil
}

// parseRSAPublicKey decodes base64url-encoded n and e into an *rsa.PublicKey.
func parseRSAPublicKey(nB64, eB64 string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nB64)
	if err != nil {
		return nil, fmt.Errorf("decode n: %w", err)
	}
	eBytes, err := base64.RawURLEncoding.DecodeString(eB64)
	if err != nil {
		return nil, fmt.Errorf("decode e: %w", err)
	}

	n := new(big.Int).SetBytes(nBytes)
	e := new(big.Int).SetBytes(eBytes)

	return &rsa.PublicKey{
		N: n,
		E: int(e.Int64()),
	}, nil
}
