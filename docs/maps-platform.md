# UMNAAPP Maps Platform — Developer Guide

UMNAAPP Maps turns the existing UMNAAPP application into a reusable map platform
— like OpenStreetMap or the Google Maps Platform. External projects, websites,
and mobile apps can use the same live place data **without** authentication and
**without** ever seeing the UMNAAPP login, register, landing, or home pages.

The existing UMNAAPP app (login, register, landing, home, admin, user dashboard,
private APIs) is **unchanged**. Everything below is an additive public layer on
top of the same `Place` table and the same backend.

- **Map viewer / embed:** `https://maps.umnaapp.com` or `https://<app>/embedded-map`
- **JavaScript SDK:** `https://maps.umnaapp.com/sdk.js`
- **Public REST API base:** `https://maps.umnaapp.com/api/public`
- **Realtime:** Socket.io namespace `/public-maps`

> Replace `maps.umnaapp.com` with your deployment host. The public API is also
> reachable on the main app host at `/api/public/*` and `/embedded-map`.

---

## 1. Quick start

### Embed the map with an iframe

```html
<iframe
  src="https://maps.umnaapp.com/embedded-map?lat=12.97&lng=77.59&zoom=12"
  style="width:100%;height:480px;border:0"
  allow="geolocation"
  title="UMNAAPP Maps">
</iframe>
```

### Embed the map with the SDK

```html
<div id="map" style="width:100%;height:480px"></div>
<script src="https://maps.umnaapp.com/sdk.js"></script>
<script>
  const map = UmnaMaps.embed('#map', {
    center: { lat: 12.97, lng: 77.59 },
    zoom: 12,
    categories: ['Restaurant', 'Hotel'], // optional filter
  });

  map.on('ready', () => console.log('Map ready'));
  map.on('placeClick', (place) => console.log('Clicked place', place));
  map.on('moveend', (view) => console.log('View', view));
</script>
```

### Use the data API only (no map)

```js
// With the SDK
const { results } = await UmnaMaps.api.search('coffee');

// Or plain fetch
const res = await fetch('https://maps.umnaapp.com/api/public/search?q=coffee');
const data = await res.json();
```

---

## 2. Public REST API

All endpoints are **GET**, require **no authentication**, return **JSON**, and
expose **only approved places**. CORS is open (`Access-Control-Allow-Origin: *`,
no credentials). Responses are rate-limited per IP and cached where noted.

Base URL: `https://maps.umnaapp.com/api/public`

### `GET /places`

Approved places with optional bounding box + category filters, paginated.

| Query param | Type | Notes |
|-------------|------|-------|
| `categories` | string | Comma-separated, e.g. `Restaurant,Hotel` |
| `q` | string | Optional free-text filter (≥2 chars) |
| `minLat`,`maxLat`,`minLng`,`maxLng` | float | Bounding box |
| `limit` | int | 1–500 (default 200) |
| `offset` | int | ≥0 (default 0) |

```json
{
  "places": [
    {
      "id": "uuid",
      "name": "Cafe Coffee Day",
      "place_name_en": "Cafe Coffee Day",
      "place_name_local": "...",
      "category": "Restaurant",
      "latitude": 12.97,
      "longitude": 77.59,
      "full_address": "MG Road, Bengaluru",
      "village": null, "taluk": null, "district": "Bengaluru",
      "state": "Karnataka", "country": "India", "pincode": "560001",
      "phone": null, "website": null, "description": null,
      "rating": null, "review_count": null,
      "photos": [], "festival": null
    }
  ],
  "count": 1, "total": 1, "limit": 200, "offset": 0, "hasMore": false
}
```

### `GET /search?q=`

Text search across approved places. Proximity-ranked when `lat`/`lng` are given.
Cached 120s.

| Query param | Type | Notes |
|-------------|------|-------|
| `q` | string | **Required**, 2–200 chars |
| `limit` | int | 1–100 (default 20) |
| `lat`,`lng` | float | Optional — sorts by distance and adds `distance_meters` |

```json
{ "query": "coffee", "results": [ /* place objects */ ], "count": 3 }
```

### `GET /nearby?lat=&lng=`

Approved places near a point, sorted by distance.

| Query param | Type | Notes |
|-------------|------|-------|
| `lat`,`lng` | float | **Required** |
| `radius` | int | meters, 50–50000 (default 2000) |
| `category` | string | Optional single category |
| `limit` | int | 1–100 (default 50) |

```json
{ "results": [ { "id": "...", "distance_meters": 120, "...": "..." } ], "count": 1 }
```

### `GET /categories`

Distinct approved categories with counts. Cached 300s.

```json
{ "categories": [ { "category": "Restaurant", "count": 42 } ] }
```

### `GET /place/:id`

A single approved place by id. `404` if missing or not approved.

