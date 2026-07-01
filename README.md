# YouTube Tools Platform

A premium, high-performance web platform featuring a collection of ten utility tools for YouTube videos, playlists, and channels. Architected for rapid extensibility — adding an eleventh tool requires zero structural changes.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Go (1.24+) · `chi/v5` router · `golang.org/x/time/rate` · `log/slog` |
| **Frontend** | Next.js 16 · App Router · TypeScript · React 19 · Tailwind CSS v4 |
| **Core Engine** | `yt-dlp` invoked as a subprocess (never imported as a library) |
| **Build** | Next.js static export (`output: 'export'`) served by Nginx |

---

## Architecture

### The `Tool` Interface

Every tool — regardless of whether it does pure string parsing, a fast metadata lookup, or produces a downloadable file — implements the same two-method interface:

```go
type Tool interface {
    Slug() string
    Validate(req Request) error
    Execute(ctx context.Context, req Request) (any, error)
}
```

This interface is defined once in `internal/tools/tool.go`. The router in `internal/httpserver/router.go` iterates the tool registry at startup to mount `POST /api/v1/tools/{slug}` for all ten tools without any hand-written route registrations. Adding tool #11 means:
1. Create a new package under `internal/tools/<slug>/` implementing `Tool`.
2. Register it in `cmd/server/main.go`.
3. Add one entry to `frontend/src/lib/tools-registry.ts`.

That's it. No router changes, no frontend structural changes.

### Why This Fits Ten Disparate Tools

The ten tools span three weight classes:
- **Pure parsing** (URL Cleaner, ID Extractor, Timestamp Generator) — `Execute()` contains only Go string logic; zero external I/O.
- **Fast metadata lookup** (Video Metadata Viewer, Channel ID Finder, Transcript Extractor, Playlist Duration Calculator) — `Execute()` shells out to `yt-dlp --dump-json` once, returns structured data.
- **File producers** (Transcript Downloader, Thumbnail Downloader, Playlist Exporter) — `Execute()` generates a file, writes it to an isolated temp directory, registers it under a cryptographic token, and returns the download URL.

The same interface handles all three without special-casing.

### Shared URL Parsing — `internal/urlkit`

Five tools need to extract a YouTube video ID, playlist ID, or channel identifier from a user-supplied URL. All five import `internal/urlkit` — a single, well-tested package. No tool reimplements URL parsing logic independently.

### Concurrency Protection

`internal/ytdlp.Client` holds a channel-based semaphore. All three `yt-dlp`-calling methods (`DumpMetadata`, `DownloadSubtitles`, `FetchPlaylistInfo`) acquire the semaphore before exec'ing and release it on return. The semaphore capacity is set from `MAX_CONCURRENT_YTDLP` (default: 4) to protect the VPS alongside its existing FFmpeg streaming services.

---

## Repository Structure

```
youtube-tools/
├── frontend/                     # Next.js Static Export Client
│   ├── src/
│   │   ├── app/                  # root layout + categorized home + 10 tool routes
│   │   │   └── (tools)/          # route group — transcript-extractor/, thumbnail-downloader/, …
│   │   ├── components/
│   │   │   ├── tools/            # tool-page-layout, url-input, results-panel, tool-options
│   │   │   └── shared/           # site-header, site-footer, channel-promo
│   │   └── lib/                  # tools-registry.ts, api-client.ts, validation.ts
│   └── public/                   # channel-logo.png and static assets
├── backend/
│   ├── cmd/server/main.go        # entrypoint — wires config, store, ytdlp client, all tools
│   └── internal/
│       ├── config/               # env-var loader (PORT, ALLOWED_ORIGINS, rate limits, …)
│       ├── downloads/            # token-based temp file store with expiry + cleanup worker
│       ├── httpserver/           # chi router + middleware (rate limit, CORS, security headers, recover)
│       ├── tools/                # Tool interface · registry · 10 tool packages
│       ├── urlkit/               # shared YouTube URL → ID parser (video, playlist, channel)
│       └── ytdlp/                # ONLY place that shells out to yt-dlp subprocess
├── deploy/
│   ├── nginx/youtube-tools.conf  # proxies /api/ to Go; serves static export for everything else
│   └── systemd/youtube-tools-backend.service
├── .github/workflows/ci.yml      # CI: Go test + build · TS typecheck + lint + Next.js build
└── README.md
```

