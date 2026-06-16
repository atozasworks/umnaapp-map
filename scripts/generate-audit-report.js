import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '../docs/umnaapp-maps-audit-report.html')

const features = [
  {
    name: 'Authentication (Login/Register)',
    status: 'partial',
    files: 'LoginPage.jsx, RegisterPage.jsx, OTPVerificationPage.jsx, AuthContext.jsx, authRoutes.js, authController.js, passport.js, atozasAuth.js',
    apis: 'POST /auth/register, /auth/login, /auth/verify-otp, GET /auth/me, GET /auth/google, POST /api/email/send-otp',
    db: 'User, Session, OTPVerification',
    issues: 'Dual auth stacks (custom + unused Auth Kit); logout never revokes server sessions; OTP resend bug on register; plain-text vs bcrypt OTP mismatch; password collected but no password login; isAuthenticated = !!token.',
    fixes: 'Pick one auth stack; call POST /auth/logout; unify OTP hashing; fix register resend to include name.',
  },
  {
    name: 'Place Search',
    status: 'partial',
    files: 'SearchBar.jsx, parseSearchQuery.js, externalPlaceSearch.js, mapRoutes.js',
    apis: 'GET /map/search-simple (live), GET /map/search (dead legacy)',
    db: 'Place',
    issues: 'Dead /search path; auto-approve scan on every search; userPlaces prop is actually favorites; no full-text index.',
    fixes: 'Remove /search; move auto-approve to scheduler only; rename prop; location-bias external search.',
  },
  {
    name: 'Place Details',
    status: 'implemented',
    files: 'PlaceDetailPanel.jsx, googlePlaceDetails.js, placeDisplay.js, mapRoutes.js',
    apis: 'GET /map/places/:id, /:id/nearby, /:id/history',
    db: 'Place, PlaceAudit',
    issues: 'No approval-status UX; Add a label not persisted; Claim business is placeholder.',
    fixes: 'Show pending/rejected badge; wire or remove label/claim UI.',
  },
  {
    name: 'Add / Edit / Delete Place',
    status: 'broken',
    files: 'AddPlaceModal.jsx, MapContextMenu.jsx, DuplicatePlaceModal.jsx, placePayload.js, mapRoutes.js',
    apis: 'POST /map/places, DELETE /map/places/:id — MISSING PATCH /map/places/:id',
    db: 'Place, PlaceAudit',
    issues: 'Edit opens AddPlaceModal but always POSTs — creates duplicate or 409. No user update endpoint.',
    fixes: 'Add PATCH /map/places/:id with owner check + audit; branch modal to PATCH when editing.',
  },
  {
    name: 'Place Approval Workflow',
    status: 'implemented',
    files: 'placeApproval.js, server.js, admin/PendingPlaces.jsx',
    apis: 'PATCH /admin/places/:id/approve|reject, POST /admin/places/bulk-action',
    db: 'Place (approvalStatus, autoApproveAt)',
    issues: 'Pending scan loads all rows on every read; no contributor-facing status badge.',
    fixes: 'Scheduler-only updateMany; show status in PlaceDetailPanel.',
  },
  {
    name: 'Reviews & Ratings',
    status: 'partial',
    files: 'PlaceDetailPanel.jsx, mapRoutes.js',
    apis: 'GET/POST/DELETE /map/places/:id/reviews',
    db: 'PlaceReview',
    issues: 'No edit UI despite upsert support; delete errors swallowed; no pagination.',
    fixes: 'Pre-fill edit form when myReview exists; surface delete errors.',
  },
  {
    name: 'Photos Upload',
    status: 'implemented',
    files: 'PlaceDetailPanel.jsx (compressImage), mapRoutes.js',
    apis: 'GET/POST/DELETE /map/places/:id/photos',
    db: 'PlacePhoto',
    issues: 'Base64 stored inline in Postgres; list returns all blobs; no server MIME validation.',
    fixes: 'Object storage + URLs; paginate list; validate base64 prefix server-side.',
  },
  {
    name: 'Favorites',
    status: 'implemented',
    files: 'mapRoutes.js, HomePage.jsx, migrate-favorites.js',
    apis: 'GET/POST/DELETE /map/favorites',
    db: 'Favorite',
    issues: '503 until migration; Saved vs Contributions naming confusion.',
    fixes: 'Run add-favorites.sql migration; clarify UI copy.',
  },
  {
    name: 'Category Filters',
    status: 'partial',
    files: 'HomePage.jsx, MapComponent.jsx, googlePlaceCategory.js',
    apis: 'GET /map/places?categories= (unused by frontend)',
    db: 'Place.category',
    issues: 'Client-side filter of 5000 rows; PLACE_CATEGORIES duplicated in 4+ files.',
    fixes: 'Pass selectedCategories to server; centralize category constants.',
  },
  {
    name: 'Notifications',
    status: 'partial',
    files: 'NotificationBell.jsx, NotificationsPage.jsx, useNotifications.js, notificationService.js',
    apis: 'GET/PATCH/DELETE /notifications, POST /notifications/push/subscribe',
    db: 'Notification, PushSubscription',
    issues: 'usePushNotifications never imported — no subscribe UI; VAPID vars undocumented; place_added broadcasts to all users.',
    fixes: 'Add push toggle in Settings; document VAPID in env.example; scope broadcasts.',
  },
  {
    name: 'PWA Support',
    status: 'partial',
    files: 'sw.js, PwaShell.jsx, pwaInstallManager.js, usePwaInstall.js, vite.config.js',
    apis: 'Service worker + manifest (no backend)',
    db: 'None',
    issues: '/api/ cached in SW may store auth JSON; install prompt only on landing page.',
    fixes: 'Exclude auth API from SW cache; add install prompt post-login.',
  },
  {
    name: 'Directions',
    status: 'implemented',
    files: 'RoutePanel.jsx, routeHelpers.js, MapComponent.jsx, mapRoutes.js',
    apis: 'GET /map/route (OSRM/umnaapp cascade, not Google)',
    db: 'Route (optional save)',
    issues: 'Public OSRM demo as prod fallback; fallback routes have empty steps.',
    fixes: 'Gate public OSRM to dev only; surface fallback in UI.',
  },
  {
    name: 'Alternative Routes',
    status: 'implemented',
    files: 'RoutePanel.jsx, routeHelpers.js (FE+BE)',
    apis: 'GET /map/route?alternatives=true',
    db: 'None',
    issues: 'Disabled when waypoints present (by design).',
    fixes: 'Optional: request alternatives per leg.',
  },
  {
    name: 'Voice Navigation',
    status: 'partial',
    files: 'useVoiceNavigation.js, speech.js, navInstructions.js, NavigationView.jsx',
    apis: 'Uses route geometry from /map/route',
    db: 'None',
    issues: 'Instruction text English-only; onArrive never wired; reroute drops waypoints.',
    fixes: 'i18n maneuver text; wire onArrive; preserve waypoints on reroute.',
  },
  {
    name: 'Location Sharing',
    status: 'partial',
    files: 'HomePage.jsx (shareLocationAt), server.js (vehicle sockets)',
    apis: 'Static deep links; socket vehicle:location (fleet only)',
    db: 'Vehicle, Location',
    issues: 'Only static URL share — no peer-to-peer live sharing. Location.userId unused.',
    fixes: 'Rename menu to Share map link or build consented live-share session.',
  },
  {
    name: 'Ask Maps / PlaceFinder',
    status: 'implemented',
    files: 'AskMapsPanel.jsx, groqAskMapsService.js, askMapsConstants.js, mapRoutes.js',
    apis: 'POST /map/ask (auth) + Groq intent parsing',
    db: 'Place',
    issues: 'Degrades without GROQ_API_KEY; external OSM hits lack full detail; login required.',
    fixes: 'Document GROQ_API_KEY; lightweight external detail view.',
  },
  {
    name: 'Place Extraction',
    status: 'implemented',
    files: 'PlaceExtractPanel.jsx, gridExtractLimit.js, mapRoutes.js',
    apis: 'POST /map/places/bulk, /grid-extract/consume|release, GET /map/config',
    db: 'User.lastGridExtractAt, Place.extractedAt',
    issues: 'Requires GOOGLE_MAPS_API_KEY; daily quota consumed at run start; heavy Google cost.',
    fixes: 'Consume quota after first success; monitor billing.',
  },
  {
    name: 'Polygon & Area Search',
    status: 'implemented',
    files: 'PolygonExplorePanel.jsx, polygonGeo.js, mapRoutes.js',
    apis: 'POST /map/places/in-polygon',
    db: 'Place',
    issues: 'backend/utils/geo.js unused; take:2500 may miss places in large polygons.',
    fixes: 'Consolidate geo helpers; use PostGIS ST_Contains.',
  },
  {
    name: 'Measure Distance',
    status: 'implemented',
    files: 'MeasureDistancePanel.jsx, measureDistance.js, MapComponent.jsx',
    apis: 'Client-side only (no backend)',
    db: 'None',
    issues: 'Geodesic only, not road distance; no undo-last-point.',
    fixes: 'Low priority: unit toggle, undo vertex.',
  },
  {
    name: 'Admin Panel',
    status: 'partial',
    files: 'admin/src/*, adminRoutes.js, adminAuth.js',
    apis: 'GET /admin/overview, /places/pending, PATCH approve/reject, /records/:model',
    db: 'Place, PlaceAudit, User, etc.',
    issues: 'MODEL_META missing itinerary/favorite/notification; weak default ADMIN_SECRET; secret in localStorage.',
    fixes: 'Extend MODEL_META; enforce strong secret; consider httpOnly cookie.',
  },
  {
    name: 'User Contributions',
    status: 'partial',
    files: 'HomePage.jsx (contributions panel), PlaceDetailPanel.jsx',
    apis: 'GET /map/places (client filter), reviews/photos per place',
    db: 'Place, PlaceReview, PlacePhoto, Favorite',
    issues: 'Places list yes; no aggregate reviews/photos view; Recents menu stubbed.',
    fixes: 'Add GET /map/my-contributions or tabs in panel.',
  },
  {
    name: 'Public Profiles',
    status: 'missing',
    files: 'None — no /users/:id route or page',
    apis: 'None',
    db: 'User (no public slug)',
    issues: 'No route, page, or API to view another user profile or activity.',
    fixes: 'Add GET /api/users/:id/public + /users/:id route.',
  },
  {
    name: 'Audit Log / History',
    status: 'partial',
    files: 'placeAudit.js, PlaceHistoryTab.jsx, adminRoutes.js',
    apis: 'GET /map/places/:id/history, POST /admin/places/:id/restore/:auditId',
    db: 'PlaceAudit',
    issues: 'updated audits only from admin; requires auth despite public record label; restore admin-only.',
    fixes: 'Add user-edit audit; reconcile public wording.',
  },
  {
    name: 'Group Itineraries',
    status: 'implemented',
    files: 'GroupItinerariesPanel.jsx, ItineraryDetailPanel.jsx, itineraryRoutes.js, itineraryService.js',
    apis: 'CRUD /itineraries/*, share token join, socket itinerary:update',
    db: 'Itinerary, ItineraryMember, ItineraryStop, ItineraryComment, ItineraryVote',
    issues: '503 until add-itineraries.sql migration; share link grants editor by default.',
    fixes: 'Run migration; consider viewer as default link-join role.',
  },
  {
    name: 'Chatbot (Map Assistant)',
    status: 'partial',
    files: 'MapAssistantChatbot.jsx, mapAssistantService.js (UNTRACKED in git), mapRoutes.js',
    apis: 'POST /map/assistant (public, 30/min) + Groq',
    db: 'None',
    issues: 'Files uncommitted — deploy risk; unauthenticated Groq endpoint (cost/abuse).',
    fixes: 'Commit files; add auth or stricter rate limits.',
  },
]

