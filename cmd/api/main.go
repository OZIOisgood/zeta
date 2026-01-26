package main

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/OZIOisgood/zeta/internal/api"
	"github.com/OZIOisgood/zeta/internal/logger"
	"github.com/OZIOisgood/zeta/internal/tools"
	"github.com/fatih/color"
	"github.com/jackc/pgx/v5/pgxpool"
)

func main() {
	tools.PrintBanner("assets/api-banner.txt", color.FgHiCyan)
	tools.LoadEnv()

	// Initialize structured logger
	logLevel := tools.GetEnvOrDefault("LOG_LEVEL", "info")
	baseLogger := logger.NewWithLevel(logger.ParseLevel(logLevel))

	dbURL := tools.GetEnv("DB_URL")

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		baseLogger.ErrorContext(ctx, "failed_to_connect_database", slog.Any("err", err))
		panic(err)
	}
	defer pool.Close()

	srv := api.NewServer(pool, baseLogger)

	baseLogger.InfoContext(ctx, "api_starting", slog.String("port", "8080"))
	if err := http.ListenAndServe(":8080", srv.Router); err != nil {
		baseLogger.ErrorContext(ctx, "api_listen_failed", slog.Any("err", err))
		panic(err)
	}
}
