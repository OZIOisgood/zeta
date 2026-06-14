package access

import (
	"crypto/rand"
	"math/big"
)

// ExpertCodeAllotment is the fixed number of signup codes an expert receives.
const ExpertCodeAllotment = 5

// signupCodeLength is the character length of a generated signup code.
const signupCodeLength = 8

const codeAlphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"

// generateCode returns a cryptographically random code of the given length.
func generateCode(length int) (string, error) {
	b := make([]byte, length)
	for i := range b {
		idx, err := rand.Int(rand.Reader, big.NewInt(int64(len(codeAlphabet))))
		if err != nil {
			return "", err
		}
		b[i] = codeAlphabet[idx.Int64()]
	}
	return string(b), nil
}
