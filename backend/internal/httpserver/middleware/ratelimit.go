package middleware

import (
	"net"
	"net/http"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

type ipLimiter struct {
	limiter  *rate.Limiter
	lastSeen time.Time
}

func RateLimit(r rate.Limit, b int) func(http.Handler) http.Handler {
	var limiters = make(map[string]*ipLimiter)
	var mu sync.Mutex

	// Cleanup old limiters periodically
	go func() {
		for {
			time.Sleep(1 * time.Minute)
			mu.Lock()
			for ip, l := range limiters {
				if time.Since(l.lastSeen) > 5*time.Minute {
					delete(limiters, ip)
				}
			}
			mu.Unlock()
		}
	}()

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			ip, _, err := net.SplitHostPort(req.RemoteAddr)
			if err != nil {
				ip = req.RemoteAddr
			}

			// Handle proxy headers like X-Forwarded-For if behind Nginx
			if xff := req.Header.Get("X-Forwarded-For"); xff != "" {
				ips := stringsSplit(xff, ",")
				if len(ips) > 0 {
					ip = stringsTrimSpace(ips[0])
				}
			}

			mu.Lock()
			lim, exists := limiters[ip]
			if !exists {
				lim = &ipLimiter{
					limiter: rate.NewLimiter(r, b),
				}
				limiters[ip] = lim
			}
			lim.lastSeen = time.Now()
			mu.Unlock()

			if !lim.limiter.Allow() {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusTooManyRequests)
				w.Write([]byte(`{"error":{"code":"RATE_LIMITED","message":"Too many requests. Please slow down."}}`))
				return
			}

			next.ServeHTTP(w, req)
		})
	}
}

// Minimal helpers to avoid importing strings just for this
func stringsSplit(s, sep string) []string {
	var res []string
	for {
		i := stringsIndex(s, sep)
		if i < 0 {
			res = append(res, s)
			break
		}
		res = append(res, s[:i])
		s = s[i+len(sep):]
	}
	return res
}

func stringsIndex(s, sep string) int {
	for i := 0; i <= len(s)-len(sep); i++ {
		if s[i:i+len(sep)] == sep {
			return i
		}
	}
	return -1
}

func stringsTrimSpace(s string) string {
	for len(s) > 0 && (s[0] == ' ' || s[0] == '\t' || s[0] == '\r' || s[0] == '\n') {
		s = s[1:]
	}
	for len(s) > 0 && (s[len(s)-1] == ' ' || s[len(s)-1] == '\t' || s[len(s)-1] == '\r' || s[len(s)-1] == '\n') {
		s = s[:len(s)-1]
	}
	return s
}
