# Self-Hosted Map Platform

A complete, production-ready, self-hosted map platform similar to OpenStreetMap with routing, geocoding, and real-time vehicle tracking.

## Features

- 🗺️ **Self-Hosted Map Tiles** - Display maps using TileServer GL with your own tile data
- 🧭 **Routing** - Turn-by-turn routing using self-hosted OSRM server
- 🔍 **Place Search & Geocoding** - Search places and reverse geocode using self-hosted Nominatim
- 📍 **GPS Tracking** - Real-time GPS location tracking with smooth marker updates
- 🚗 **Vehicle Tracking** - Real-time vehicle tracking via WebSocket (Socket.io)
- 💾 **PostgreSQL + PostGIS** - Store routes, vehicles, and locations with spatial indexing
- 🐳 **Docker Compose** - All services containerized and orchestrated
- ⚡ **Production Ready** - Caching, rate limiting, and optimized for scale

## Architecture

```
┌─────────────┐
│   Frontend  │ (React + MapLibre GL JS)
│  (Port 3000)│
└──────┬──────┘
       │
       ▼
┌─────────────┐
│    Nginx    │ (Reverse Proxy)
│  (Port 80)  │
└──────┬──────┘
       │
       ├──► Backend API (Node.js/Express)
       │    ├──► PostgreSQL + PostGIS
       │    ├──► Redis (Cache & Rate Limiting)
       │    ├──► OSRM (Routing)
       │    └──► Nominatim (Geocoding)
       │
       └──► TileServer GL (Map Tiles)
```

## Quick Start

### Prerequisites

- Docker and Docker Compose
- 16GB+ RAM
- 100GB+ disk space

### 1. Clone and Setup

```bash
# Clone repository
git clone <your-repo>
cd maptest

# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2. Prepare Map Data

```bash
# Download OSM data for India
mkdir -p osrm-data tiles
cd osrm-data
wget https://download.geofabrik.de/asia/india-latest.osm.pbf

# Prepare OSRM data (takes 30-60 minutes)
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition /data/india-latest.osrm
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize /data/india-latest.osrm

# Place your .mbtiles file in tiles/ directory
cp /path/to/your/india.mbtiles ../tiles/
```

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Setup Database

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
```

### 5. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

### 6. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5001
- Tile Server: http://localhost:8080

## Services

### TileServer GL
- Serves map tiles from `.mbtiles` files
- Port: 8080
- Config: `tileserver-config.json`

### OSRM
- Routing engine for turn-by-turn directions
- Port: 5000
- Data: `osrm-data/india-latest.osrm`

### Nominatim
- Geocoding and reverse geocoding
- Port: 8081
- First import takes several hours

### PostgreSQL + PostGIS
- Database with spatial extensions
- Port: 5432
- Stores routes, vehicles, locations

### Redis
- Caching and rate limiting
- Port: 6379

### Node.js Backend
- REST API and WebSocket server
- Port: 5001
- Handles routing, search, vehicle tracking

## API Documentation

See [API_EXAMPLES.md](./API_EXAMPLES.md) for detailed API examples.

### Key Endpoints

- `GET /api/map/route` - Calculate route
- `GET /api/map/search` - Search places
- `GET /api/map/reverse` - Reverse geocode
- `GET /api/vehicles` - List vehicles
- `POST /api/vehicles` - Create vehicle
- WebSocket: `vehicle:location` - Send/receive location updates

## WebSocket Events

### Client → Server
- `vehicle:join` - Join vehicle tracking room
- `vehicle:location` - Send location update
- `vehicles:list` - Request vehicle list

### Server → Client
- `vehicle:location:update` - Location update received
- `vehicles:list` - Vehicle list response

## Project Structure

```
.
├── backend/              # Node.js/Express backend
│   ├── routes/          # API routes
│   ├── middleware/      # Auth, cache, rate limiting
│   ├── config/          # Database, passport config
│   └── prisma/          # Database schema
├── frontend/            # React frontend
│   ├── src/
│   │   ├── components/  # Map, Search, Route components
│   │   ├── pages/       # Page components
│   │   └── services/    # API client
├── nginx/               # Nginx configuration
├── osrm-data/           # OSRM routing data
├── tiles/               # Map tile files (.mbtiles)
├── docker-compose.yml   # Docker orchestration
└── SETUP_GUIDE.md       # Detailed setup instructions
```

## Configuration

### Environment Variables

Key environment variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - JWT signing secret
- `TILESERVER_URL` - Tile server URL
- `OSRM_URL` - OSRM server URL
- `NOMINATIM_URL` - Nominatim server URL
- `REDIS_URL` - Redis connection string

### Rate Limiting

Configured in `backend/middleware/rateLimit.js`:
- Route: 30 requests/minute
- Search: 60 requests/minute
- Reverse: 60 requests/minute

### Caching

Redis caching configured in `backend/middleware/cache.js`:
- Search results: 5 minutes
- Reverse geocoding: 10 minutes

## Production Deployment

1. Update environment variables for production
2. Set up SSL certificates
3. Configure domain names
4. Set up monitoring and logging
5. Configure backups for PostgreSQL
6. Set up CDN for tile serving (optional)

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

## Troubleshooting

### Services Not Starting
- Check Docker logs: `docker-compose logs <service>`
- Verify environment variables
- Check port availability

### Tiles Not Loading
- Verify tile server is running
- Check tile URL in frontend config
- Ensure `.mbtiles` file exists

### Routing Not Working
- Verify OSRM data files exist
- Check OSRM logs
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
- Open an issue on GitHub

## Acknowledgments

- [OpenStreetMap](https://www.openstreetmap.org/)
- [OSRM](https://project-osrm.org/)
- [Nominatim](https://nominatim.org/)
- [MapLibre GL JS](https://maplibre.org/)
- [TileServer GL](https://tileserver.readthedocs.io/)
