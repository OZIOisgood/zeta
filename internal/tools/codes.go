package tools

import (
	"crypto/rand"
	"math/big"
	"strings"
)

// crockfordAlphabet is Crockford's Base32: digits + uppercase letters excluding
// I, L, O, U (avoids transcription ambiguity). Used for human-typeable invite codes.
const crockfordAlphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"

// GenerateCode returns a cryptographically random Crockford Base32 code of length n.
func GenerateCode(n int) (string, error) {
	b := make([]byte, n)
	for i := range b {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(crockfordAlphabet))))
		if err != nil {
			return "", err
		}
		b[i] = crockfordAlphabet[idx.Int64()]
	}
	return string(b), nil
}

// NormalizeCode canonicalizes user-entered code input to match generated codes:
// uppercases, strips spaces/hyphens, and maps Crockford-ambiguous characters
// (I/L -> 1, O -> 0) to their canonical digits.
func NormalizeCode(s string) string {
	up := strings.ToUpper(strings.TrimSpace(s))
	repl := strings.NewReplacer(" ", "", "-", "", "I", "1", "L", "1", "O", "0")
	return repl.Replace(up)
}
