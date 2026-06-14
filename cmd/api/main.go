package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	_ "time/tzdata" // embed IANA timezone database for Cloud Run (alpine has no tzdata)

	"github.com/OZIOisgood/zeta/internal/api"
	"github.com/OZIOisgood/zeta/internal/audit"
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

	// Audit partitions must exist before any audited mutation commits. Fail
	// fast like the pool itself — serving with a broken forensic trail would
	// abort business transactions at runtime instead (audit insert error ⇒
	// transaction rollback by design).
	if err := audit.EnsurePartitions(ctx, pool); err != nil {
		baseLogger.ErrorContext(ctx, "audit_ensure_partitions_failed",
			slog.String("component", "audit"),
			slog.Any("err", err))
		panic(err)
	}

	srv := api.NewServer(pool, baseLogger)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)

	go func() {
		baseLogger.InfoContext(ctx, "api_starting", slog.String("port", "8080"))
		if err := http.ListenAndServe(":8080", srv.Router); err != nil {
			baseLogger.ErrorContext(ctx, "api_listen_failed", slog.Any("err", err))
			panic(err)
		}
	}()

	<-stop
	baseLogger.InfoContext(ctx, "api_shutting_down")
	srv.Shutdown()
}
