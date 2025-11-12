# Geolocation Service

A comprehensive microservice for geolocation, geocoding, territory management, and map integration with OpenStreetMap.

## Features

- **Location Management**: CRUD operations for location data
- **Geocoding**: Convert addresses to coordinates
- **Reverse Geocoding**: Convert coordinates to addresses
- **Distance Calculations**: Calculate distances between points
- **Geofencing**: Check if points are within defined territories
- **Territory Management**: Create and manage geographic territories
- **Location History**: Track location changes over time
- **MongoDB Integration**: Persistent storage with geospatial indexing

## Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: MongoDB with geospatial indexes
- **Geocoding**: OpenStreetMap (Nominatim)
- **Geospatial Libraries**: Turf.js, Geolib

## Installation

### Prerequisites

- Node.js 18+ installed
- MongoDB 7.0+ running
- npm or yarn package manager

### Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/geolocation
GEOCODER_PROVIDER=openstreetmap
ALLOWED_ORIGINS=http://localhost:3000
```

3. Start the service:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Docker Deployment

### Build and run with Docker:
```bash
docker build -t geolocation-service .
docker run -p 3001:3001 --env-file .env geolocation-service
```

### Or use docker-compose from project root:
```bash
docker-compose up geolocation-service
```

## API Documentation

### Base URL
```
http://localhost:3001/api/geo
```

### Endpoints

#### Location Management

**Save Location**
```http
POST /api/geo/location
Content-Type: application/json

{
  "coordinates": [55.2708, 25.2048],
  "address": "Dubai, UAE",
  "type": "survey",
  "entityId": "survey-001",
  "accuracy": 10
}
```

**Get Location**
```http
GET /api/geo/location/:id
```

**Get Locations by Entity**
```http
GET /api/geo/locations?entityId=survey-001&type=survey
```

**Get Location Statistics**
```http
GET /api/geo/locations/stats
```

#### Geocoding

**Geocode Address**
```http
POST /api/geo/geocode
Content-Type: application/json

{
  "address": "Burj Khalifa, Dubai"
}
```

**Reverse Geocode**
```http
POST /api/geo/reverse-geocode
Content-Type: application/json

{
  "coordinates": [55.2708, 25.2048]
}
```

#### Distance & Proximity

**Calculate Distance**
```http
POST /api/geo/distance
Content-Type: application/json

{
  "point1": [55.2708, 25.2048],
  "point2": [55.2800, 25.2100],
  "unit": "kilometers"
}
```

**Find Nearby Locations**
```http
POST /api/geo/nearby
Content-Type: application/json

{
  "coordinates": [55.2708, 25.2048],
  "radius": 5000,
  "type": "survey"
}
```

#### Territory Management

**Create Territory**
```http
POST /api/geo/territory
Content-Type: application/json

{
  "name": "Downtown Dubai",
  "description": "Central business district",
  "polygon": [
    [55.27, 25.20],
    [55.28, 25.20],
    [55.28, 25.21],
    [55.27, 25.21],
    [55.27, 25.20]
  ],
  "assignedSurveyors": ["surveyor-001"],
  "color": "#3388ff"
}
```

**Get Territory**
```http
GET /api/geo/territory/:id
```

**Get All Territories**
```http
GET /api/geo/territories
```

**Update Territory**
```http
PUT /api/geo/territory/:id
Content-Type: application/json

{
  "name": "Updated Name",
  "assignedSurveyors": ["surveyor-001", "surveyor-002"]
}
```

**Delete Territory**
```http
DELETE /api/geo/territory/:id
```

**Get Locations in Territory**
```http
GET /api/geo/territory/:id/locations
```

**Check Geofence**
```http
POST /api/geo/geofence/check
Content-Type: application/json

{
  "coordinates": [55.275, 25.205],
  "territoryId": "territory-id-here"
}
```

## Data Models

### Location Schema
```javascript
{
  coordinates: [Number, Number], // [longitude, latitude]
  address: String,
  type: 'survey' | 'response' | 'surveyor',
  entityId: String,
  accuracy: Number,
  metadata: {
    country: String,
    city: String,
    state: String,
    postalCode: String,
    formattedAddress: String
  },
  timestamps: true
}
```

### Territory Schema
```javascript
{
  name: String,
  description: String,
  polygon: [[Number, Number]], // Array of [lng, lat] pairs
  assignedSurveyors: [String],
  color: String,
  isActive: Boolean,
  metadata: {
    area: Number,
    perimeter: Number,
    centerPoint: [Number, Number]
  },
  timestamps: true
}
```

## Database Indexes

The service creates the following indexes for optimal performance:

- **Geospatial Index**: `coordinates: '2dsphere'` for location-based queries
- **Type & Entity Index**: `{ type: 1, entityId: 1 }` for filtering
- **Territory Index**: `polygon: '2dsphere'` for geofencing

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error message",
  "details": "Detailed error description"
}
```

Common HTTP status codes:
- `200` - Success
- `201` - Resource created
- `400` - Bad request (invalid data)
- `404` - Resource not found
- `500` - Internal server error

## Health Check

```http
GET /health
```

Returns:
```json
{
  "status": "healthy",
  "service": "geolocation-service",
  "version": "1.0.0",
  "timestamp": "2025-11-12T10:00:00.000Z",
  "database": "connected"
}
```

## Performance Considerations

- **Geospatial Queries**: Optimized with MongoDB 2dsphere indexes
- **Batch Operations**: Support for bulk geocoding
- **Caching**: Consider implementing Redis for frequently accessed data
- **Rate Limiting**: Implement for production use with geocoding APIs

## Development

### Running Tests
```bash
npm test
```

### Code Style
```bash
npm run lint
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Service port | `3001` |
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/geolocation` |
| `GEOCODER_PROVIDER` | Geocoding provider | `openstreetmap` |
| `GEOCODER_API_KEY` | API key for geocoding (if required) | - |
| `ALLOWED_ORIGINS` | CORS allowed origins | `*` |
| `DEFAULT_ACCURACY_THRESHOLD` | Default accuracy threshold (meters) | `100` |
| `MAX_LOCATION_HISTORY` | Max locations to store per entity | `1000` |

## Integration Examples

### JavaScript/Node.js
```javascript
const fetch = require('node-fetch');

// Save location
async function saveLocation(coordinates, type, entityId) {
  const response = await fetch('http://localhost:3001/api/geo/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates, type, entityId })
  });
  return await response.json();
}

// Geocode address
async function geocodeAddress(address) {
  const response = await fetch('http://localhost:3001/api/geo/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ address })
  });
  return await response.json();
}
```

### Frontend (Browser)
```javascript
// Using MapService (included)
const mapService = new MapService({
  apiUrl: 'http://localhost:3001/api/geo'
});

// Save current location
navigator.geolocation.getCurrentPosition(async (position) => {
  const result = await mapService.saveLocation({
    coordinates: [position.coords.longitude, position.coords.latitude],
    type: 'response',
    entityId: 'response-123',
    accuracy: position.coords.accuracy
  });
  console.log('Location saved:', result);
});
```

## License

MIT

## Support

For issues and questions, please open an issue in the GitHub repository.
