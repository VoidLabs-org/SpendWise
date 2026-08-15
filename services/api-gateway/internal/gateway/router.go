package gateway

import (
	"encoding/json"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"

	"spendwise/api-gateway/internal/config"
)

// route maps a URL prefix to an upstream service. Paths are proxied through unchanged (no prefix
// stripping) — each service is expected to expose its own routes already namespaced under its
// domain prefix, the same way auth-service exposes /auth/register rather than just /register.
type route struct {
	prefix    string
	upstream  string
	protected bool
}

func New(cfg config.Config) http.Handler {
	authClient := NewAuthClient(cfg.AuthServiceURL)
	limiter := NewIPRateLimiter(cfg.RateLimitPerSecond, cfg.RateLimitBurst)

	routes := []route{
		{prefix: "/auth", upstream: cfg.AuthServiceURL, protected: false},
		{prefix: "/finance", upstream: cfg.FinanceServiceURL, protected: true},
		{prefix: "/vehicle", upstream: cfg.VehicleServiceURL, protected: true},
		{prefix: "/notifications", upstream: cfg.NotifyServiceURL, protected: true},
	}

	mux := http.NewServeMux()
	for _, rt := range routes {
		mux.Handle(rt.prefix+"/", buildRouteHandler(rt, authClient))
	}
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	var handler http.Handler = mux
	handler = limiter.Middleware(handler)
	handler = CORSMiddleware(cfg.AllowedOrigin, handler)
	return handler
}

func buildRouteHandler(rt route, authClient *AuthClient) http.Handler {
	if rt.upstream == "" {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			writeError(w, http.StatusServiceUnavailable, "this service isn't configured on the gateway yet")
		})
	}

	target, err := url.Parse(rt.upstream)
	if err != nil {
		log.Fatalf("invalid upstream URL for %s: %v", rt.prefix, err)
	}
	proxy := httputil.NewSingleHostReverseProxy(target)

	var handler http.Handler = proxy
	if rt.protected {
		handler = requireAuth(authClient, handler)
	}
	return handler
}

// requireAuth gates protected routes on Auth Service's /auth/validate, then forwards the
// resolved identity downstream via headers so services don't need to re-verify the JWT themselves.
func requireAuth(authClient *AuthClient, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		bearer := r.Header.Get("Authorization")
		if !strings.HasPrefix(bearer, "Bearer ") {
			writeError(w, http.StatusUnauthorized, "missing bearer token")
			return
		}

		result, err := authClient.Validate(bearer)
		if err != nil {
			writeError(w, http.StatusUnauthorized, "invalid or expired token")
			return
		}

		r.Header.Set("X-User-Id", result.UserID)
		r.Header.Set("X-User-Email", result.Email)
		next.ServeHTTP(w, r)
	})
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
