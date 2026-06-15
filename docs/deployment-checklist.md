# Deployment Checklist — UmnaApp Maps

Run top-to-bottom for a production deploy after the audit-fix work.

## 1. Environment variables (`backend/.env`)

See `backend/env.example.txt` for the full list. Required / important:

- [ ] `DATABASE_URL` — production PostgreSQL.
- [ ] `JWT_SECRET` — strong random string (≥ 32 chars).
- [ ] `ADMIN_SECRET` — **≥ 16 chars, not a common/weak value**. The server now
      refuses to start with a weak secret; if unset, the admin API is disabled.
- [ ] SMTP creds (`SMTP_*`) for OTP email.
- [ ] `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` (optional — enables web push).
      Generate with `node backend/scripts/generate-vapid-keys.js`.
- [ ] `GROQ_API_KEY` (optional — Ask Maps + chatbot; FAQ fallback works without it).
- [ ] CORS / frontend origin configured for the deployed domain.

## 2. Database migrations (apply in order)

Apply each SQL file, then regenerate the Prisma client once at the end.

```bash
cd backend
psql "$DATABASE_URL" -f prisma/add-favorites.sql              # if not already applied
psql "$DATABASE_URL" -f prisma/add-reviews-photos.sql         # if not already applied
psql "$DATABASE_URL" -f prisma/add-notifications.sql          # if not already applied
psql "$DATABASE_URL" -f prisma/add-place-festival.sql         # if not already applied
psql "$DATABASE_URL" -f prisma/add-user-profile-public.sql    # Phase 6
psql "$DATABASE_URL" -f prisma/add-phase7-claims-labels.sql   # Phase 7
psql "$DATABASE_URL" -f prisma/add-notification-preferences.sql  # Phase 8
psql "$DATABASE_URL" -f prisma/add-postgis-place-geom.sql     # Phase 9 (needs PostGIS)
npx prisma generate
```

- [ ] All migrations applied without error.
- [ ] `npx prisma generate` succeeded (new models: `BusinessClaim`, `PlaceLabel`,
      `NotificationPreference`; new Place columns recognized).
- [ ] PostGIS available? If `CREATE EXTENSION postgis` is not permitted on your
      host, skip Phase 9 — spatial endpoints fall back automatically.

> Migrations are idempotent (`IF NOT EXISTS` / guarded) and safe to re-run.

## 3. Build & start

```bash
# Backend
cd backend && npm ci && npm run start     # or your process manager (pm2/systemd)

# Frontend
cd frontend && npm ci && npm run build     # deploy dist/ behind your web server / CDN

# Admin
cd admin && npm ci && npm run build        # deploy dist/ (protect behind auth/VPN if desired)
```

- [ ] Backend starts cleanly (watch logs for the `ADMIN_SECRET` validation line).
- [ ] Service worker (`frontend/src/sw.js`) deployed; sensitive routes
      (`/api/auth`, `/api/admin`, `/api/user`) are `NetworkOnly` (never cached).
- [ ] HTTPS enabled end-to-end (required for Web Push + service worker).

## 4. Post-deploy smoke checks

- [ ] Register → receive OTP email → verify → login.
- [ ] Add a place; edit it (confirm no duplicate, audit row written).
- [ ] Search + category filter return server-filtered results.
- [ ] Place detail: reviews add/edit/delete, photo upload, nearby loads.
- [ ] Claim a business → approve in admin → verified badge shows.
- [ ] Settings → Notifications: enable push, toggle a category, send test push.
- [ ] Admin panel: place approvals + business claims pages load and act.
- [ ] (If PostGIS) `EXPLAIN` a nearby/in-polygon query uses the GiST index.

## 5. Background jobs

- [ ] Place auto-approval + festival maintenance scheduler running (every 15 min,
      started in `server.js`). No auto-approval work happens on read paths.
