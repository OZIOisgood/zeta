package devices

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/OZIOisgood/zeta/internal/auth"
	"github.com/OZIOisgood/zeta/internal/db"
	dbmocks "github.com/OZIOisgood/zeta/internal/db/mocks"
	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"go.uber.org/mock/gomock"
)

// withUser injects an auth.UserContext into the request context.
func withUser(r *http.Request, user *auth.UserContext) *http.Request {
	ctx := context.WithValue(r.Context(), auth.UserKey, user)
	return r.WithContext(ctx)
}

// callerUser is a reusable authenticated user for register tests.
var callerUser = &auth.UserContext{ID: "user-abc"}

func postRegister(body any) *http.Request {
	b, _ := json.Marshal(body)
	return httptest.NewRequest(http.MethodPost, "/devices", bytes.NewReader(b))
}

func deleteToken(token string) *http.Request {
	r := httptest.NewRequest(http.MethodDelete, "/devices/"+token, nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("token", token)
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
}

func TestRegister(t *testing.T) {
	validToken := "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
	validTokenAlt := "ExpoPushToken[yyyyyyyyyyyyyy]"

	tests := []struct {
		name       string
		user       *auth.UserContext
		body       any
		setupMock  func(q *dbmocks.MockQuerier)
		wantStatus int
	}{
		{
			name: "unauthenticated returns 401 with no DB call",
			user: nil,
			body: map[string]string{"expo_push_token": validToken, "platform": "ios"},
			setupMock: func(q *dbmocks.MockQuerier) {
				q.EXPECT().UpsertDevice(gomock.Any(), gomock.Any()).Times(0)
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name: "valid token upserts for caller user ID",
			user: callerUser,
			body: map[string]string{"expo_push_token": validToken, "platform": "ios"},
			setupMock: func(q *dbmocks.MockQuerier) {
				q.EXPECT().UpsertDevice(gomock.Any(), db.UpsertDeviceParams{
					UserID:        callerUser.ID,
					ExpoPushToken: validToken,
					Platform:      pgtype.Text{String: "ios", Valid: true},
				}).Return(db.UserDevice{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "re-register same token calls UpsertDevice again",
			user: callerUser,
			body: map[string]string{"expo_push_token": validToken, "platform": "android"},
			setupMock: func(q *dbmocks.MockQuerier) {
				q.EXPECT().UpsertDevice(gomock.Any(), db.UpsertDeviceParams{
					UserID:        callerUser.ID,
					ExpoPushToken: validToken,
					Platform:      pgtype.Text{String: "android", Valid: true},
				}).Return(db.UserDevice{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "alternate prefix ExpoPushToken accepted",
			user: callerUser,
			body: map[string]string{"expo_push_token": validTokenAlt},
			setupMock: func(q *dbmocks.MockQuerier) {
				q.EXPECT().UpsertDevice(gomock.Any(), db.UpsertDeviceParams{
					UserID:        callerUser.ID,
					ExpoPushToken: validTokenAlt,
					Platform:      pgtype.Text{},
				}).Return(db.UserDevice{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "empty token returns 400 with no DB call",
			user: callerUser,
			body: map[string]string{"expo_push_token": "", "platform": "ios"},
			setupMock: func(q *dbmocks.MockQuerier) {
				q.EXPECT().UpsertDevice(gomock.Any(), gomock.Any()).Times(0)
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "invalid token format returns 400 with no DB call",
			user: callerUser,
			body: map[string]string{"expo_push_token": "not-an-expo-token", "platform": "ios"},
			setupMock: func(q *dbmocks.MockQuerier) {
				q.EXPECT().UpsertDevice(gomock.Any(), gomock.Any()).Times(0)
			},
			wantStatus: http.StatusBadRequest,
		},
		{
			name: "unknown platform is stored as null",
			user: callerUser,
			body: map[string]string{"expo_push_token": validToken, "platform": "web"},
			setupMock: func(q *dbmocks.MockQuerier) {
				q.EXPECT().UpsertDevice(gomock.Any(), db.UpsertDeviceParams{
					UserID:        callerUser.ID,
					ExpoPushToken: validToken,
					Platform:      pgtype.Text{},
				}).Return(db.UserDevice{}, nil)
			},
			wantStatus: http.StatusOK,
		},
		{
			name: "DB error returns 500",
			user: callerUser,
			body: map[string]string{"expo_push_token": validToken, "platform": "ios"},
			setupMock: func(q *dbmocks.MockQuerier) {
				q.EXPECT().UpsertDevice(gomock.Any(), gomock.Any()).Return(db.UserDevice{}, errors.New("db error"))
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			q := dbmocks.NewMockQuerier(ctrl)
			tt.setupMock(q)

			h := NewHandler(q, slog.Default())
			req := postRegister(tt.body)
			if tt.user != nil {
				req = withUser(req, tt.user)
			}
			rec := httptest.NewRecorder()
			h.Register(rec, req)

			assert.Equal(t, tt.wantStatus, rec.Code)
			if tt.wantStatus == http.StatusOK {
				var resp map[string]string
				require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
				assert.Equal(t, "ok", resp["status"])
			}
		})
	}
}

func TestUnregister(t *testing.T) {
	token := "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"

	tests := []struct {
		name       string
		user       *auth.UserContext
		token      string
		setupMock  func(q *dbmocks.MockQuerier)
		wantStatus int
	}{
		{
			name:  "unauthenticated returns 401 with no DB call",
			user:  nil,
			token: token,
			setupMock: func(q *dbmocks.MockQuerier) {
				q.EXPECT().DeleteDevice(gomock.Any(), gomock.Any()).Times(0)
			},
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:  "valid delete scoped to caller user ID returns 204",
			user:  callerUser,
			token: token,
			setupMock: func(q *dbmocks.MockQuerier) {
				q.EXPECT().DeleteDevice(gomock.Any(), db.DeleteDeviceParams{
					ExpoPushToken: token,
					UserID:        callerUser.ID,
				}).Return(nil)
			},
			wantStatus: http.StatusNoContent,
		},
		{
			name:  "DB error returns 500",
			user:  callerUser,
			token: token,
			setupMock: func(q *dbmocks.MockQuerier) {
				q.EXPECT().DeleteDevice(gomock.Any(), gomock.Any()).Return(errors.New("db error"))
			},
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctrl := gomock.NewController(t)
			q := dbmocks.NewMockQuerier(ctrl)
			tt.setupMock(q)

			h := NewHandler(q, slog.Default())
			req := deleteToken(tt.token)
			if tt.user != nil {
				req = withUser(req, tt.user)
			}
			rec := httptest.NewRecorder()
			h.Unregister(rec, req)

			assert.Equal(t, tt.wantStatus, rec.Code)
		})
	}
}
