package llm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
)

//go:generate mockgen -source=service.go -destination=mocks/mock_enhancer.go -package=mocks

// Enhancer is the interface for LLM text enhancement.
type Enhancer interface {
	EnhanceReviewText(ctx context.Context, originalText string) (string, error)
}

type Service struct {
	apiKey string
	client *http.Client
	logger *slog.Logger
}

type OpenRouterRequest struct {
	Model    string     `json:"model"`
	Messages []Message  `json:"messages"`
}

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenRouterResponse struct {
	ID      string   `json:"id"`
	Choices []Choice `json:"choices"`
	Error   *APIError `json:"error,omitempty"`
}

type Choice struct {
	Index   int     `json:"index"`
	Message Message `json:"message"`
}

type APIError struct {
	Message string `json:"message"`
	Type    string `json:"type"`
	Code    string `json:"code"`
}

func NewService(logger *slog.Logger) *Service {
	apiKey := os.Getenv("OPENROUTER_API_KEY")
	if apiKey == "" {
		logger.Warn("OpenRouter API key not found in environment")
	}

	return &Service{
		apiKey: apiKey,
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
		logger: logger,
	}
}

func (s *Service) EnhanceReviewText(ctx context.Context, originalText string) (string, error) {
	if s.apiKey == "" {
		return "", fmt.Errorf("OpenRouter API key not configured")
	}

	if strings.TrimSpace(originalText) == "" {
		return "", fmt.Errorf("text cannot be empty")
	}

	s.logger.InfoContext(ctx, "llm_enhance_request",
		slog.String("component", "llm"),
		slog.Int("text_length", len(originalText)),
	)

	// Step 1: detect the dominant language the author intended to write in.
	lang := s.detectLanguage(ctx, originalText)

	// Step 2: enhance with a language-aware system prompt.
	enhanced, err := s.callAPI(ctx, []Message{
		{Role: "system", Content: s.buildSystemPrompt(lang)},
		{Role: "user", Content: s.buildEnhancementPrompt(originalText)},
	})
	if err != nil {
		return "", err
	}

	s.logger.InfoContext(ctx, "llm_enhance_success",
		slog.String("component", "llm"),
		slog.Int("original_length", len(originalText)),
		slog.Int("enhanced_length", len(enhanced)),
	)

	return enhanced, nil
}

// detectLanguage asks the model to identify the dominant language of the text.
// It falls back to "English" on error.
func (s *Service) detectLanguage(ctx context.Context, text string) string {
	lang, err := s.callAPI(ctx, []Message{
		{
			Role: "system",
			Content: "You are a language identification tool. Identify the single dominant language that the author primarily intended to write in — ignore any stray words in other languages. Reply with ONLY the language name in English (e.g. 'English', 'Russian', 'Ukrainian', 'Spanish', 'French', 'Arabic'). Output nothing else.",
		},
		{Role: "user", Content: text},
	})
	if err != nil {
		s.logger.WarnContext(ctx, "llm_detect_language_failed",
			slog.String("component", "llm"),
			slog.Any("err", err),
		)
		return "English"
	}
	return strings.TrimSpace(lang)
}

// callAPI sends messages to the OpenRouter API and returns the text of the first choice.
func (s *Service) callAPI(ctx context.Context, messages []Message) (string, error) {
	reqBody := OpenRouterRequest{
		Model:    "anthropic/claude-3-haiku",
		Messages: messages,
	}

	jsonData, err := json.Marshal(reqBody)
	if err != nil {
		s.logger.ErrorContext(ctx, "llm_marshal_failed",
			slog.String("component", "llm"),
			slog.Any("err", err),
		)
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", "https://openrouter.ai/api/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("HTTP-Referer", "https://zeta.internal")
	req.Header.Set("X-Title", "Zeta Review Enhancement")

	resp, err := s.client.Do(req)
	if err != nil {
		s.logger.ErrorContext(ctx, "llm_request_failed",
			slog.String("component", "llm"),
			slog.Any("err", err),
		)
		return "", fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		s.logger.ErrorContext(ctx, "llm_read_response_failed",
			slog.String("component", "llm"),
			slog.Any("err", err),
		)
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		s.logger.ErrorContext(ctx, "llm_api_error",
			slog.String("component", "llm"),
			slog.Int("status_code", resp.StatusCode),
			slog.String("response", string(body)),
		)
		return "", fmt.Errorf("API error: %d - %s", resp.StatusCode, string(body))
	}

	var response OpenRouterResponse
	if err := json.Unmarshal(body, &response); err != nil {
		s.logger.ErrorContext(ctx, "llm_unmarshal_failed",
			slog.String("component", "llm"),
			slog.Any("err", err),
		)
		return "", fmt.Errorf("failed to unmarshal response: %w", err)
	}

	if response.Error != nil {
		s.logger.ErrorContext(ctx, "llm_response_error",
			slog.String("component", "llm"),
			slog.String("error_type", response.Error.Type),
			slog.String("error_message", response.Error.Message),
		)
		return "", fmt.Errorf("API returned error: %s", response.Error.Message)
	}

	if len(response.Choices) == 0 {
		s.logger.ErrorContext(ctx, "llm_no_choices",
			slog.String("component", "llm"),
		)
		return "", fmt.Errorf("no choices returned from API")
	}

	return response.Choices[0].Message.Content, nil
}


func (s *Service) buildSystemPrompt(lang string) string {
	return fmt.Sprintf(`You are a professional text editor specializing in educational review content. Your job is to lightly polish feedback written by coaches to students.

OUTPUT LANGUAGE: %s — write your entire response in %s only, regardless of any other languages present in the input.

If the input contains a word or phrase from a different language, the author simply forgot the word; replace it silently with the natural equivalent in %s.

EDITING RULES:
- Fix typos, spelling mistakes, and grammatical errors.
- Make the language more professional and polished, but keep it natural.
- Maintain the original meaning and intent entirely.
- Keep the tone constructive and educational.
- If the text is already well-written, make minimal changes.
- Return ONLY the corrected text — no explanations, no commentary, no preamble.`, lang, lang, lang)
}

func (s *Service) buildEnhancementPrompt(text string) string {
	return fmt.Sprintf("Please enhance the following coach feedback:\n\n%s", text)
}