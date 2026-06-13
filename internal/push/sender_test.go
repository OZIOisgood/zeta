package push

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"testing"

	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// mockHTTP implements httpDoer for tests.
type mockHTTP struct {
	// calls records every request that was made.
	calls []*http.Request
	// resp is the response to return (nil → transport error).
	resp *http.Response
	// err is the transport error to return.
	err error
}

func (m *mockHTTP) Do(req *http.Request) (*http.Response, error) {
	m.calls = append(m.calls, req)
	return m.resp, m.err
}

// okResponse builds a 200 JSON response whose tickets are all "ok".
func okResponse(n int) *http.Response {
	tickets := make([]expoTicket, n)
	for i := range tickets {
		tickets[i] = expoTicket{Status: "ok"}
	}
	return jsonResponse(200, expoResponse{Data: tickets})
}

// jsonResponse builds an HTTP response with the given status and JSON body.
func jsonResponse(status int, v any) *http.Response {
	b, _ := json.Marshal(v)
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(bytes.NewReader(b)),
		Header:     make(http.Header),
	}
}

// deviceNotRegisteredResponse builds a response where the ticket at index
// badIndex has DeviceNotRegistered and all others are "ok".
func deviceNotRegisteredResponse(n, badIndex int) *http.Response {
	tickets := make([]expoTicket, n)
	for i := range tickets {
		tickets[i] = expoTicket{Status: "ok"}
	}
	tickets[badIndex].Status = "error"
	tickets[badIndex].Details.Error = "DeviceNotRegistered"
	return jsonResponse(200, expoResponse{Data: tickets})
}

// validPayload returns a marshalled video_reviewed payload for use in tests.
func validPayload(t *testing.T) []byte {
	t.Helper()
	b, err := json.Marshal(videoReviewedPayload{
		AssetID:      "asset-1",
		VideoTitle:   "Backstroke Drill",
		ReviewerName: "Coach",
	})
	require.NoError(t, err)
	return b
}

func device(token string) db.UserDevice {
	return db.UserDevice{ExpoPushToken: token}
}

func newSenderWithHTTP(q db.Querier, h httpDoer, accessToken string) *Sender {
	return &Sender{
		q:           q,
		http:        h,
		accessToken: accessToken,
		log:         slog.Default(),
	}
}

