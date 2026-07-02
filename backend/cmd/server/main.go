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
	"youtube-tools/backend/internal/httpserver/middleware"
	"youtube-tools/backend/internal/tools"
	"youtube-tools/backend/internal/tools/bulkmetadataextractor"
	"youtube-tools/backend/internal/tools/bulkthumbnaildownloader"
	"youtube-tools/backend/internal/tools/channelidfinder"
	"youtube-tools/backend/internal/tools/chaptervalidator"
	"youtube-tools/backend/internal/tools/playlistdurationcalculator"
	"youtube-tools/backend/internal/tools/playlistexporter"
	"youtube-tools/backend/internal/tools/shortsurlconverter"
	"youtube-tools/backend/internal/tools/thumbnaildownloader"
	"youtube-tools/backend/internal/tools/thumbnailpreview"
	"youtube-tools/backend/internal/tools/timestampgenerator"
	"youtube-tools/backend/internal/tools/timestampoffset"
	"youtube-tools/backend/internal/tools/transcriptdownloader"
	"youtube-tools/backend/internal/tools/transcriptextractor"
	"youtube-tools/backend/internal/tools/transcriptsearch"
	"youtube-tools/backend/internal/tools/videodurationcalculator"
	"youtube-tools/backend/internal/tools/videometadataviewer"
	"youtube-tools/backend/internal/tools/youtubeidextractor"
	"youtube-tools/backend/internal/tools/youtubeurlcleaner"
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

	// Initialize Firebase App Check verifier (graceful no-op if not configured)
	appCheck, err := middleware.NewAppCheckVerifier(cfg.FirebaseServiceAccountPath)
	if err != nil {
		slog.Error("Failed to initialize Firebase App Check", "err", err)
		os.Exit(1)
	}

	// Register all tools (Part 1 original + Part 2 additions)
	tools.Register(transcriptextractor.New(ytClient, cfg))
	tools.Register(transcriptdownloader.New(ytClient, dlStore, cfg))
	tools.Register(thumbnaildownloader.New(dlStore, cfg))
	tools.Register(videometadataviewer.New(ytClient))
	tools.Register(playlistdurationcalculator.New(ytClient, cfg))
	tools.Register(youtubeurlcleaner.New())
	tools.Register(youtubeidextractor.New())
	tools.Register(timestampgenerator.New())
	tools.Register(channelidfinder.New(ytClient))   // slug: channel-rss-feed-generator
	tools.Register(playlistexporter.New(ytClient, dlStore, cfg))

	// Part 2 — new tools
	tools.Register(transcriptsearch.New(ytClient, cfg))
	tools.Register(timestampoffset.New())
	tools.Register(chaptervalidator.New())
	tools.Register(bulkmetadataextractor.New(ytClient))
	tools.Register(shortsurlconverter.New())
	tools.Register(videodurationcalculator.New(ytClient))
	tools.Register(bulkthumbnaildownloader.New(dlStore, cfg))
	tools.Register(thumbnailpreview.New())

	// Setup Server
	srv := httpserver.New(cfg, dlStore, appCheck)

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
