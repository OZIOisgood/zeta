package counter

import (
	"encoding/json"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	q *db.Queries
}

func NewHandler(q *db.Queries) *Handler {
	return &Handler{q: q}
}

func (h *Handler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.Get)
	r.Post("/increment", h.Increment)
}

func (h *Handler) Get(w http.ResponseWriter, r *http.Request) {
	val, err := h.q.GetCounter(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int32{"value": val})
}

func (h *Handler) Increment(w http.ResponseWriter, r *http.Request) {
	val, err := h.q.IncrementCounter(r.Context())
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]int32{"value": val})
}
