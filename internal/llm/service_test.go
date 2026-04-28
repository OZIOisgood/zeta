package llm

import (
	"log/slog"
	"strings"
	"testing"
)

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
			if !strings.HasSuffix(strings.TrimRight(prompt, "\n"), tc.text) {
				t.Errorf("input text is not at end of prompt")
			}
		})
	}
}
