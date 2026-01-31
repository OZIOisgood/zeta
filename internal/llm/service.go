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

	prompt := s.buildEnhancementPrompt(originalText)
	
	reqBody := OpenRouterRequest{
		Model: "anthropic/claude-3-haiku",  // Fast and cost-effective model for text editing
		Messages: []Message{
			{
				Role:    "user",
				Content: prompt,
			},
		},
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

	s.logger.InfoContext(ctx, "llm_enhance_request",
		slog.String("component", "llm"),
		slog.String("model", reqBody.Model),
		slog.Int("text_length", len(originalText)),
	)

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

	enhancedText := response.Choices[0].Message.Content
	
	s.logger.InfoContext(ctx, "llm_enhance_success",
		slog.String("component", "llm"),
		slog.Int("original_length", len(originalText)),
		slog.Int("enhanced_length", len(enhancedText)),
	)

	return enhancedText, nil
}

func (s *Service) buildEnhancementPrompt(text string) string {
	return fmt.Sprintf(`You are a professional text editor specializing in educational review content.

Your task is to enhance the following text while following these guidelines:
1. Identify and preserve the original language (English, Spanish, French, etc.)
2. Keep the same language throughout the response
3. Fix any typos and grammatical errors
4. Make the language more professional and polished
5. Maintain the original meaning and intent
6. The text is a review/feedback from an expert to a student's video submission
7. Keep the tone constructive and educational
8. If the text is already well-written, make minimal changes
9. Return ONLY the enhanced text, no explanations or additional commentary

Original text to enhance:
%s`, text)
}