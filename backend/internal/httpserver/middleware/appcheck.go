// Package middleware provides HTTP middleware for the YouTube Tools API server.
// appcheck.go verifies Firebase App Check tokens on tool API requests.
package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"os"

	firebase "firebase.google.com/go/v4"
	"firebase.google.com/go/v4/appcheck"
	"google.golang.org/api/option"
)

// AppCheckVerifier holds an initialized Firebase App Check client.
type AppCheckVerifier struct {
	client *appcheck.Client
}

// NewAppCheckVerifier initializes the Firebase App Check client from a service
// account JSON file. If serviceAccountPath is empty, it returns a no-op verifier
// and logs a warning — this allows dev mode to work without credentials.
func NewAppCheckVerifier(serviceAccountPath string) (*AppCheckVerifier, error) {
	if serviceAccountPath == "" {
		slog.Warn("FIREBASE_SERVICE_ACCOUNT_PATH not set — App Check verification is disabled (dev mode)")
		return &AppCheckVerifier{client: nil}, nil
	}

	if _, err := os.Stat(serviceAccountPath); err != nil {
		slog.Warn("Firebase service account file not found — App Check disabled", "path", serviceAccountPath)
		return &AppCheckVerifier{client: nil}, nil
	}

	app, err := firebase.NewApp(context.Background(), nil, option.WithCredentialsFile(serviceAccountPath))
	if err != nil {
		return nil, err
	}

	client, err := app.AppCheck(context.Background())
	if err != nil {
		return nil, err
	}

	slog.Info("Firebase App Check initialized", "serviceAccount", serviceAccountPath)
	return &AppCheckVerifier{client: client}, nil
}

// Middleware returns an HTTP handler that verifies the Firebase App Check token
// sent in the X-Firebase-AppCheck header. If no verifier client is configured
// (dev mode), the request passes through with a log warning.
func (v *AppCheckVerifier) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if v.client == nil {
			// Dev mode — no credential configured, skip verification
			slog.Debug("App Check skipped (no client configured)")
			next.ServeHTTP(w, r)
			return
		}

		token := r.Header.Get("X-Firebase-AppCheck")
		if token == "" {
			http.Error(w, `{"error":{"code":"APP_CHECK_MISSING","message":"Missing App Check token."}}`, http.StatusUnauthorized)
			return
		}

		_, err := v.client.VerifyToken(token)
		if err != nil {
			slog.Warn("App Check token verification failed", "err", err)
			http.Error(w, `{"error":{"code":"APP_CHECK_INVALID","message":"Invalid or expired App Check token."}}`, http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