const statusMeta = {
  implemented: { label: 'Implemented', cls: 's-ok', icon: '✅' },
  partial: { label: 'Partial', cls: 's-warn', icon: '⚠️' },
  missing: { label: 'Missing', cls: 's-bad', icon: '❌' },
  broken: { label: 'Broken', cls: 's-crit', icon: '🛑' },
}

const counts = features.reduce(
  (a, f) => {
    a[f.status] = (a[f.status] || 0) + 1
    return a
  },
  { implemented: 0, partial: 0, missing: 0, broken: 0 }
)

const featureRows = features
  .map((f) => {
    const s = statusMeta[f.status]
    return `<tr>
      <td><strong>${f.name}</strong></td>
      <td><span class="badge ${s.cls}">${s.icon} ${s.label}</span></td>
      <td class="mono small">${f.files}</td>
      <td class="mono small">${f.apis}</td>
      <td class="mono small">${f.db}</td>
      <td>${f.issues}</td>
      <td>${f.fixes}</td>
    </tr>`
  })
  .join('\n')

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UmnaApp Maps — Project Health Audit Report</title>
  <style>
    :root {
      --bg: #f8fafc;
      --surface: #ffffff;
      --border: #e2e8f0;
      --text: #0f172a;
      --text-2: #475569;
      --text-3: #94a3b8;
      --accent: #0284c7;
      --ok: #047857;
      --ok-bg: #ecfdf5;
      --warn: #b45309;
      --warn-bg: #fef3c7;
      --bad: #64748b;
      --bad-bg: #f1f5f9;
      --crit: #b91c1c;
      --crit-bg: #fef2f2;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: ui-sans-serif, system-ui, "Segoe UI", Roboto, "Noto Sans Kannada", sans-serif; background: var(--bg); color: var(--text); line-height: 1.55; font-size: 14px; }
    .wrap { max-width: 1280px; margin: 0 auto; padding: 32px 20px 64px; }
    h1 { font-size: 28px; margin: 0 0 6px; letter-spacing: -0.02em; }
    h2 { font-size: 20px; margin: 32px 0 12px; border-bottom: 2px solid var(--border); padding-bottom: 8px; }
    h3 { font-size: 16px; margin: 20px 0 8px; }
    .sub { color: var(--text-2); margin-bottom: 24px; }
    .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin: 24px 0; }
    @media (max-width: 900px) { .stats { grid-template-columns: repeat(2, 1fr); } }
    .stat { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; text-align: center; }
    .stat .v { font-size: 28px; font-weight: 700; }
    .stat .l { font-size: 12px; color: var(--text-2); margin-top: 4px; }
    .stat.ok .v { color: var(--ok); }
    .stat.warn .v { color: var(--warn); }
    .stat.bad .v { color: var(--bad); }
    .stat.crit .v { color: var(--crit); }
    .callout { border: 1px solid #bae6fd; background: #f0f9ff; border-radius: 10px; padding: 16px; margin: 20px 0; }
    .callout.crit { border-color: #fecaca; background: var(--crit-bg); }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    @media (max-width: 800px) { .grid-2 { grid-template-columns: 1fr; } }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 16px; }
    .card h3 { margin-top: 0; }
    ul { margin: 8px 0; padding-left: 20px; }
    li { margin: 4px 0; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 10px; background: var(--surface); margin: 16px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th, td { padding: 10px 12px; text-align: left; vertical-align: top; border-bottom: 1px solid var(--border); }
    th { background: #f1f5f9; font-weight: 600; position: sticky; top: 0; z-index: 1; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #fafbfc; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 600; white-space: nowrap; }
    .s-ok { background: var(--ok-bg); color: var(--ok); }
    .s-warn { background: var(--warn-bg); color: var(--warn); }
    .s-bad { background: var(--bad-bg); color: var(--bad); }
    .s-crit { background: var(--crit-bg); color: var(--crit); }
    .mono { font-family: ui-monospace, Consolas, monospace; font-size: 11px; word-break: break-word; }
    .small { font-size: 12px; }
    .muted { color: var(--text-3); font-size: 12px; }
    .toc a { color: var(--accent); text-decoration: none; }
    .toc a:hover { text-decoration: underline; }
    .footer { margin-top: 48px; padding-top: 16px; border-top: 1px solid var(--border); color: var(--text-3); font-size: 12px; }
    @media print { .wrap { max-width: none; } th { position: static; } }
  </style>
</head>
<body>
  <div class="wrap">
    <h1>UmnaApp Maps — Project Health Audit Report</h1>
    <p class="sub">Complete implementation audit · Generated ${new Date().toISOString().slice(0, 10)} · Stack: React+Vite frontend · Express+Prisma+Postgres backend · Admin panel</p>

    <div class="stats">
      <div class="stat ok"><div class="v">${counts.implemented}</div><div class="l">✅ Implemented</div></div>
      <div class="stat warn"><div class="v">${counts.partial}</div><div class="l">⚠️ Partial</div></div>
      <div class="stat bad"><div class="v">${counts.missing}</div><div class="l">❌ Missing</div></div>
      <div class="stat crit"><div class="v">${counts.broken}</div><div class="l">🛑 Broken</div></div>
      <div class="stat"><div class="v">~7/10</div><div class="l">Overall Health</div></div>
    </div>

    <div class="callout crit">
      <strong>Top priority:</strong> Edit Place is broken (no PATCH endpoint). Chatbot files are untracked in git. Auto-approve scan runs on every search. Category filter loads 5000 places client-side.
    </div>

    <nav class="toc card">
      <h3>Contents</h3>
      <ul>
        <li><a href="#summary">Executive Summary</a></li>
        <li><a href="#features">Core Features (26)</a></li>
        <li><a href="#issues">Cross-Cutting Issues</a></li>
        <li><a href="#roadmap">Fix Roadmap</a></li>
      </ul>
    </nav>

    <h2 id="summary">Executive Summary</h2>
    <div class="grid-2">
      <div class="card">
        <h3>Strengths</h3>
        <ul>
          <li>Rich feature set: maps, places, routing, extraction, itineraries, Ask Maps, admin</li>
          <li>Solid Prisma schema with audit trail, favorites, reviews, notifications</li>
          <li>Place approval workflow with auto-approve scheduler</li>
          <li>Real-time via Socket.io (notifications, itineraries, vehicle tracking)</li>
          <li>PWA shell, i18n, festival overlays, polygon explore</li>
        </ul>
      </div>
      <div class="card">
        <h3>Critical Gaps</h3>
        <ul>
          <li><strong>Edit Place broken</strong> — UI POSTs, no update API</li>
          <li><strong>Untracked chatbot files</strong> — deploy will miss Map Assistant</li>
          <li>Logout doesn't revoke sessions; weak ADMIN_SECRET default</li>
          <li>Migration-gated features (503 until SQL scripts run)</li>
          <li>Performance: auto-approve on hot paths, 5000-place client filter</li>
        </ul>
      </div>
    </div>

    <h2 id="features">Core Features — Detailed Audit</h2>
    <p class="muted">Scroll horizontally on mobile for full table.</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Status</th>
            <th>Files</th>
            <th>APIs</th>
            <th>Database</th>
            <th>Issues Found</th>
            <th>Recommended Fixes</th>
          </tr>
        </thead>
        <tbody>
          ${featureRows}
        </tbody>
      </table>
    </div>

    <h2 id="issues">Cross-Cutting Issues</h2>
    <div class="grid-2">
      <div class="card">
        <h3>UI/UX</h3>
        <ul>
          <li>Recents menu disabled/stubbed</li>
          <li>Add a label — local state only</li>
          <li>Claim business — placeholder toast</li>
          <li>No approval badge for contributors</li>
          <li>Reviews: no edit UI</li>
          <li>Voice nav English-only</li>
        </ul>
      </div>
      <div class="card">
        <h3>API</h3>
        <ul>
          <li>Missing PATCH /map/places/:id</li>
          <li>POST /auth/logout never called</li>
          <li>Dual OTP storage (plain vs bcrypt)</li>
          <li>Legacy GET /map/search dead</li>
          <li>Server ?categories= unused</li>
        </ul>
      </div>
      <div class="card">
        <h3>Database</h3>
        <ul>
          <li>Migrations required: notifications, favorites, reviews, itineraries, audit, festival</li>
          <li>Admin MODEL_META incomplete</li>
          <li>Photos as base64 in Postgres</li>
          <li>PostGIS point column unused</li>
        </ul>
      </div>
      <div class="card">
        <h3>Performance & Mobile</h3>
        <ul>
          <li>Auto-approve scan on every search/list</li>
          <li>5000 places client-side category filter</li>
          <li>Full-table duplicate scan on bulk</li>
          <li>Fixed-width panels on narrow screens</li>
          <li>PWA install prompt only on landing</li>
        </ul>
      </div>
    </div>

    <h2 id="roadmap">Prioritized Fix Roadmap</h2>
    <div class="card">
      <h3>P0 — Broken / Deploy-blocking</h3>
      <ol>
        <li>Implement PATCH /api/map/places/:id + wire AddPlaceModal edit branch</li>
        <li>Commit untracked chatbot files (MapAssistantChatbot.jsx, mapAssistantService.js, mapRoutes.js)</li>
        <li>Document & run all SQL migrations + env vars (VAPID, GROQ, GOOGLE_MAPS_API_KEY)</li>
      </ol>
      <h3>P1 — Performance & Correctness</h3>
      <ol>
        <li>Move auto-approve to scheduler-only updateMany</li>
        <li>Server-side category filtering</li>
        <li>Targeted duplicate queries instead of full-table scan</li>
        <li>Paginate photos; object storage for uploads</li>
      </ol>
      <h3>P2 — Security</h3>
      <ol>
        <li>Call /auth/logout; revoke sessions</li>
        <li>Strong ADMIN_SECRET; httpOnly cookie for admin</li>
        <li>Exclude auth /api/ from service worker cache</li>
        <li>Protect public /map/assistant endpoint</li>
      </ol>
      <h3>P3 — UX</h3>
      <ol>
        <li>Review edit UI; approval status badge</li>
        <li>i18n for voice navigation</li>
        <li>Public profiles or remove name links</li>
        <li>My Contributions aggregate view</li>
      </ol>
    </div>

    <div class="footer">
      UmnaApp Maps Audit Report · Project: maptest · Audited: backend/, frontend/, admin/ · ${features.length} core features reviewed
    </div>
  </div>
</body>
</html>`

fs.writeFileSync(outPath, html, 'utf8')
console.log('Written:', outPath)
console.log('Size:', fs.statSync(outPath).size, 'bytes')
