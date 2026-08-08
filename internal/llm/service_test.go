package llm

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"testing"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func newTestService() *Service {
	return &Service{logger: slog.Default()}
}

func TestBuildEnhancementPrompt(t *testing.T) {
	s := newTestService()

	tests := []struct {
		name string
		text string
	}{
		{"plain text", "Great work on the presentation!"},
		{"multiline", "Line one.\nLine two.\nLine three."},
		{"special chars", "Score: 100% well done"},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			prompt := s.buildEnhancementPrompt(tc.text)
			if !strings.Contains(prompt, tc.text) {
				t.Errorf("prompt does not contain input text %q", tc.text)
			}
			if !strings.Contains(strings.ToLower(prompt), "do not introduce it or label it") {
				t.Error("prompt does not prohibit introductory labels")
			}
			if !strings.HasSuffix(strings.TrimRight(prompt, "\n"), tc.text) {
				t.Errorf("input text is not at end of prompt")
			}
		})
	}
}

func TestNormalizeEnhancedText(t *testing.T) {
	tests := []struct {
		name string
		text string
		want string
	}{
		{
			name: "leading enhancement label is removed",
			text: "Here is the enhanced feedback:\n\nKeep your shoulders relaxed.",
			want: "Keep your shoulders relaxed.",
		},
		{
			name: "label matching is case insensitive",
			text: "HERE IS THE ENHANCED FEEDBACK: Keep your shoulders relaxed.",
			want: "Keep your shoulders relaxed.",
		},
		{
			name: "surrounding whitespace is removed",
			text: "\n  Keep your shoulders relaxed.  \n",
			want: "Keep your shoulders relaxed.",
		},
		{
			name: "label mentioned later is preserved",
			text: "The note says: Here is the enhanced feedback:",
			want: "The note says: Here is the enhanced feedback:",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := normalizeEnhancedText(tt.text); got != tt.want {
				t.Fatalf("normalizeEnhancedText() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestEnhanceReviewTextRemovesProviderPreamble(t *testing.T) {
	responses := []string{
		`{"choices":[{"message":{"role":"assistant","content":"{\"English\":100}"}}]}`,
		`{"choices":[{"message":{"role":"assistant","content":"Here is the enhanced feedback:\n\nKeep your shoulders relaxed."}}]}`,
	}
	call := 0
	service := &Service{
		apiKey: "test-key",
		logger: slog.Default(),
		client: &http.Client{
			Transport: roundTripFunc(func(_ *http.Request) (*http.Response, error) {
				if call >= len(responses) {
					t.Fatalf("unexpected OpenRouter call %d", call+1)
				}
				body := responses[call]
				call++
				return &http.Response{
					StatusCode: http.StatusOK,
					Body:       io.NopCloser(strings.NewReader(body)),
					Header:     make(http.Header),
				}, nil
			}),
		},
	}

	got, err := service.EnhanceReviewText(context.Background(), "keep shoulders relaxed")
	if err != nil {
		t.Fatalf("EnhanceReviewText() error = %v", err)
	}
	if got != "Keep your shoulders relaxed." {
		t.Fatalf("EnhanceReviewText() = %q, want clean feedback", got)
	}
	if call != len(responses) {
		t.Fatalf("OpenRouter calls = %d, want %d", call, len(responses))
	}
}
