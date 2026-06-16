# Testing Checklist — UmnaApp Maps

Manual QA grouped by phase. Mark each before release.

## Phase 1 — Place editing
- [ ] Edit own place → submits `PATCH /map/places/:id` (not POST); **no duplicate** created.
- [ ] Editing prefills existing values; success/error toasts shown.
- [ ] Non-owner cannot see the Edit action; admin can edit any place.
- [ ] After edit, History tab shows an `updated` audit entry with old→new diff.

## Phase 2 — Chatbot
- [ ] Works logged-out (anon rate limit) and logged-in (higher limit).
- [ ] With `GROQ_API_KEY` unset, replies via FAQ fallback; header shows "Offline FAQ mode".
- [ ] Location-aware: passing map center changes contextual answers.
- [ ] Exceeding the per-minute / per-day cap returns a friendly rate-limit message.

## Phase 3 — Performance
- [ ] Category filtering happens server-side (`?categories=`), not by loading all places.
- [ ] `GET /map/places` honors `limit`/`offset` + bbox params.
- [ ] No auto-approval queries fire during search / place detail / routes.
- [ ] Bulk import duplicate check stays fast on a clustered region.

## Phase 4 — Auth
- [ ] OTP rows are bcrypt hashes in DB (not plaintext).
- [ ] Resend OTP works without re-entering name/password.
- [ ] Logout revokes the server session (subsequent calls with old token fail).
- [ ] Brute-forcing OTP trips the `12/min` verify limit.

## Phase 5 — Security
- [ ] Server refuses to boot with `ADMIN_SECRET=admin` / `123456` / `default` / <16 chars.
- [ ] Unset `ADMIN_SECRET` → admin API disabled (logged), app still serves users.
- [ ] Rate limits enforced on `/map/assistant`, `/map/search`, `/auth/*`, `/notifications/*`.
- [ ] Service worker never caches `/api/auth`, `/api/admin`, `/api/user` responses.

## Phase 6 — Profiles & contributions
- [ ] `/my-contributions` tabs (Places / Pending / Reviews / Photos / Favorites) + stats + badges.
- [ ] `/users/:id` public profile renders; respects the privacy toggle (private → hidden).
- [ ] Settings → public-profile toggle persists and reflects on the profile.
- [ ] Contributor name in place detail links to the public profile.

## Phase 7 — UX
- [ ] Review: edit own review (rating + comment update), delete; UI reflects changes.
- [ ] Approval status badge shows for owner/admin in place detail (pending/rejected).
- [ ] Voice nav speaks in English, Kannada, Hindi; Tulu uses Kannada voice/script.
- [ ] Add Label: save / edit / remove; persists across reloads (per user).
- [ ] Claim Business: submit claim → pending badge; admin approve → verified badge; reject → can re-submit.

## Phase 8 — Notifications
- [ ] Enable push (permission prompt → subscription stored) and receive a test push.
- [ ] Disable push → no web push, in-app still works.
- [ ] Mute a category → no new notifications of that type (in-app or push).
- [ ] Community/festival notifications reach only opted-in users (not everyone).

## Phase 9 — Spatial
- [ ] With PostGIS: nearby returns true-radius, distance-ordered results.
- [ ] With PostGIS: in-polygon (lasso) returns correct points via `ST_Contains`.
- [ ] Without PostGIS (extension absent): both endpoints still return correct results (fallback).

## Regression sweep
- [ ] Directions / alternative routes / voice navigation still work.
- [ ] Favorites save/unsave; festivals overlay; extraction; itineraries.
- [ ] PWA install + offline shell.
- [ ] Admin: schema, data browser, place approvals, extracted places.
