package tools

import (
	"strings"
	"testing"
)

// TestGenerateCode verifies length, alphabet membership, and non-determinism.
func TestGenerateCode(t *testing.T) {
	tests := []struct {
		name string
		n    int
	}{
		{name: "length 8", n: 8},
		{name: "length 1", n: 1},
		{name: "length 16", n: 16},
		{name: "length 0", n: 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got, err := GenerateCode(tc.n)
			if err != nil {
				t.Fatalf("GenerateCode(%d) returned error: %v", tc.n, err)
			}
			if len(got) != tc.n {
				t.Fatalf("GenerateCode(%d) length = %d, want %d", tc.n, len(got), tc.n)
			}
			for i, c := range got {
				if !strings.ContainsRune(crockfordAlphabet, c) {
					t.Errorf("GenerateCode(%d)[%d] = %q not in Crockford alphabet", tc.n, i, string(c))
				}
			}
		})
	}
}

// TestGenerateCodeNonDeterministic ensures successive calls do not collide, which
// would indicate a broken (non-random) generator.
func TestGenerateCodeNonDeterministic(t *testing.T) {
	const n = 8
	const iterations = 100
	seen := make(map[string]struct{}, iterations)
	for i := 0; i < iterations; i++ {
		got, err := GenerateCode(n)
		if err != nil {
			t.Fatalf("GenerateCode(%d) returned error: %v", n, err)
		}
		if _, dup := seen[got]; dup {
			t.Fatalf("GenerateCode(%d) produced duplicate %q within %d iterations", n, got, iterations)
		}
		seen[got] = struct{}{}
	}
}

// TestNormalizeCode covers casing, separator stripping, and ambiguous-char mapping.
func TestNormalizeCode(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "empty", in: "", want: ""},
		{name: "lowercase to upper", in: "abc123", want: "ABC123"},
		{name: "trims surrounding whitespace", in: "  abc  ", want: "ABC"},
		{name: "strips inner spaces", in: "io l", want: "101"},
		{name: "strips hyphens", in: "abc-123", want: "ABC123"},
		{name: "maps I and L to 1, O to 0", in: "ILO", want: "110"},
		{name: "mixed separators and ambiguous", in: "abc-123 il o", want: "ABC123110"},
		{name: "lowercase ambiguous chars", in: "iLo", want: "110"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			got := NormalizeCode(tc.in)
			if got != tc.want {
				t.Errorf("NormalizeCode(%q) = %q, want %q", tc.in, got, tc.want)
			}
		})
	}
}