func TestSender_Notify(t *testing.T) {
	const (
		recipientID = "user-1"
		token1      = "ExponentPushToken[aaaaaaaaaaaaaaaaaaaaaa]"
		token2      = "ExponentPushToken[bbbbbbbbbbbbbbbbbbbbbb]"
	)

	tests := []struct {
		name              string
		accessToken       string
		devices           []db.UserDevice
		devicesErr        error
		notificationType  string
		payload           []byte
		httpTransport     *mockHTTP
		expectHTTPCalls   int
		expectDeleteCalls []string // tokens that should be passed to DeleteDeviceByToken
		// wantAuthHeader: if true the Authorization header must be present in the POST.
		wantAuthHeader bool
	}{
		{
			name:             "no devices — no HTTP call",
			devices:          []db.UserDevice{},
			notificationType: typeVideoReviewed,
			payload:          nil, // won't reach BuildMessage
			httpTransport:    &mockHTTP{},
			expectHTTPCalls:  0,
		},
		{
			name:             "ListDevicesForUser DB error — no HTTP call, no panic",
			devices:          nil,
			devicesErr:       errors.New("db error"),
			notificationType: typeVideoReviewed,
			payload:          nil,
			httpTransport:    &mockHTTP{},
			expectHTTPCalls:  0,
		},
		{
			name:             "unknown notification type — no HTTP call",
			devices:          []db.UserDevice{device(token1)},
			notificationType: "not_real",
			payload:          []byte(`{}`),
			httpTransport:    &mockHTTP{},
			expectHTTPCalls:  0,
		},
		{
			name:            "2 devices — one POST with both tokens in body",
			accessToken:     "test-access-token",
			devices:         []db.UserDevice{device(token1), device(token2)},
			notificationType: typeVideoReviewed,
			httpTransport: &mockHTTP{
				resp: okResponse(2),
			},
			expectHTTPCalls: 1,
			wantAuthHeader:  true,
		},
		{
			name:            "no access token — Authorization header absent",
			accessToken:     "",
			devices:         []db.UserDevice{device(token1)},
			notificationType: typeVideoReviewed,
			httpTransport: &mockHTTP{
				resp: okResponse(1),
			},
			expectHTTPCalls: 1,
			wantAuthHeader:  false,
		},
		{
			name:            "DeviceNotRegistered ticket — DeleteDeviceByToken for that token only",
			devices:         []db.UserDevice{device(token1), device(token2)},
			notificationType: typeVideoReviewed,
			httpTransport: &mockHTTP{
				// token1 is index 0; make index 1 (token2) the bad one.
				resp: deviceNotRegisteredResponse(2, 1),
			},
			expectHTTPCalls:   1,
			expectDeleteCalls: []string{token2},
		},
		{
			name:            "first token DeviceNotRegistered — only that token pruned",
			devices:         []db.UserDevice{device(token1), device(token2)},
			notificationType: typeVideoReviewed,
			httpTransport: &mockHTTP{
				resp: deviceNotRegisteredResponse(2, 0),
			},
			expectHTTPCalls:   1,
			expectDeleteCalls: []string{token1},
		},
		{
			name:            "transport error — swallowed, no panic",
			devices:         []db.UserDevice{device(token1)},
			notificationType: typeVideoReviewed,
			httpTransport: &mockHTTP{
				err: errors.New("connection refused"),
			},
			expectHTTPCalls: 1,
		},
		{
			name:            "non-2xx response — swallowed, no panic",
			devices:         []db.UserDevice{device(token1)},
			notificationType: typeVideoReviewed,
			httpTransport: &mockHTTP{
				resp: &http.Response{
					StatusCode: 500,
					Body:       io.NopCloser(bytes.NewReader([]byte(`{"error":"server error"}`))),
					Header:     make(http.Header),
				},
			},
			expectHTTPCalls: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			q := dbmocks.NewMockQuerier(ctrl)

			// Set up ListDevicesForUser expectation.
			q.EXPECT().
				ListDevicesForUser(gomock.Any(), recipientID).
				Return(tt.devices, tt.devicesErr).
				AnyTimes()

			// Set up DeleteDeviceByToken expectations.
			if len(tt.expectDeleteCalls) > 0 {
				for _, tok := range tt.expectDeleteCalls {
					q.EXPECT().
						DeleteDeviceByToken(gomock.Any(), tok).
						Return(nil).
						Times(1)
				}
			} else {
				q.EXPECT().DeleteDeviceByToken(gomock.Any(), gomock.Any()).Times(0)
			}

			// Build payload: use a valid video_reviewed payload when the type
			// needs one but the test hasn't provided one.
			payload := tt.payload
			if payload == nil && tt.notificationType == typeVideoReviewed {
				payload = mustMarshal(videoReviewedPayload{
					AssetID:    "asset-x",
					VideoTitle: "Test Video",
				})
			}

			s := newSenderWithHTTP(q, tt.httpTransport, tt.accessToken)
			// Must not panic even on errors.
			assert.NotPanics(t, func() {
				s.Notify(context.Background(), recipientID, tt.notificationType, payload)
			})

			// Verify HTTP call count.
			assert.Equal(t, tt.expectHTTPCalls, len(tt.httpTransport.calls),
				"unexpected number of HTTP calls")

			if tt.expectHTTPCalls > 0 && len(tt.httpTransport.calls) > 0 {
				req := tt.httpTransport.calls[0]

				// Must always be a POST to the Expo API.
				assert.Equal(t, http.MethodPost, req.Method)
				assert.Equal(t, expoAPIURL, req.URL.String())
				assert.Equal(t, "application/json", req.Header.Get("Content-Type"))

				// Authorization header presence.
				authHeader := req.Header.Get("Authorization")
				if tt.wantAuthHeader {
					assert.Contains(t, authHeader, "Bearer ", "Authorization header should be set")
					assert.Contains(t, authHeader, tt.accessToken)
				} else {
					assert.Empty(t, authHeader, "Authorization header should be absent when no access token")
				}

				// When 2 devices: both tokens must appear in the request body.
				if len(tt.devices) == 2 {
					bodyBytes, err := io.ReadAll(req.Body)
					require.NoError(t, err)
					var msgs []expoMessage
					require.NoError(t, json.Unmarshal(bodyBytes, &msgs))
					assert.Len(t, msgs, 2)
					assert.Equal(t, tt.devices[0].ExpoPushToken, msgs[0].To)
					assert.Equal(t, tt.devices[1].ExpoPushToken, msgs[1].To)
					// Both messages must carry the notification type in data.
					for _, m := range msgs {
						assert.Equal(t, tt.notificationType, m.Data["type"])
						assert.NotEmpty(t, m.Title)
					}
				}
			}
		})
	}
}
