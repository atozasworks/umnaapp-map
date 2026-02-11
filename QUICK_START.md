# Quick Start Guide

Get your self-hosted map platform running in 5 minutes (after data preparation).

## Prerequisites Check

```bash
# Check Docker
docker --version
docker-compose --version

# Check Node.js (for migrations)
node --version
npm --version
```

## Step 1: Prepare Data (One-Time Setup)

### Download OSM Data
```bash
mkdir -p osrm-data tiles
cd osrm-data
wget https://download.geofabrik.de/asia/india-latest.osm.pbf
```

### Process OSRM Data (30-60 minutes)
```bash
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-extract -p /opt/car.lua /data/india-latest.osm.pbf
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-partition /data/india-latest.osrm
docker run -t -v $(pwd):/data osrm/osrm-backend osrm-customize /data/india-latest.osrm
```

### Add Map Tiles
```bash
# Place your .mbtiles file in tiles/ directory
cp /path/to/your/india.mbtiles ../tiles/
```

## Step 2: Configure Environment

```bash
# Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Edit .env files with your settings
# At minimum, change:
# - POSTGRES_PASSWORD
# - JWT_SECRET
```

## Step 3: Start Services

```bash
# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

## Step 4: Setup Database

```bash
cd backend
npm install
npx prisma generate
npx prisma migrate deploy
```

## Step 5: Start Frontend

```bash
cd frontend
npm install
npm run dev
```

## Step 6: Access Application

- **Frontend**: http://localhost:3000
- **API**: http://localhost:5001/api/health
- **Tiles**: http://localhost:8080

## Verify Services

```bash
# Test API
curl http://localhost:5001/api/health

# Test OSRM
curl "http://localhost:5000/route/v1/driving/78.0,20.0;78.1,20.1?overview=false"

# Test Nominatim (after import completes)
curl "http://localhost:8081/search?q=Mumbai&format=json&limit=1"
```

## Common Issues

### OSRM Not Starting
- Check `osrm-data/` has `.osrm` files
- Verify file permissions

### Tiles Not Loading
- Check tileserver is running: `docker-compose ps tileserver`
- Verify `.mbtiles` file exists in `tiles/`

### Database Connection Error
- Wait for PostgreSQL to be healthy: `docker-compose ps postgres`
- Check DATABASE_URL in `backend/.env`

### Nominatim Import
- First import takes 2-4 hours
- Monitor: `docker-compose logs -f nominatim`
- Wait for "Nominatim is ready" message

## Next Steps

1. Create a user account
2. Create a vehicle
3. Test GPS tracking
4. Test routing
5. Test place search

See [SETUP_GUIDE.md](./SETUP_GUIDE.md) for detailed instructions.