---

## Prerequisites

- Go 1.24 or later
- Node.js 20 or later + pnpm
- `yt-dlp` installed and in `PATH`
- (Recommended) `curl_cffi` in the yt-dlp Python environment for `--impersonate chrome` to avoid YouTube 429 errors

---

## Local Development

### Backend

```bash
cd backend
cp .env.example .env
go run cmd/server/main.go
# API listening on http://localhost:8080
```

### Frontend

```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev
# UI running on http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP server port | `8080` |
| `ALLOWED_ORIGINS` | CORS-allowed origins (comma-separated) | `http://localhost:3000` |
| `RATE_LIMIT_RATE` | Max requests per second per IP | `5.0` |
| `RATE_LIMIT_BURST` | Burst capacity per IP | `10` |
| `MAX_PLAYLIST_SIZE` | Max playlist entries parsed (prevents exhaustion) | `500` |
| `MAX_CONCURRENT_YTDLP` | Max simultaneous yt-dlp processes | `4` |
| `TEMP_DIR` | Base directory for per-request temp files | `./downloads_temp` |
| `YTDLP_PATH` | Path to the yt-dlp binary | `yt-dlp` |
| `YOUTUBE_COOKIES_PATH` | Optional cookies.txt for yt-dlp | `""` |
| `HTTP_PROXY` | Optional HTTP/HTTPS proxy for yt-dlp | `""` |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the Go API (empty = same origin) | `""` |

---

## API Reference

Every tool uses the same request/response envelope.

**Request (all tool endpoints):**
```json
POST /api/v1/tools/{tool-slug}
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=...",
  "options": { "lang": "en", "format": "srt" },
  "timestamps": []
}
```

**Standard error shape:**
```json
{
  "error": {
    "code": "INVALID_URL",
    "message": "That doesn't look like a valid YouTube video URL."
  }
}
```

**Error codes:** `INVALID_URL` · `RESOURCE_UNAVAILABLE` · `OPTION_NOT_AVAILABLE` · `PLAYLIST_TOO_LARGE` · `RATE_LIMITED` · `PROCESSING_FAILED` · `TIMEOUT`

### Endpoints

| Method | Path | Input | Response fields |
|---|---|---|---|
| `POST` | `/api/v1/tools/transcript-extractor` | `url`, `options.lang` | `title`, `language`, `transcript` |
| `POST` | `/api/v1/tools/transcript-downloader` | `url`, `options.lang`, `options.format` (srt/vtt) | `title`, `language`, `format`, `downloadUrl` |
| `POST` | `/api/v1/tools/thumbnail-downloader` | `url`, `options.resolution` (max/high/medium/standard) | `videoId`, `requestedResolution`, `deliveredResolution`, `previewUrl`, `downloadUrl` |
| `POST` | `/api/v1/tools/video-metadata-viewer` | `url` | `title`, `channel`, `uploadDate`, `viewCount`, `likeCount`, `duration`, `description`, `tags`, `thumbnail`, `rawJson` |
| `POST` | `/api/v1/tools/playlist-duration-calculator` | `url` (playlist) | `playlistTitle`, `videoCount`, `totalSeconds`, `formatted`, `atSpeed` |
| `POST` | `/api/v1/tools/youtube-url-cleaner` | `url` | `originalUrl`, `cleanedUrl`, `shortUrl`, `videoId` |
| `POST` | `/api/v1/tools/youtube-id-extractor` | `url` | `videoId`, `playlistId`, `channelId`, `handle`, `detectedType` |
| `POST` | `/api/v1/tools/timestamp-generator` | `url`, `timestamps[]` (time, label) | `videoId`, `links[]`, `formattedBlock` |
| `POST` | `/api/v1/tools/channel-id-finder` | `url` (channel) | `channelName`, `channelId`, `rssUrl` |
| `POST` | `/api/v1/tools/playlist-exporter` | `url` (playlist), `options.format` (csv/json) | `playlistTitle`, `videoCount`, `format`, `downloadUrl` |
| `GET` | `/api/v1/downloads/{token}` | — | Binary file attachment |
| `GET` | `/healthz` | — | `{"status":"OK"}` |

