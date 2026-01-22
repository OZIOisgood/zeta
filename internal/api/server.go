package api

import (
	"encoding/json"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/assets"
	"github.com/OZIOisgood/zeta/internal/auth"
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

	queries := db.New(s.Pool)
	
	// Initialize Handlers
	counterHandler := counter.NewHandler(queries)
	authHandler := auth.NewHandler()
	assetsHandler := assets.NewHandler(queries)

	// Global Middleware
	s.Router.Use(auth.Middleware())

	// Public Routes
	s.Router.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
	})

	// Auth Routes
	s.Router.Group(func(r chi.Router) {
		r.Get("/auth/login", authHandler.Login)
		r.Get("/auth/callback", authHandler.Callback)
		r.Post("/auth/logout", authHandler.Logout)
		r.Get("/auth/me", authHandler.Me)
	})

	// Protected Routes
	s.Router.Group(func(r chi.Router) {
		r.Use(auth.RequireAuth)
		r.Route("/counter", counterHandler.RegisterRoutes)
		r.Route("/assets", assetsHandler.RegisterRoutes)
	})
}
