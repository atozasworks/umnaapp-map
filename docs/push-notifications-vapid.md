# Push Notifications & VAPID Setup

UmnaApp Maps delivers notifications two ways:

1. **In-app / real-time** via Socket.IO (`notification:new`, `notification:unread-count`) — always on when the user is connected.
2. **Web Push** (background, even when the app is closed) via the [Web Push Protocol](https://datatracker.ietf.org/doc/html/rfc8030) using **VAPID** keys.

Web Push is **optional**. If VAPID keys are not configured, the app runs normally and silently skips push delivery (in-app notifications still work).

---

## 1. What is VAPID?

VAPID (Voluntary Application Server Identification) is how your server proves to a browser's push service (FCM, Mozilla, etc.) that it is the legitimate sender. It is an **ECDSA P-256 key pair**:

- **Public key** — shipped to the browser; used when creating a `PushSubscription`.
- **Private key** — kept secret on the server; used to sign each push request.
- **Subject** — a `mailto:` or `https:` contact URL so push services can reach you.

---

## 2. Generate keys (one time)

```bash
node backend/scripts/generate-vapid-keys.js
```

Output:

```
VAPID_PUBLIC_KEY=BJ...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:your-email@example.com
```

Add these three lines to `backend/.env` (see `backend/env.example.txt`). **Never commit the private key.** Restart the backend so the keys load.

> Keys are environment-specific. Use **different** keys for staging and production, and never rotate them casually — rotating invalidates every existing subscription (users must re-subscribe).

---

## 3. How it works end to end

```
Browser                         Backend                         Push service
───────                         ───────                         ────────────
GET /push/vapid-public-key  ──▶  returns { publicKey, enabled }
requestPermission() (granted)
pushManager.subscribe(pubKey)
POST /push/subscribe        ──▶  upsert PushSubscription row
                                 (endpoint, p256dh, auth, userAgent)

… later, an event occurs …
                                 createUserNotification(userId,…)
                                   • check NotificationPreference
                                   • save Notification row
                                   • socket emit (in-app)
                                   • webpush.sendNotification ──▶  delivers to device
                                                                   ▼
                                                            Service Worker
                                                            'push' event → showNotification
```

Relevant code:

| Concern | File |
| --- | --- |
| Key config + delivery | `backend/services/notificationService.js` |
| Subscribe / unsubscribe / test / preferences | `backend/routes/notificationRoutes.js` |
| Browser subscription | `frontend/src/hooks/usePushNotifications.js` |
| Settings UI | `frontend/src/components/NotificationSettings.jsx` |
| Service worker `push` handler | `frontend/src/sw.js` |

---

## 4. API reference

All endpoints require auth (`Authorization: Bearer <jwt>`) and are under `/api/notifications`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/push/vapid-public-key` | `{ publicKey, enabled }` — `enabled:false` means push isn't configured server-side. |
| `POST` | `/push/subscribe` | Body `{ endpoint, keys:{ p256dh, auth } }`. Upserts by endpoint. |
| `DELETE` | `/push/unsubscribe` | Body `{ endpoint }` (optional — omit to remove **all** of the user's subscriptions). |
| `POST` | `/push/test` | Sends a test notification to the current user. |
| `GET` | `/preferences` | `{ preferences, defaulted }` — per-category prefs. |
| `PUT` | `/preferences` | Body any of `{ pushEnabled, placeApproved, placeAdded, festival, businessClaim }` (booleans). |

Stale subscriptions are auto-pruned: a `404`/`410` from the push service deletes that `PushSubscription` row.

---

## 5. Notification preferences (targeted, not broadcast)

Each user has an optional `NotificationPreference` row (a missing row = everything on). It gates delivery:

| Preference | Gates notification type | Notes |
| --- | --- | --- |
| `pushEnabled` | (master) | Off ⇒ in-app only, no web-push. |
| `placeApproved` | `place_approved` | Your place was approved. |
| `placeAdded` | `place_added` | A new community place was added. |
| `festival` | `festival_today` | A festival near you is happening. |
| `businessClaim` | `business_claim_approved` / `_rejected` | Updates on your ownership claims. |

`place_submitted` (a direct response to **your own** action) is always delivered and cannot be muted.

**Targeted delivery:** community-wide events (new place, festival) no longer blast *every* user. `recipientsForCategory()` selects only users who haven't muted that category, and `createUserNotification()` re-checks the preference per user before creating/sending. This converts the old broadcast-to-all behaviour into opt-in, targeted notifications.

---

## 6. Migration

Apply the preferences table before relying on category controls:

```bash
psql "$DATABASE_URL" -f backend/prisma/add-notification-preferences.sql
npx prisma generate   # in backend/
# restart backend
```

The `PushSubscription` table is from the earlier `add-notifications.sql` migration. All code paths degrade gracefully (HTTP 503 with a hint) if a model isn't migrated yet.

---

## 7. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| `enabled:false` from vapid-public-key | `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` not set or server not restarted. |
| Subscribe fails with permission error | Browser permission denied; user must re-allow in site settings. |
| Push never arrives but in-app works | `pushEnabled` is off, no `PushSubscription` row, or VAPID keys differ from the ones used at subscribe time. |
| `403 / 410` in server logs | Subscription expired/invalid — it is auto-deleted; user must re-subscribe. |
| iOS not receiving push | iOS only supports Web Push for **installed PWAs** (Add to Home Screen) on iOS 16.4+. |
