package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"youtube-tools/backend/internal/config"
	"youtube-tools/backend/internal/downloads"
	"youtube-tools/backend/internal/httpserver"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/tools/channelidfinder"
	"youtube-tools/backend/internal/tools/playlistdurationcalculator"
	"youtube-tools/backend/internal/tools/playlistexporter"
	"youtube-tools/backend/internal/tools/thumbnaildownloader"
	"youtube-tools/backend/internal/tools/timestampgenerator"
	"youtube-tools/backend/internal/tools/transcriptdownloader"
	"youtube-tools/backend/internal/tools/transcriptextractor"
	"youtube-tools/backend/internal/tools/youtubeidextractor"
	"youtube-tools/backend/internal/tools/youtubeurlcleaner"
	"youtube-tools/backend/internal/tools/videometadataviewer"
	"youtube-tools/backend/internal/ytdlp"
)

func main() {
	// Configure structured logger
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	slog.Info("Starting YouTube Tools Platform Backend")

	// Load configuration
	cfg := config.Load()

	// Initialize downloads storage
	dlStore := downloads.NewStore()
	dlStore.StartCleanupWorker(1 * time.Minute)

	// Initialize yt-dlp client with concurrency cap from config
	ytClient := ytdlp.New(cfg.YtDlpPath, cfg.CookiesPath, cfg.ProxyURL, cfg.MaxConcurrentYtDlp)

	// Register all 10 tools
	tools.Register(transcriptextractor.New(ytClient, cfg))
	tools.Register(transcriptdownloader.New(ytClient, dlStore, cfg))
	tools.Register(thumbnaildownloader.New(dlStore, cfg))
	tools.Register(videometadataviewer.New(ytClient))
	tools.Register(playlistdurationcalculator.New(ytClient, cfg))
	tools.Register(youtubeurlcleaner.New())
	tools.Register(youtubeidextractor.New())
	tools.Register(timestampgenerator.New())
	tools.Register(channelidfinder.New(ytClient))
	tools.Register(playlistexporter.New(ytClient, dlStore, cfg))

	// Setup Server
	srv := httpserver.New(cfg, dlStore)

	server := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      srv,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	// Graceful shutdown handler
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)
		<-sigChan

		slog.Info("Shutting down HTTP server gracefully...")
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := server.Shutdown(ctx); err != nil {
			slog.Error("Server shutdown error", "err", err)
		}
	}()

	slog.Info("HTTP server running", "port", cfg.Port)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		slog.Error("ListenAndServe failed", "err", err)
		os.Exit(1)
	}
	slog.Info("Server stopped.")
}
