# Complete Setup Guide - Self-Hosted Map Platform

This guide will help you set up a complete self-hosted map platform with routing, geocoding, and real-time vehicle tracking.

## Prerequisites

- Docker and Docker Compose installed
- At least 16GB RAM (32GB recommended for Nominatim)
- 100GB+ free disk space
- Linux/macOS/Windows with WSL2

## Step 1: Prepare Map Data

### 1.1 Download OSM Data for India

```bash
# Create data directories
mkdir -p osrm-data tiles

# Download India OSM data (this is a large file ~1-2GB)
cd osrm-data
wget https://download.geofabrik.de/asia/india-latest.osm.pbf
```

### 1.2 Prepare OSRM Data

```bash
# Extract OSRM data (this takes 30-60 minutes)
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition /data/india-latest.osrm
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize /data/india-latest.osrm
```

### 1.3 Prepare Map Tiles

You need to have your map tiles ready. Place your `.mbtiles` file in the `tiles/` directory:

```bash
# Example: If you have india.mbtiles
cp /path/to/your/india.mbtiles tiles/
```

## Step 2: Configure Environment

### 2.1 Copy Environment Files

```bash
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 2.2 Update Environment Variables

Edit `.env` and update the following:

```env
# Change these for production
POSTGRES_PASSWORD=your-secure-password
JWT_SECRET=your-very-secure-jwt-secret-key
FRONTEND_URL=https://yourdomain.com
```

## Step 3: Database Setup

### 3.1 Start PostgreSQL

```bash
docker-compose up -d postgres
```

Wait for PostgreSQL to be healthy (check with `docker-compose ps`).

### 3.2 Run Database Migrations

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
```

## Step 4: Start Services

### 4.1 Start All Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4.2 Start Nominatim Import (First Time Only)

Nominatim needs to import OSM data on first run. This takes several hours:

```bash
# Check Nominatim logs
docker-compose logs -f nominatim

# Wait for import to complete (you'll see "Nominatim is ready" message)
```

## Step 5: Frontend Setup

### 5.1 Install Dependencies

```bash
cd frontend
npm install
```

### 5.2 Update Frontend Environment

Edit `frontend/.env`:

```env
VITE_API_URL=http://localhost:5001/api
VITE_SOCKET_URL=http://localhost:5001
VITE_TILESERVER_URL=http://localhost:8080
```

### 5.3 Start Frontend (Development)

```bash
npm run dev
```

Or build for production:

```bash
npm run build
```

## Step 6: Verify Services

### 6.1 Check Service Health

```bash
# Backend API
curl http://localhost:5001/api/health

# Tile Server
curl http://localhost:8080/

# OSRM (test route)
curl "http://localhost:5000/route/v1/driving/78.0,20.0;78.1,20.1?overview=false"

# Nominatim (test search)
curl "http://localhost:8081/search?q=Mumbai&format=json&limit=1"
```

### 6.2 Access Services

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5001
- **Tile Server**: http://localhost:8080
- **OSRM**: http://localhost:5000
- **Nominatim**: http://localhost:8081

## Step 7: Production Deployment

### 7.1 Update Nginx Configuration

Edit `nginx/nginx.conf` and update server_name:

```nginx
server_name yourdomain.com;
```

### 7.2 SSL Certificates (Optional)

Place SSL certificates in `nginx/ssl/`:

```bash
mkdir -p nginx/ssl
# Place your cert.pem and key.pem files here
```

### 7.3 Build and Deploy

```bash
# Build frontend
cd frontend
npm run build

# Start all services
docker-compose up -d
```

## Step 8: Vehicle Tracking Setup

### 8.1 Create a Vehicle

Use the API or frontend to create a vehicle:

```bash
curl -X POST http://localhost:5001/api/vehicles \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Delivery Van 1",
    "licensePlate": "MH01AB1234",
    "type": "van"
  }'
```

### 8.2 Send Location Updates

From a mobile device or tracking device, send location updates via WebSocket:

```javascript
socket.emit('vehicle:location', {
  vehicleId: 'vehicle-id',
  latitude: 20.5937,
  longitude: 78.9629,
  accuracy: 10,
  speed: 45,
  heading: 90
})
```

## Troubleshooting

### OSRM Not Starting

- Ensure OSRM data files are in `osrm-data/` directory
- Check file permissions
- Verify data files are complete

### Nominatim Import Failing

- Check available disk space (needs 50GB+)
- Increase Docker memory limit
- Check logs: `docker-compose logs nominatim`

### Tiles Not Loading

- Verify tileserver is running: `docker-compose ps tileserver`
- Check tile URL in frontend environment
- Verify `.mbtiles` file is in `tiles/` directory

### Database Connection Issues

- Verify PostgreSQL is healthy: `docker-compose ps postgres`
- Check DATABASE_URL in backend/.env
- Ensure migrations are run: `npx prisma migrate deploy`

## Performance Optimization

### Redis Caching

Redis is automatically used for caching and rate limiting. Monitor with:

```bash
docker-compose exec redis redis-cli
> INFO stats
```

### Database Indexing

PostGIS indexes are created automatically. For custom queries, add indexes:

```sql
CREATE INDEX idx_location_point ON locations USING GIST(point);
```

### Rate Limiting

Adjust rate limits in `backend/middleware/rateLimit.js`:

```javascript
rateLimitMiddleware('route', 30, 60) // 30 requests per 60 seconds
```

## Monitoring

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f nominatim
```

### Resource Usage

```bash
docker stats
```

## Next Steps

1. Set up monitoring (Prometheus, Grafana)
2. Configure backup for PostgreSQL
3. Set up SSL certificates
4. Configure CDN for tile serving
5. Set up log aggregation

## Support

For issues or questions, check:
- OSRM documentation: https://project-osrm.org/
- Nominatim documentation: https://nominatim.org/
- MapLibre GL JS: https://maplibre.org/

