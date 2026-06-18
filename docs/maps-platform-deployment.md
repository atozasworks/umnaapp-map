# UMNAAPP Maps Platform — Deployment

The public map platform runs inside the **same backend process** as the existing
UMNAAPP app — no new service, no new database. You only need to (1) point a
`maps.` subdomain at the same backend and (2) optionally set a few env vars.

The existing deployment (GitHub Actions → VPS + PM2, or Docker) is unchanged.

---

## 1. What ships automatically

After deploying the current branch, the following are live with no extra steps:

| Surface | URL (main host) | URL (maps subdomain) |
|---------|-----------------|----------------------|
| Public REST API | `/api/public/*` | `/api/public/*` |
| JS SDK | `/sdk.js` | `/sdk.js` |
| Embeddable viewer | `/embedded-map` | `/` and `/embedded-map` |
| Realtime | `/public-maps` (socket.io) | `/public-maps` |

The frontend automatically renders the login-free map (no login/landing/home)
when EITHER:
- the host starts with `maps.` (e.g. `maps.umnaapp.com`), or
- the path is `/embedded-map` or `/map`.

No separate frontend build is required — it is the same SPA bundle.

---

## 2. DNS + subdomain

Create a DNS record so the maps subdomain resolves to the same server:

```
maps.umnaapp.com.  CNAME  umnaapp.com.      # or an A record to the same VPS IP
```

---

## 3. nginx

A ready-to-use `maps.umnaapp.com` server block has been added to
[`nginx/nginx.conf`](../nginx/nginx.conf). Key points:

- It proxies `/api/`, `/socket.io/`, `/sdk.js`, and `/` to the same backend.
- It does **not** send `X-Frame-Options`, and sets `Content-Security-Policy:
  frame-ancestors *`, so the map can be embedded on any site.

For a non-Docker VPS (PM2) setup, use an equivalent server block, e.g.:

```nginx
server {
    listen 443 ssl;
    server_name maps.umnaapp.com;

    # ssl_certificate / ssl_certificate_key ...  (use certbot)

    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "frame-ancestors *" always;

    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Issue a TLS cert for the subdomain (e.g. `certbot --nginx -d maps.umnaapp.com`).

> The backend also strips `X-Frame-Options` and sets `frame-ancestors *` for the
> `/embedded-map` and `/map` paths, so embedding works even when reached via the
> main host.

---

## 4. Environment variables (optional)

All public features work with defaults. To customize, set in `backend/.env`:

```bash
# Default viewer camera (served via GET /api/public/config)
PUBLIC_MAP_DEFAULT_LAT=12.9716
PUBLIC_MAP_DEFAULT_LNG=77.5946
PUBLIC_MAP_DEFAULT_ZOOM=12

# Fallback raster tile host for the viewer (also used by /api/map/tiles proxy)
TILESERVER_URL=https://umnaapp.in

# Recommended: enables public-API rate limiting + search caching
REDIS_URL=redis://localhost:6379
```

Frontend (build-time, optional):

```bash
# If your maps host is NOT a maps.* subdomain, set its exact hostname so the SPA
# renders the public map at "/" for that host.
VITE_MAPS_HOST=maps.example.com
```

> CORS: the main app's `CORS_ORIGINS` is unrelated to the public API. The public
> API (`/api/public/*`) and `/sdk.js` send `Access-Control-Allow-Origin: *`
> on their own, so external sites can call them from any origin.

---

## 5. Verify after deploy

```bash
# Public API responds without auth
curl -s https://maps.umnaapp.com/api/public/categories | head

# SDK is served as JavaScript
curl -sI https://maps.umnaapp.com/sdk.js | grep -i content-type

# Viewer loads (HTML)
curl -sI https://maps.umnaapp.com/embedded-map | head

# Private API still protected (expect 401)
curl -s -o /dev/null -w "%{http_code}\n" https://maps.umnaapp.com/api/map/places
```

Then open `https://maps.umnaapp.com` in a browser — you should see only the map,
with no login, register, landing, or home page.
