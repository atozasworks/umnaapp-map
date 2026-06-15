# Production Readiness Report — UmnaApp Maps

**Scope:** Audit-fix & feature-completion work, Phases 1–9 (Phase 10 "API
platform" deferred by request). Architecture preserved throughout: React + Vite
frontend, Express backend, Prisma + PostgreSQL, admin panel, Socket.IO, existing
API contracts and UI design system.

**Health:** 7/10 → **~9.5/10**. The remaining 0.5 is the deferred public API
platform (Phase 10) and automated test coverage (currently manual QA).

---

## What changed, by phase

| Phase | Outcome |
| --- | --- |
| 1 — Place editing | `PATCH /map/places/:id` with owner/admin auth, partial update, duplicate detection, audit diff, approval support. Frontend detects edit mode (PATCH, prefilled). **Fixes duplicate-on-edit bug.** |
| 2 — Chatbot | Stabilized; `optionalAuth` + tiered rate limits + daily caps; GROQ-key-optional FAQ fallback; location context. |
| 3 — Performance | Server-side category + bbox filtering w/ pagination; auto-approval moved to a 15-min scheduler (off read paths); duplicate detection scoped to a bounding box. |
| 4 — Auth | bcrypt-hashed OTP (+ legacy fallback), resend-OTP endpoint, server-side logout/session revoke, tighter verify limit. |
| 5 — Security | `ADMIN_SECRET` strength enforced at boot; rate limits on assistant/search/auth/notifications; service worker `NetworkOnly` for auth/admin/user. |
| 6 — Profiles | `/users/:id/public` + `/my-contributions` with stats, badges, privacy toggle (`profilePublic`). |
| 7 — UX | Review edit/delete; approval badges; voice nav i18n (en/kn/hi/tu); **Claim Business** workflow (model + user flow + admin approve/reject + verified badge); persisted personal **labels**. |
| 8 — Notifications | Per-user category preferences + master push switch; broadcasts converted to **targeted, opt-in**; settings UI; VAPID documentation. |
| 9 — Database | PostGIS `geom` (GiST) with sync trigger; `ST_DWithin` nearby + `ST_Contains` polygon (with fallback); composite + trigram indexes. |

---

## New / changed surface area

- **DB models:** `BusinessClaim`, `PlaceLabel`, `NotificationPreference`; new
  `Place` columns `claimedById`, `claimVerifiedAt`, `geom`; `User.profilePublic`.
- **Migrations (idempotent):** `add-user-profile-public.sql`,
  `add-phase7-claims-labels.sql`, `add-notification-preferences.sql`,
  `add-postgis-place-geom.sql`.
- **Docs:** `api-reference.md`, `push-notifications-vapid.md`,
  `deployment-checklist.md`, `testing-checklist.md`, this report.

---

## Backward compatibility & risk

- Every new model is **guarded**: missing migration ⇒ `503` with a hint, never a
  crash. Existing endpoints are unchanged.
- PostGIS is **optional**: if the extension isn't available, spatial endpoints
  fall back to the prior bbox/JS behavior automatically.
- OTP verification keeps a **plaintext fallback** for any pre-existing unhashed
  rows during transition.
- No breaking changes to existing API response shapes; additions are additive.

**Action required before new features are live:** apply the four new migrations
and run `npx prisma generate`, then restart the backend (see
`deployment-checklist.md`). Until then, those endpoints degrade gracefully.

---

## Known limitations / follow-ups

- **Admin auth** still uses a bearer secret in `localStorage` (httpOnly-cookie
  migration intentionally deferred to avoid breaking the admin app mid-audit).
- **Phase 10 (API platform):** API keys, developer dashboard, usage analytics,
  SDK, public `/geocode` etc. — not started (deferred by request).
- **Automated tests:** none added; QA is the manual `testing-checklist.md`.
  Recommend adding integration tests around place edit, claims, and spatial
  fallback next.
- **Tulu TTS:** no native voice exists; Tulu prompts are read by the Kannada
  voice (shared script). Text is localized.

---

## Recommended go-live order

1. Apply migrations + `prisma generate` on a staging DB; run the smoke checks.
2. Verify `ADMIN_SECRET` strength and VAPID keys.
3. Deploy backend, then frontend/admin builds behind HTTPS.
4. Run the Phase-by-phase `testing-checklist.md`.
5. Confirm the 15-minute scheduler and push delivery in production logs.
