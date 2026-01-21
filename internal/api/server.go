package api

import (
	"encoding/json"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/counter"
	"github.com/OZIOisgood/zeta/internal/db"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Server struct {
	Router *chi.Mux
	Pool   *pgxpool.Pool
}

func NewServer(pool *pgxpool.Pool) *Server {
	s := &Server{
		Router: chi.NewRouter(),
		Pool:   pool,
	}
	s.routes()
	return s
}

func (s *Server) routes() {
	s.Router.Use(middleware.Logger)
	s.Router.Use(middleware.Recoverer)
	s.Router.Use(middleware.StripSlashes)

	s.Router.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:4200", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	s.Router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	queries := db.New(s.Pool)
	counterHandler := counter.NewHandler(queries)

	s.Router.Route("/counter", counterHandler.RegisterRoutes)
}
