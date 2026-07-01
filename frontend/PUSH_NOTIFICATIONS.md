# Notifications — scope & native push (UMNAAPP)

## Current behavior (UNCHANGED)

UMNAAPP uses **Web Push (VAPID)** for the web app and PWA. This implementation is
**intentionally left completely unchanged** by the cross-platform packaging work:

- Frontend: `src/hooks/usePushNotifications.js`, `src/hooks/useNotifications.js`,
  the service worker (`src/sw.js`) push handlers.
- Backend: `web-push` + VAPID keys in `backend/.env`
  (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`).

**No Firebase, FCM, or any alternative native push service is introduced.**

## What works where

| Target            | Notifications |
| ----------------- | ------------- |
| Web browser       | Web Push (VAPID) — unchanged |
| Installed PWA     | Web Push (VAPID) — unchanged |
| Android (Capacitor WebView) | Web Push is **not** delivered when the app is closed. In-app, in-page notifications still work while the WebView is alive. |
| Windows (Electron)| Web Push is not used; in-app notifications work while the app runs. |

The Android app declares `POST_NOTIFICATIONS` (Android 13+) so that a future
local/native notification layer can prompt for permission, but **no native push
transport is wired up**.

## If native Android push is required later (OUT OF SCOPE)

Delivering push to a **closed** Android app requires a native push transport.
This is a separate effort and was explicitly excluded from the packaging task
(no Firebase/FCM allowed here). Options to evaluate at that time:

1. **A non-Firebase native push provider** (e.g. a self-hosted or third-party
   service the project approves) with a Capacitor plugin, plus a new backend
   endpoint to register device tokens and send messages. This is additive and
   must not replace the existing Web Push/VAPID code.
2. **`@capacitor/local-notifications`** for locally-scheduled notifications only
   (no server-initiated delivery).

Any of these requires:
- A new device-token registration API on the backend (do **not** modify the
  existing Web Push routes).
- A native plugin added to `frontend/android`.
- Permission UX using the already-declared `POST_NOTIFICATIONS` permission.

Until then, native push is **not** implemented by design.
