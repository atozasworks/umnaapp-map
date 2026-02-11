# API Examples

This document provides examples of API calls for the map platform.

## Authentication

All API endpoints (except `/api/health`) require authentication via JWT token.

```bash
# Get token from login endpoint
TOKEN="your-jwt-token-here"
```

## Map Services

### 1. Calculate Route

Calculate a route between two points using OSRM.

```bash
curl -X GET "http://localhost:5001/api/map/route?start=20.5937,78.9629&end=19.0760,72.8777&profile=driving" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "distance": 1500000,
  "duration": 18000,
  "geometry": {
    "type": "LineString",
    "coordinates": [[78.9629, 20.5937], [72.8777, 19.0760]]
  },
  "steps": [...]
}
```

### 2. Search Places

Search for places using Nominatim.

```bash
curl -X GET "http://localhost:5001/api/map/search?q=Mumbai&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "results": [
    {
      "placeId": 123456,
      "displayName": "Mumbai, Maharashtra, India",
      "lat": 19.0760,
      "lng": 72.8777,
      "type": "city",
      "address": {
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India"
      }
    }
  ],
  "count": 1
}
```

### 3. Reverse Geocoding

Get address from coordinates.

```bash
curl -X GET "http://localhost:5001/api/map/reverse?lat=19.0760&lng=72.8777" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "placeId": 123456,
  "displayName": "Mumbai, Maharashtra, India",
  "lat": 19.0760,
  "lng": 72.8777,
  "address": {
    "city": "Mumbai",
    "state": "Maharashtra",
    "country": "India"
  }
}
```

## Vehicle Management

### 1. List Vehicles

Get all vehicles for the authenticated user.

```bash
curl -X GET "http://localhost:5001/api/vehicles" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "vehicles": [
    {
      "id": "vehicle-uuid",
      "name": "Delivery Van 1",
      "licensePlate": "MH01AB1234",
      "type": "van",
      "status": "active",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 2. Create Vehicle

Create a new vehicle.

```bash
curl -X POST "http://localhost:5001/api/vehicles" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Delivery Van 1",
    "licensePlate": "MH01AB1234",
    "type": "van"
  }'
```

**Response:**
```json
{
  "vehicle": {
    "id": "vehicle-uuid",
    "name": "Delivery Van 1",
    "licensePlate": "MH01AB1234",
    "type": "van",
    "status": "idle",
    "userId": "user-uuid",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 3. Get Vehicle Details

Get details of a specific vehicle.

```bash
curl -X GET "http://localhost:5001/api/vehicles/vehicle-uuid" \
  -H "Authorization: Bearer $TOKEN"
```

### 4. Update Vehicle

Update vehicle information.

```bash
curl -X PUT "http://localhost:5001/api/vehicles/vehicle-uuid" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "active"
  }'
```

### 5. Delete Vehicle

Delete a vehicle.

```bash
curl -X DELETE "http://localhost:5001/api/vehicles/vehicle-uuid" \
  -H "Authorization: Bearer $TOKEN"
```

### 6. Get Vehicle Location History

Get location history for a vehicle.

```bash
curl -X GET "http://localhost:5001/api/vehicles/vehicle-uuid/locations?limit=100" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "locations": [
    {
      "id": "location-uuid",
      "vehicleId": "vehicle-uuid",
      "latitude": 20.5937,
      "longitude": 78.9629,
      "accuracy": 10,
      "speed": 45,
      "heading": 90,
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ],
  "count": 1
}
```

## WebSocket API

### Connection

```javascript
import io from 'socket.io-client'

const socket = io('http://localhost:5001', {
  auth: {
    token: 'your-jwt-token'
  }
})
```

### Join Vehicle Room

Listen to location updates for a specific vehicle.

```javascript
socket.emit('vehicle:join', { vehicleId: 'vehicle-uuid' })

socket.on('vehicle:joined', (data) => {
  console.log('Joined vehicle room:', data.vehicleId)
})
```

### Send Location Update

Send location update from a tracking device.

```javascript
socket.emit('vehicle:location', {
  vehicleId: 'vehicle-uuid',
  latitude: 20.5937,
  longitude: 78.9629,
  accuracy: 10,
  speed: 45,
  heading: 90
})
```

### Receive Location Updates

Listen for location updates.

```javascript
socket.on('vehicle:location:update', (data) => {
  console.log('Location update:', data)
  // data.location contains: latitude, longitude, accuracy, speed, heading, timestamp
})
```

### Get Vehicle List

Request list of vehicles.

```javascript
socket.emit('vehicles:list')

socket.on('vehicles:list', (data) => {
  console.log('Vehicles:', data.vehicles)
})
```

### Leave Vehicle Room

Stop listening to vehicle updates.

```javascript
socket.emit('vehicle:leave', { vehicleId: 'vehicle-uuid' })
```

## Error Responses

All endpoints return errors in the following format:

```json
{
  "error": "Error message",
  "message": "Detailed error description"
}
```

Common HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `429` - Too Many Requests (Rate Limited)
- `500` - Internal Server Error

## Rate Limiting

Rate limits are applied per endpoint:
- Route calculation: 30 requests per minute
- Search: 60 requests per minute
- Reverse geocoding: 60 requests per minute

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 29
X-RateLimit-Reset: 2024-01-01T12:01:00Z
```

