# UMNAAPP (Universal Map & Navigation Advisory App)

A modern, open-source map platform for real-time navigation, place search, and spatial data.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-atozasworks%2Fumnaapp--map-181717?logo=github)](https://github.com/atozasworks/umnaapp-map)

**Repository:** [https://github.com/atozasworks/umnaapp-map](https://github.com/atozasworks/umnaapp-map)

## Project Overview

This repository contains a modern, full-stack web platform built with React, Node.js, Socket.IO, PostgreSQL, and Docker. It is designed for real-time mapping, vehicle tracking, place search, and spatial data handling.

## Key Features

- ✅ Real-time location and vehicle tracking with `Socket.IO`
- ✅ Interactive React-based map UI with map tile support
- ✅ REST API backend with Express and Prisma
- ✅ PostgreSQL + PostGIS for spatial data and geospatial queries
- ✅ Docker Compose orchestration for local development and deployment
- ✅ Environment-based configuration and secure authentication
- ✅ Modular frontend and backend workspaces for clean separation

## Screenshots / Demo

> Replace these placeholders with your actual screenshots or demo links.

| Desktop View | Mobile / Map View |
| --- | --- |
| ![Screenshot 1](https://via.placeholder.com/600x350?text=Dashboard+Screenshot) | ![Screenshot 2](https://via.placeholder.com/600x350?text=Map+View) |

## Installation

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose
- Git

### Setup

```bash
# Clone repository
git clone https://github.com/atozasworks/umnaapp-map.git
cd umnaapp-map

# Install root dependencies
npm install

# Install frontend, admin, and backend dependencies
npm run install:all
```

### Environment

Copy environment templates and update values:

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### Start for Local Development

```bash
npm run dev
```

### Docker Compose

```bash
docker-compose up -d
```

## Usage

### Frontend

```bash
cd frontend
npm run dev
```

Open the app in your browser at `http://localhost:3000`.

### Backend

```bash
cd backend
npm run dev
```

The backend API runs at `http://localhost:5001` by default.

### Database

Run Prisma commands when schema changes:

```bash
cd backend
npx prisma generate
npx prisma migrate dev
```

## Cross-Platform Packaging (Web / Android / Windows)

The **same** React frontend (`frontend/`) ships to three targets from one codebase.
This is an **additive layer** — the web/PWA build, routes, auth, MapLibre, Socket.IO,
Web Push (VAPID), and backend are all unchanged.

| Target  | How it runs | Service Worker | API base |
| ------- | ----------- | -------------- | -------- |
| **Web / PWA** | Browser, `vite build` (`base '/'`) | ✅ enabled (injectManifest) | relative `/api` (same-origin / dev proxy) |
| **Android** | Capacitor WebView | ✅ enabled | absolute `VITE_API_URL` |
| **Windows** | Electron (`file://`) | ❌ disabled | absolute `VITE_API_URL` |

Platform detection lives in `frontend/src/platform/runtime.js`; the API/socket/tile
base resolution lives in `frontend/src/utils/apiBase.js`.

### Environment variables (`frontend/.env`)

Copy `frontend/.env.example` → `frontend/.env`. For **native builds these are required**
(native apps have no same-origin server); for **web they should stay empty** so the
original relative behavior is preserved.

| Variable | Web | Native (Android/Windows) |
| -------- | --- | ------------------------ |
| `VITE_API_URL` | leave **empty** | **required**, absolute hosted backend, e.g. `https://umnaapptst.testatozas.in` |
| `VITE_TILESERVER_URL` | optional | absolute, e.g. `https://umnaapp.in/tiles/{z}/{x}/{y}.png` |
| `VITE_GOOGLE_CLIENT_ID` | Google web client ID | same |
| `VITE_APK_URL`, `VITE_EXE_URL` | download links for the website "Install App" section | n/a |

### Android (Capacitor)

- App ID: `in.testatozas.umnaapp` · App name: `UMNAAPP` · webDir: `dist`
- Plugins: App (deep links), Geolocation, Camera, Filesystem, Network, Browser, SplashScreen
- Permissions: Internet, Location, Camera, Notifications (`POST_NOTIFICATIONS`)
- Deep links: `umnaapp://` (incl. `umnaapp://auth`) and `https://umnaapptst.testatozas.in`

**Prerequisites:** JDK 17, Android SDK / Android Studio (`ANDROID_HOME` set).

```bash
cd frontend
npm install

# One-time: create the android/ native project (already committed if present)
npm run cap:add:android

# Create a signing keystore + keystore.properties (KEEP THE PASSWORDS SAFE)
npm run keystore:generate

# Open in Android Studio (or build the signed APK + AAB)
npm run android            # build web + sync + open Android Studio
npm run build:apk          # signed APK + AAB → dist/android/app.apk, dist/android/app.aab
```

Outputs: `dist/android/app.apk` and `dist/android/app.aab`.

**Google sign-in on Android:** GIS popups don't work in a WebView, so the native flow
opens the hosted OAuth URL in the system browser and expects the JWT back via the
`umnaapp://auth?token=...` deep link (handled in `src/platform/native.js`). The hosted
backend must redirect to that deep link for native clients (or App Links must be
configured via `/.well-known/assetlinks.json` on the hosted domain). **Email OTP works
out of the box.**

**Notifications:** Web Push/VAPID is unchanged for web/PWA. Native push is intentionally
out of scope (no Firebase/FCM) — see `frontend/PUSH_NOTIFICATIONS.md`.

### Windows (Electron)

- Loads `frontend/dist` offline via `file://` with Vite `base './'` (web keeps `/`).
- System tray (minimize to tray), single-instance lock, file access over IPC,
  optional auto-update (`electron-updater`, safe no-op if unconfigured).
- Service worker disabled in the desktop shell.

```bash
cd frontend
npm run desktop            # build (electron target) + launch the desktop app
npm run build:exe          # NSIS installer → dist/windows/UmnaAppSetup.exe
```

Output: `dist/windows/UmnaAppSetup.exe`.
(Optional: add `frontend/build-resources/icon.ico` for a custom app icon.)

### "Install App" section

The landing page shows a platform-aware **Install App** section
(`frontend/src/components/InstallAppSection.jsx`): Download APK (Android browsers),
Download EXE (Windows browsers), Install PWA (everything else). It is hidden inside the
packaged Android/Windows apps.

### Build outputs summary

```text
dist/android/app.apk
dist/android/app.aab
dist/windows/UmnaAppSetup.exe
```

### Play Store guide (quick)

1. Build the AAB: `npm run build:apk` → `dist/android/app.aab`.
2. In the [Play Console](https://play.google.com/console), create the app
   `in.testatozas.umnaapp`.
3. Upload the AAB to a track (Internal testing → Production). Google re-signs with the
   App Signing key; keep your upload keystore safe.
4. Complete the store listing, content rating, data-safety form (declare Location, Camera).
5. For Google sign-in + App Links, register your SHA-256 and host
   `/.well-known/assetlinks.json` on `umnaapptst.testatozas.in`.

### Deployment notes

- **Web:** deploy `frontend/dist` (built with empty `VITE_API_URL`) as today; the backend
  continues to serve it and handle `/api`, sockets, and Web Push unchanged.
- **Native:** build with `VITE_API_URL` pointed at the hosted backend, then distribute the
  APK/AAB and `UmnaAppSetup.exe`. Optionally publish the APK/EXE behind `VITE_APK_URL` /
  `VITE_EXE_URL` so the website's Install App section can link to them.

## Tech Stack

- Frontend: `React`, `Vite`, `Tailwind CSS`
- Backend: `Node.js`, `Express`, `Socket.IO`
- Database: `PostgreSQL`, `PostGIS`, `Prisma`
- Infrastructure: `Docker`, `Docker Compose`, `Nginx`
- Mapping: `TileServer GL`, `OSRM`, `Nominatim`

## Folder Structure

```text
.
├── backend/                  # API server and backend services
│   ├── controllers/          # Route handlers and business logic
│   ├── middleware/           # Authentication, cache, rate limiting
│   ├── routes/               # Express route definitions
│   ├── prisma/               # Database schema and migrations
│   └── server.js
├── frontend/                 # React application
│   ├── src/                  # UI source code
│   ├── components/           # Reusable React components
│   ├── pages/                # Page-level components
│   └── services/             # API clients and helpers
├── nginx/                    # Reverse proxy configuration
├── docker-compose.yml        # Local orchestration configuration
├── LICENSE
├── CONTRIBUTING.md
└── .github/ISSUE_TEMPLATE/   # GitHub issue templates
```

## Contributing

We welcome contributions from the community.

- Fork the repository
- Create a new branch for your feature or fix
- Open a pull request with a clear description
- Follow the code style and existing project conventions

For details, see `CONTRIBUTING.md`.

## License

This project is licensed under the MIT License. See `LICENSE` for details.

- Test OSRM directly: `curl http://localhost:5000/route/v1/driving/...`

### Nominatim Import Issues
- Check disk space (needs 50GB+)
- Increase Docker memory
- Check Nominatim logs

## Performance

- **Caching**: Redis for API responses
- **Rate Limiting**: Per-user rate limits
- **Database Indexing**: PostGIS spatial indexes
- **Tile Caching**: Nginx tile caching

## Security

- JWT authentication for all API endpoints
- Rate limiting to prevent abuse
- CORS configuration
- Input validation
- SQL injection protection (Prisma)

## License

This project is open-source and available under the MIT License.

## Contributing

Contributions are welcome! Please read the contributing guidelines before submitting PRs.

## Support

For issues and questions:
- Check [SETUP_GUIDE.md](./SETUP_GUIDE.md)
- Review [API_EXAMPLES.md](./API_EXAMPLES.md)
- Open an issue on [GitHub](https://github.com/atozasworks/umnaapp-map/issues)

## Acknowledgments

- [UMNAAPP](https://umnaapp.in/) - Map tiles, routing, geocoding
- [OSRM](https://project-osrm.org/)
- [Nominatim](https://nominatim.org/)
- [MapLibre GL JS](https://maplibre.org/)
- [TileServer GL](https://tileserver.readthedocs.io/)