---

## How to Add a New Tool (Tool #11)

**Backend:**
1. Create `backend/internal/tools/<slug>/tool.go` implementing the `Tool` interface.
2. If you need YouTube ID parsing, import `internal/urlkit` — don't re-implement it.
3. Register in `backend/cmd/server/main.go`:
   ```go
   tools.Register(newtool.New(dependencies))
   ```

**Frontend:**
1. Add one entry to `frontend/src/lib/tools-registry.ts`:
   ```ts
   {
     slug: "my-new-tool",
     name: "My New Tool",
     description: "...",
     category: "Quick Utilities", // or a new category string
     inputType: "video",
     iconName: "Wand2",
   }
   ```
2. Create `frontend/src/app/(tools)/my-new-tool/page.tsx`.

The tool card appears on the home page automatically under its category. The router mounts its API endpoint automatically.

---

## Security Measures

- **Input validation:** Every URL is validated server-side against a strict hostname allowlist (`youtube.com`, `youtu.be`) and must match the expected shape for that specific tool (video ID, playlist ID, or channel identifier). Wrong-type URLs are rejected with `INVALID_URL`.
- **ID format validation:** All extracted IDs pass through `internal/urlkit` which enforces YouTube's fixed-length alphanumeric patterns before any ID is used to construct a URL or subprocess argument.
- **Safe subprocesses:** Every `yt-dlp` call uses `exec.CommandContext` with an argument slice — never shell string concatenation. Context timeout (45s) is applied per request.
- **Concurrency cap:** A semaphore (configurable, default 4) prevents the VPS from spawning unbounded `yt-dlp` processes.
- **Playlist size cap:** Playlist Duration Calculator and Playlist Exporter reject or truncate playlists above `MAX_PLAYLIST_SIZE` (default: 500).
- **Secure download links:** Files for download are registered under a 32-character hex token (`crypto/rand`) with a 20-minute TTL. A background cleanup worker removes expired files and their isolated temp directories from disk.
- **Per-request temp isolation:** Each tool that writes a file creates its own `os.MkdirTemp` directory. Error paths call `os.RemoveAll` immediately; successful paths are cleaned up by the expiry worker.
- **Rate limiting:** Per-IP token-bucket rate limiting on all `/api/v1/tools/*` endpoints (configurable rate and burst).
- **CORS:** Locked to `ALLOWED_ORIGINS` env var — never `*`.
- **Security headers:** Set at both the Go middleware layer and the Nginx layer: CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS.
- **Systemd hardening:** Backend runs as a dedicated non-root `youtube-tools` user, `Restart=on-failure`.
- **Graceful shutdown:** SIGTERM triggers `server.Shutdown()` with a 10-second drain timeout.
- **No secrets in logs:** `log/slog` structured logging; config values not echoed.

---

## Production Deployment

```bash
# 1. Build frontend static export
cd frontend && pnpm build
# Copy frontend/out/ to /var/www/youtube-tools/frontend/out/

# 2. Build Go binary
cd backend && go build -o youtube-tools-server ./cmd/server/main.go
# Copy binary to /var/www/youtube-tools/backend/youtube-tools-server

# 3. Install systemd unit
sudo cp deploy/systemd/youtube-tools-backend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable youtube-tools-backend
sudo systemctl start youtube-tools-backend

# 4. Configure Nginx
sudo cp deploy/nginx/youtube-tools.conf /etc/nginx/sites-available/youtube-tools
sudo ln -s /etc/nginx/sites-available/youtube-tools /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 5. Issue TLS certificate (once DNS resolves to 89.117.62.24)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

The backend environment file lives at `/etc/youtube-tools/backend.env` (referenced by the systemd unit). Copy from `backend/.env.example` and fill in production values.

---

## Testing

```bash
# Backend — all packages, with race detector
cd backend && go test -race ./...

# Frontend — typecheck + lint
cd frontend && pnpm exec tsc --noEmit && pnpm lint
```

CI runs both automatically on every push and pull request via `.github/workflows/ci.yml`.
