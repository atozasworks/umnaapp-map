# Deploy Add Place Feature (Fix 404)

If you get `POST /api/map/places 404`, the production server needs an update.

## 1. Deploy Latest Backend Code

Ensure the server has the updated `backend/routes/mapRoutes.js` with the `/places` POST and GET routes.

```bash
# On your server (or via CI/CD)
cd /path/to/maptest
git pull  # or deploy your latest code

cd backend
npm install
npx prisma generate
```

## 2. Create Place Table in Production DB

If Prisma migrate fails (e.g. PostGIS), run manually:

```bash
cd backend
psql $DATABASE_URL -f prisma/add-place-table.sql
```

Or connect to PostgreSQL and run:
```sql
CREATE TABLE IF NOT EXISTS "Place" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "zoomLevel" DOUBLE PRECISION NOT NULL DEFAULT 15,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Place_userId_idx" ON "Place"("userId");
CREATE INDEX IF NOT EXISTS "Place_category_idx" ON "Place"("category");
CREATE INDEX IF NOT EXISTS "Place_createdAt_idx" ON "Place"("createdAt");
ALTER TABLE "Place" ADD CONSTRAINT "Place_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

## 3. Rebuild Frontend & Restart Backend

```bash
# Rebuild frontend
cd frontend
npm run build

# Copy build to backend if needed (check FRONTEND_BUILD_PATH in .env)
# cp -r dist ../backend/build  # if your setup serves from backend/build

# Restart backend (PM2 example)
cd ../backend
pm2 restart umnaapp-backend
# or: node server.js
```

## 4. Verify

```bash
# Test the endpoint (replace with your token)
curl -X POST https://umnaapptst.testatozas.in/api/map/places \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"name":"Test","category":"Other","latitude":12.97,"longitude":77.59,"zoomLevel":15}'
```

## testatozas.in / cPanel Hosting

If you use shared hosting (cPanel, testatozas):

- Node.js might run via a separate process (e.g. NodeJS Selector)
- Ensure `/api/*` is proxied to your Node app (port 5000 or similar)
- `.htaccess` or server config must route `/api` to the backend
- Redeploy the backend app with the new routes and restart it
