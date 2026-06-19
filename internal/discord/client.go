package discord

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

const apiBaseURL = "https://discord.com/api/v10"

type Thread struct {
	ThreadID  string
	MessageID string
}

type Post struct {
	Title   string
	Content string
}

type Poster interface {
	CreateForumPost(ctx context.Context, channelID string, post Post) (Thread, error)
}

type Client struct {
	token   string
	baseURL string
	client  *http.Client
}

func NewClient(token string) *Client {
	return &Client{
		token:   strings.TrimSpace(token),
		baseURL: apiBaseURL,
		client:  &http.Client{Timeout: 10 * time.Second},
	}
}

func (c *Client) CreateForumPost(ctx context.Context, channelID string, post Post) (Thread, error) {
	if c == nil || c.token == "" {
		return Thread{}, fmt.Errorf("discord bot token is not configured")
	}
	if strings.TrimSpace(channelID) == "" {
		return Thread{}, fmt.Errorf("discord forum channel is not configured")
	}

	body := createForumThreadRequest{
		Name:                Truncate(post.Title, 100),
		AutoArchiveDuration: 10080,
		Message: discordForumMessage{
			Content: Truncate(post.Content, 2000),
			AllowedMentions: discordAllowedMentions{
				Parse: []string{},
			},
		},
	}
	payload, err := json.Marshal(body)
	if err != nil {
		return Thread{}, err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/channels/"+channelID+"/threads", bytes.NewReader(payload))
	if err != nil {
		return Thread{}, err
	}
	req.Header.Set("Authorization", "Bot "+c.token)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("User-Agent", "StridoInboxBot/1.0")

	resp, err := c.client.Do(req)
	if err != nil {
		return Thread{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return Thread{}, fmt.Errorf("discord create forum post returned %d: %s", resp.StatusCode, readLimited(resp.Body, 512))
	}

	var decoded createForumThreadResponse
	if err := json.NewDecoder(resp.Body).Decode(&decoded); err != nil {
		return Thread{}, err
	}
	if decoded.ID == "" {
		return Thread{}, fmt.Errorf("discord create forum post response did not include thread id")
	}

	return Thread{ThreadID: decoded.ID, MessageID: decoded.Message.ID}, nil
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

func Truncate(s string, limit int) string {
	runes := []rune(strings.TrimSpace(s))
	if len(runes) <= limit {
		return string(runes)
	}
	if limit <= 3 {
		return string(runes[:limit])
	}
	return string(runes[:limit-3]) + "..."
}
