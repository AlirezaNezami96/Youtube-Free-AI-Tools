package httpserver

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"time"

	"youtube-tools/backend/internal/config"
	"youtube-tools/backend/internal/downloads"
	"youtube-tools/backend/internal/httpserver/middleware"
	"youtube-tools/backend/internal/tools"

	"github.com/go-chi/chi/v5"
	chimiddleware "github.com/go-chi/chi/v5/middleware"
	"golang.org/x/time/rate"
)

type Server struct {
	router      *chi.Mux
	config      *config.Config
	dlStore     *downloads.Store
	appCheck    *middleware.AppCheckVerifier
}

func New(cfg *config.Config, dlStore *downloads.Store, appCheck *middleware.AppCheckVerifier) *Server {
	r := chi.NewRouter()

	// Standard middlewares
	r.Use(chimiddleware.RequestID)
	r.Use(chimiddleware.RealIP)
	r.Use(chimiddleware.Logger)
	r.Use(middleware.Recover)
	r.Use(middleware.SecurityHeaders)
	r.Use(middleware.CORS(cfg.AllowedOrigins))
	r.Use(middleware.RateLimit(rate.Limit(cfg.RateLimitRate), cfg.RateLimitBurst))

	s := &Server{
		router:   r,
		config:   cfg,
		dlStore:  dlStore,
		appCheck: appCheck,
	}

	s.setupRoutes()
	return s
}

func (s *Server) setupRoutes() {
	// Health check
	s.router.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"OK"}`))
	})

	// Download serving route
	s.router.Get("/api/v1/downloads/{token}", s.handleDownload)

	// Mount routes for registered tools dynamically — with App Check middleware
	s.router.Group(func(r chi.Router) {
		r.Use(s.appCheck.Middleware)
		for _, tool := range tools.All() {
			slug := tool.Slug()
			t := tool // capture loop variable
			slog.Info("Mounting tool route", "slug", slug)
			r.Post("/api/v1/tools/"+slug, func(w http.ResponseWriter, r *http.Request) {
				s.handleToolCall(w, r, t)
			})
		}
	})
}

func (s *Server) handleToolCall(w http.ResponseWriter, r *http.Request, t tools.Tool) {
	var req tools.Request
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.writeError(w, http.StatusBadRequest, "INVALID_REQUEST", "Failed to parse request JSON.")
		return
	}

	// Validate request input
	if err := t.Validate(req); err != nil {
		var toolErr *tools.ToolError
		if errors.As(err, &toolErr) {
			s.writeError(w, http.StatusBadRequest, toolErr.Code, toolErr.Message)
		} else {
			s.writeError(w, http.StatusBadRequest, "INVALID_URL", err.Error())
		}
		return
	}

	// Run tool with timeout
	ctx, cancel := context.WithTimeout(r.Context(), 45*time.Second)
	defer cancel()

	result, err := t.Execute(ctx, req)
	if err != nil {
		var toolErr *tools.ToolError
		if errors.As(err, &toolErr) {
			s.writeError(w, http.StatusInternalServerError, toolErr.Code, toolErr.Message)
		} else {
			s.writeError(w, http.StatusInternalServerError, "PROCESSING_FAILED", err.Error())
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(result)
}

func (s *Server) handleDownload(w http.ResponseWriter, r *http.Request) {
	token := chi.URLParam(r, "token")
	if token == "" {
		s.writeError(w, http.StatusBadRequest, "INVALID_TOKEN", "Missing download token.")
		return
	}

	item, exists := s.dlStore.Get(token)
	if !exists {
		s.writeError(w, http.StatusNotFound, "RESOURCE_UNAVAILABLE", "Download not found or expired.")
		return
	}

	// Read file contents to serve
	content, err := readFileBytes(item.FilePath)
	if err != nil {
		s.writeError(w, http.StatusInternalServerError, "PROCESSING_FAILED", "Failed to load downloadable resource.")
		return
	}

	// Serve the file attachment
	w.Header().Set("Content-Type", item.ContentType)
	w.Header().Set("Content-Disposition", `attachment; filename="`+item.OriginalName+`"`)
	w.WriteHeader(http.StatusOK)
	w.Write(content)
}

// Helper to write standard error format
func (s *Server) writeError(w http.ResponseWriter, status int, code, msg string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(map[string]any{
		"error": map[string]string{
			"code":    code,
			"message": msg,
		},
	})
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.router.ServeHTTP(w, r)
}

// Helper to read file bytes to avoid importing os
func readFileBytes(path string) ([]byte, error) {
	return os.ReadFile(path)
}
