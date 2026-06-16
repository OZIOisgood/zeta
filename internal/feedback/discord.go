package feedback

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const discordAPIBaseURL = "https://discord.com/api/v10"

type DiscordThread struct {
	ThreadID  string
	MessageID string
}

type DiscordPoster interface {
	CreateForumPost(ctx context.Context, channelID string, post DiscordPost) (DiscordThread, error)
}

type DiscordPost struct {
	Title   string
	Content string
}

type DiscordClient struct {
	token   string
	baseURL string
	client  *http.Client
}

func NewDiscordClient(token string) *DiscordClient {
	return &DiscordClient{
		token:   strings.TrimSpace(token),
		baseURL: discordAPIBaseURL,
		client:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *DiscordClient) CreateForumPost(ctx context.Context, channelID string, post DiscordPost) (DiscordThread, error) {
	if c == nil || c.token == "" {
		return DiscordThread{}, fmt.Errorf("discord bot token is not configured")
	}
	if strings.TrimSpace(channelID) == "" {
		return DiscordThread{}, fmt.Errorf("discord feedback forum channel is not configured")
	}

	body := createForumThreadRequest{
		Name:                truncate(post.Title, 100),
		AutoArchiveDuration: 10080,
		Message: discordForumMessage{
			Content: truncate(post.Content, 2000),
			AllowedMentions: discordAllowedMentions{
				Parse: []string{},
			},
		},
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return DiscordThread{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/channels/"+channelID+"/threads", bytes.NewReader(payload))
	if err != nil {
		return DiscordThread{}, err
	}
	req.Header.Set("Authorization", "Bot "+c.token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "ZetaFeedbackBot/1.0")

	resp, err := c.client.Do(req)
	if err != nil {
		return DiscordThread{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return DiscordThread{}, fmt.Errorf("discord create forum post returned %d: %s", resp.StatusCode, readLimited(resp.Body, 512))
	}

	var decoded createForumThreadResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return DiscordThread{}, err
	}
	if decoded.ID == "" {
		return DiscordThread{}, fmt.Errorf("discord create forum post response did not include thread id")
	}

	return DiscordThread{ThreadID: decoded.ID, MessageID: decoded.Message.ID}, nil
}

type createForumThreadRequest struct {
	Name                string              `json:"name"`
	AutoArchiveDuration int                 `json:"auto_archive_duration"`
	Message             discordForumMessage `json:"message"`
}

type discordForumMessage struct {
	Content         string                 `json:"content"`
	AllowedMentions discordAllowedMentions `json:"allowed_mentions"`
}

type discordAllowedMentions struct {
	Parse []string `json:"parse"`
}

type createForumThreadResponse struct {
	ID      string `json:"id"`
	Message struct {
		ID string `json:"id"`
	} `json:"message"`
}

func readLimited(r io.Reader, n int64) string {
	data, _ := io.ReadAll(io.LimitReader(r, n))
	return strings.TrimSpace(string(data))
}

func truncate(s string, limit int) string {
	runes := []rune(strings.TrimSpace(s))
	if len(runes) <= limit {
		return string(runes)
	}
	if limit <= 3 {
		return string(runes[:limit])
	}
	return string(runes[:limit-3]) + "..."
}