```json
{ "place": { "id": "...", "name": "...", "...": "..." } }
```

### `GET /route?start=lat,lng&end=lat,lng`

Routing between two points (OSRM with safe straight-line fallback).

| Query param | Type | Notes |
|-------------|------|-------|
| `start`,`end` | string | `lat,lng` |
| `profile` | string | `driving` (default), `walking`, `cycling`, `bus`, `two_wheeler` |

```json
{ "profile": "driving", "distance": 5234.1, "duration": 612.0,
  "geometry": { "type": "LineString", "coordinates": [[lng,lat], ...] } }
```

### `GET /config`

Viewer/SDK configuration: tile URLs, default center/zoom, attribution, realtime
namespace, and endpoint map. Cached 300s.

### `GET /api/map/tiles/{z}/{x}/{y}.png`

Raster basemap tiles (already public, same-origin friendly, cached).

---

## 3. JavaScript SDK

Load it once:

```html
<script src="https://maps.umnaapp.com/sdk.js"></script>
```

It exposes a global `UmnaMaps` and auto-detects the platform origin from its own
`<script src>`.

### `UmnaMaps.embed(target, options)` → map instance

| Option | Type | Description |
|--------|------|-------------|
| `center` | `{lat,lng}` | Initial center |
| `zoom` | number | Initial zoom |
| `categories` | string[] | Filter markers by category |
| `query` | string | Initial search term |
| `place` | string | Open a place popup on load (by id) |
| `search` | boolean | `false` hides the search box |
| `controls` | boolean | `false` hides nav/geolocate controls |
| `width`,`height` | string | iframe size (default `100%` / `480px`) |

Instance methods: `setCenter(lat, lng, zoom?)`, `setCategories(categories)`,
`search(q)`, `selectPlace(id)`, `destroy()`.

Events (via `map.on(event, handler)`): `ready`, `placeClick`, `moveend`,
plus live `place:created` / `place:updated` / `place:approved` / `place:deleted`.

### `UmnaMaps.api` — promise-based data client

```js
UmnaMaps.api.places({ categories: ['Hotel'], limit: 100 });
UmnaMaps.api.search('hospital', { lat, lng, limit: 5 });
UmnaMaps.api.nearby(lat, lng, { radius: 1500 });
UmnaMaps.api.categories();
UmnaMaps.api.place(id);
UmnaMaps.api.route({ lat, lng }, { lat, lng }, { profile: 'walking' });
UmnaMaps.api.config();
```

---

## 4. Realtime updates

Whenever a place is added, edited, approved, or deleted in UMNAAPP, the change is
broadcast to all embedded maps and external clients automatically — no manual
sync, no second database.

Connect to the anonymous Socket.io namespace `/public-maps`:

```js
import { io } from 'socket.io-client';
const socket = io('https://maps.umnaapp.com/public-maps');

socket.on('place:approved', ({ place }) => addOrUpdateMarker(place));
socket.on('place:updated',  ({ place }) => addOrUpdateMarker(place));
socket.on('place:created',  ({ place }) => addOrUpdateMarker(place));
socket.on('place:deleted',  ({ place }) => removeMarker(place.id));
```

The embedded viewer and SDK already subscribe to these events for you.

> A place only becomes public (and is only broadcast) once it is **approved**.
> Approval happens via the admin panel, the owner/admin edit flow, or the
> automatic approval scheduler.

---

## 5. Security model

- Only **approved** places are ever exposed; pending/rejected places are never
  returned by the public API or broadcast.
- Every public response is **sanitized**: contributor `userId`/email, business
  claim ownership, audit data, and internal approval bookkeeping are stripped.
- Public endpoints are **read-only** (`GET`) and **credential-less**.
- All **private** surfaces remain fully protected and unchanged:
  - `/api/auth/*`, `/api/users/*`, `/api/notifications/*`, `/api/itineraries/*`,
    `/api/vehicles/*`, `/api/feedback/*` (JWT required)
  - `/api/admin/*` (admin secret required)
  - All write operations on `/api/map/*` (JWT required)
- Per-IP rate limiting protects the public API (requires Redis; otherwise
  limits are skipped).

---

## 6. Performance

- **Tile caching:** tiles served with long `Cache-Control`; same-origin proxy.
- **Search/category caching:** Redis response cache (`/search` 120s, `/categories`
  & `/config` 300s).
- **Pagination:** `/places` supports `limit`/`offset` with `total`/`hasMore`.
- **Lazy loading:** the viewer fetches places by the current map bounding box on
  `moveend` (debounced), not all at once.
- **Marker clustering:** the viewer clusters markers client-side (MapLibre GL).

---

## 7. Deployment

See [`docs/maps-platform-deployment.md`](./maps-platform-deployment.md) for the
`maps.umnaapp.com` subdomain setup, nginx config, and environment variables.
