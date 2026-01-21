package main

import (
	"context"
	"log"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/api"
	"github.com/OZIOisgood/zeta/internal/tools"
	"github.com/fatih/color"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	tools.PrintBanner("assets/api-banner.txt", color.FgHiCyan)
	tools.LoadEnv()

	dbURL := tools.GetEnv("DB_URL")

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		log.Fatalf("Unable to connect to database: %v\n", err)
	}
	defer pool.Close()

	srv := api.NewServer(pool)

	log.Println("Zeta API listening on :8080")
	if err := http.ListenAndServe(":8080", srv.Router); err != nil {
		log.Fatal(err)
	}
}
