# UmnaApp Maps — API Reference (Audit Fix Additions)

Base URL: `/api`. Auth is JWT via `Authorization: Bearer <token>` unless noted.
This document covers endpoints **added or changed** during the audit-fix work
(Phases 1–9). Existing endpoints keep their original contracts.

> Backward compatibility: every new model is guarded server-side. If a migration
> hasn't been applied, the related endpoint returns `503` with a hint instead of
> crashing; all pre-existing endpoints keep working.

---

## Auth (`/api/auth`)

| Method | Path | Notes |
| --- | --- | --- |
| `POST` | `/auth/register` | OTP now stored **bcrypt-hashed**. |
| `POST` | `/auth/verify-otp` | Verifies hashed OTP (+ tighter rate limit `12/min`). |
| `POST` | `/auth/resend-otp` | **New.** Body `{ email, type? }`. Resends OTP without name/password. |
| `POST` | `/auth/logout` | Revokes server session/JWT (called by frontend on logout). |
| `GET`  | `/auth/me` | Now includes `profilePublic`. |
| `PUT`  | `/auth/profile` | Accepts `profilePublic` (boolean) in addition to existing fields. |

Whole `/api/auth` mount is rate-limited (`40/min`).

---

## Places (`/api/map`)

### Edit a place — **New**
`PATCH /api/map/places/:id`

- Owner or place-delete admin only.
- Partial update (only provided fields change).
- Duplicate detection (excludes the place being edited).
- Writes a `PlaceAudit` row with old→new diff.
- Admins may also change `approvalStatus`.

### List places — changed
`GET /api/map/places?categories=&limit=&offset=&minLat=&maxLat=&minLng=&maxLng=`

- Server-side category + viewport (bbox) filtering.
- Pagination metadata in response: `{ limit, offset, returned }`.

### Nearby — changed (Phase 9)
`GET /api/map/places/:id/nearby` — uses PostGIS `ST_DWithin` + nearest ordering when available; falls back to bbox.

### In-polygon — changed (Phase 9)
`POST /api/map/places/in-polygon` — body `{ polygon: GeoJSON, category? }`; uses PostGIS `ST_Contains` when available, else bbox + ray-cast.

### Reviews — edit supported
- `POST /api/map/places/:id/reviews` — upsert (create **or update**) `{ rating, comment? }`.
- `DELETE /api/map/places/:id/reviews/:reviewId` — delete own review.

### Personal labels — **New**
| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| `GET` | `/map/places/:id/label` | — | Returns the caller's label or `null`. |
| `PUT` | `/map/places/:id/label` | `{ label }` (1–60 chars) | Upserts a private per-user label. |
| `DELETE` | `/map/places/:id/label` | — | Removes the caller's label. |

### Business claims — **New**
| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| `GET` | `/map/places/:id/claim` | — | `{ claim, verified, claimedByMe }`. |
| `POST` | `/map/places/:id/claim` | `{ role?, contactPhone?, contactEmail?, message? }` | Submit / re-submit a claim (`role` ∈ owner/manager/employee/other). |

### Map assistant chatbot — changed
`POST /api/map/assistant` — `optionalAuth` + tiered rate limits (auth: 30/min, 400/day; anon: 12/min, 80/day). Accepts optional `context: { lat, lng }`. Response includes `aiEnabled` flag (false ⇒ FAQ fallback).

---

## Notifications (`/api/notifications`)

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/notifications` | List (cursor pagination). |
| `GET` | `/notifications/preferences` | **New.** `{ preferences, defaulted }`. |
| `PUT` | `/notifications/preferences` | **New.** Any of `{ pushEnabled, placeApproved, placeAdded, festival, businessClaim }`. |
| `GET` | `/notifications/push/vapid-public-key` | `{ publicKey, enabled }`. |
| `POST` | `/notifications/push/subscribe` | `{ endpoint, keys:{ p256dh, auth } }`. |
| `DELETE` | `/notifications/push/unsubscribe` | `{ endpoint? }`. |
| `POST` | `/notifications/push/test` | Sends a test push to self. |

Community/festival sends are now **targeted** (opt-in by preference), not broadcast to all users. See `docs/push-notifications-vapid.md`.

Whole `/api/notifications` mount is rate-limited (`120/min`).

---

## Users (`/api/users`) — **New (Phase 6)**

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/users/me/contributions` | Auth. Places by status, reviews, photos, favorites + stats & contribution score. |
| `GET` | `/users/:id/public` | Public profile (respects `profilePublic`): name, picture, joined date, stats, badges, recent approved contributions. |

---

## Admin (`/api/admin`) — additions

| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/admin/claims?status=pending|approved|rejected|all` | List business claims (joined place + user). |
| `POST` | `/admin/claims/:id/approve` | Approve; stamps place `claimedById`/`claimVerifiedAt`, auto-rejects competing pending claims, notifies user. |
| `POST` | `/admin/claims/:id/reject` | Reject with optional `{ note }`; notifies user. |

Admin data browser (`/admin/records/:model`) now also exposes `BusinessClaim`,
`PlaceLabel`, and `NotificationPreference`.

Admin startup hard-fails on a weak/short `ADMIN_SECRET`; if unset, the admin API
is disabled (logged) rather than left open.
