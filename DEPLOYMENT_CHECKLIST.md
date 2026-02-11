# Deployment Checklist

Use this checklist to ensure your self-hosted map platform is properly configured and deployed.

## Pre-Deployment

### Data Preparation
- [ ] OSM data downloaded (`india-latest.osm.pbf`)
- [ ] OSRM data processed (`.osrm` files exist in `osrm-data/`)
- [ ] Map tiles prepared (`.mbtiles` file in `tiles/` directory)
- [ ] Verified data file sizes and integrity

### Environment Configuration
- [ ] `.env` file created from `.env.example`
- [ ] `backend/.env` file created from `backend/.env.example`
- [ ] `frontend/.env` file created from `frontend/.env.example`
- [ ] All passwords changed from defaults
- [ ] JWT_SECRET set to secure random value
- [ ] FRONTEND_URL updated for production
- [ ] Database credentials configured
- [ ] Service URLs configured correctly

### Docker Setup
- [ ] Docker installed and running
- [ ] Docker Compose installed
- [ ] Sufficient disk space (100GB+)
- [ ] Sufficient RAM (16GB+)
- [ ] Ports available (80, 443, 5000, 5001, 5432, 6379, 8080, 8081)

## Service Deployment

### Database
- [ ] PostgreSQL container started
- [ ] Database healthy (`docker-compose ps postgres`)
- [ ] PostGIS extension enabled
- [ ] Prisma migrations run successfully
- [ ] Database schema verified

### Map Services
- [ ] TileServer GL started
- [ ] Tiles accessible at configured URL
- [ ] OSRM container started
- [ ] OSRM routing working (test endpoint)
- [ ] Nominatim container started
- [ ] Nominatim import completed (check logs)
- [ ] Nominatim search working

### Backend Services
- [ ] Redis container started
- [ ] Redis accessible
- [ ] Backend container started
- [ ] Backend API health check passing
- [ ] All API endpoints accessible
- [ ] WebSocket connection working

### Frontend
- [ ] Frontend dependencies installed
- [ ] Environment variables configured
- [ ] Frontend builds successfully
- [ ] Frontend accessible in browser
- [ ] Map tiles loading correctly

### Nginx (Production)
- [ ] Nginx configuration updated
- [ ] Server name configured
- [ ] SSL certificates installed (if using HTTPS)
- [ ] Reverse proxy working
- [ ] All routes proxied correctly

## Functionality Testing

### Authentication
- [ ] User registration working
- [ ] User login working
- [ ] JWT tokens issued correctly
- [ ] Protected routes require authentication
- [ ] Token expiration working

### Map Features
- [ ] Map displays correctly
- [ ] Tiles loading from self-hosted server
- [ ] Map controls working (zoom, pan)
- [ ] GPS location detection working
- [ ] User marker displays correctly
- [ ] Accuracy circle displays correctly

### Routing
- [ ] Route calculation working
- [ ] Routes display on map
- [ ] Route distance/duration correct
- [ ] Multiple waypoints supported
- [ ] Route clearing works

### Search & Geocoding
- [ ] Place search working
- [ ] Search results display correctly
- [ ] Reverse geocoding working
- [ ] Address display correct
- [ ] Map centers on selected location

### Vehicle Tracking
- [ ] Vehicle creation working
- [ ] Vehicle list displays
- [ ] WebSocket connection established
- [ ] Vehicle location updates received
- [ ] Vehicle markers display on map
- [ ] Location history retrievable

### API Endpoints
- [ ] `GET /api/health` - Health check
- [ ] `GET /api/map/route` - Route calculation
- [ ] `GET /api/map/search` - Place search
- [ ] `GET /api/map/reverse` - Reverse geocode
- [ ] `GET /api/vehicles` - List vehicles
- [ ] `POST /api/vehicles` - Create vehicle
- [ ] `GET /api/vehicles/:id` - Get vehicle
- [ ] `PUT /api/vehicles/:id` - Update vehicle
- [ ] `DELETE /api/vehicles/:id` - Delete vehicle
- [ ] `GET /api/vehicles/:id/locations` - Location history

## Performance & Security

### Caching
- [ ] Redis caching working
- [ ] Cache TTL configured correctly
- [ ] Cache invalidation working

### Rate Limiting
- [ ] Rate limiting active
- [ ] Rate limit headers present
- [ ] Rate limits appropriate for use case
- [ ] Rate limit errors return 429

### Security
- [ ] JWT tokens secure
- [ ] Passwords not in code
- [ ] CORS configured correctly
- [ ] Input validation working
- [ ] SQL injection protection (Prisma)
- [ ] HTTPS configured (production)

### Monitoring
- [ ] Logs accessible
- [ ] Error logging working
- [ ] Service health checks configured
- [ ] Resource usage monitored

## Production Readiness

### Backup
- [ ] Database backup strategy defined
- [ ] Backup automation configured
- [ ] Backup restoration tested

### Monitoring
- [ ] Log aggregation configured
- [ ] Error tracking setup
- [ ] Performance monitoring active
- [ ] Alerting configured

### Scaling
- [ ] Horizontal scaling plan
- [ ] Load balancing configured (if needed)
- [ ] Database connection pooling
- [ ] CDN for tiles (optional)

### Documentation
- [ ] README.md complete
- [ ] SETUP_GUIDE.md complete
- [ ] API_EXAMPLES.md complete
- [ ] Environment variables documented
- [ ] Troubleshooting guide available

## Post-Deployment

### Verification
- [ ] All services running
- [ ] No error logs
- [ ] All features working
- [ ] Performance acceptable
- [ ] Security measures active

### User Testing
- [ ] Create test user account
- [ ] Test all user flows
- [ ] Test on mobile devices
- [ ] Test GPS tracking
- [ ] Test vehicle tracking

### Maintenance
- [ ] Update schedule defined
- [ ] Monitoring alerts configured
- [ ] Backup verification scheduled
- [ ] Log rotation configured

## Troubleshooting

If any item fails:

1. Check service logs: `docker-compose logs <service>`
2. Verify environment variables
3. Check service health: `docker-compose ps`
4. Test individual services
5. Review documentation
6. Check disk space and memory

## Sign-Off

- [ ] All critical items checked
- [ ] All services operational
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Ready for production use

**Deployed by**: _________________  
**Date**: _________________  
**Version**: _________________

