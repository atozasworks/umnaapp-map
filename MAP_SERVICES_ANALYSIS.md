# Map Services Analysis - UMNAAPP Project

## Current Implementation

### Using: UMNAAPP + MapLibre GL

**Map Tiles**: `https://umnaapp.in` (via backend proxy at `/api/map/tiles/`)
**Place Search**: `https://umnaapp.in/map/nominatim`
**Routing**: `https://umnaapp.in/map/route/`
**Glyphs/Fonts**: `https://demotiles.maplibre.org/font/`

**Details:**
- **Map Library**: MapLibre GL JS
- **Map Type**: India-focused
- **All map services**: umnaapp.in only
- **Location**: Browser Geolocation API

### Dependencies

- `maplibre-gl` - Map rendering
- No Leaflet, no OpenStreetMap services

## Alternative Map Services (if needed)

- **Mapbox** - API key required
- **Google Maps** - API key required
- **CartoDB** - Free tier available

## Resources

- [UMNAAPP](https://umnaapp.in/)
- [MapLibre GL JS](https://maplibre.org/)
