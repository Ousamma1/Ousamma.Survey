require('dotenv').config();
const express = require('express');
const cors = require('cors');
const compression = require('compression');
const database = require('./config/database');
const geolocationRoutes = require('./routes/geolocation');

// Import cache utilities
const cache = require('../shared/cache/redis-cache');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Response compression
app.use(compression({
  threshold: 1024,
  level: 6
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'geolocation-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: database.isConnected() ? 'connected' : 'disconnected'
  });
});

// API routes
app.use('/api/geo', geolocationRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Geolocation Service',
    version: '1.0.0',
    description: 'Microservice for geolocation, geocoding, and territory management',
    endpoints: {
      health: '/health',
      api: '/api/geo',
      docs: '/api/geo/docs'
    }
  });
});

// API documentation endpoint
app.get('/api/geo/docs', (req, res) => {
  res.json({
    service: 'Geolocation Service API',
    version: '1.0.0',
    endpoints: {
      locations: {
        'POST /api/geo/location': 'Save a new location',
        'GET /api/geo/location/:id': 'Get location by ID',
        'GET /api/geo/locations': 'Get locations by entity (query: entityId, type)',
        'GET /api/geo/locations/stats': 'Get location statistics'
      },
      geocoding: {
        'POST /api/geo/geocode': 'Convert address to coordinates',
        'POST /api/geo/reverse-geocode': 'Convert coordinates to address'
      },
      proximity: {
        'POST /api/geo/distance': 'Calculate distance between two points',
        'POST /api/geo/nearby': 'Find locations within radius'
      },
      territories: {
        'POST /api/geo/territory': 'Create a new territory',
        'GET /api/geo/territory/:id': 'Get territory by ID',
        'GET /api/geo/territories': 'Get all territories',
        'PUT /api/geo/territory/:id': 'Update territory',
        'DELETE /api/geo/territory/:id': 'Delete territory',
        'GET /api/geo/territory/:id/locations': 'Get locations in territory',
        'POST /api/geo/geofence/check': 'Check if point is within territory'
      }
    },
    examples: {
      saveLocation: {
        url: 'POST /api/geo/location',
        body: {
          coordinates: [55.2708, 25.2048],
          address: 'Dubai, UAE',
          type: 'survey',
          entityId: 'survey-001',
          accuracy: 10
        }
      },
      geocode: {
        url: 'POST /api/geo/geocode',
        body: {
          address: 'Burj Khalifa, Dubai'
        }
      },
      createTerritory: {
        url: 'POST /api/geo/territory',
        body: {
          name: 'Downtown Dubai',
          polygon: [
            [55.27, 25.20],
            [55.28, 25.20],
            [55.28, 25.21],
            [55.27, 25.21],
            [55.27, 25.20]
          ],
          assignedSurveyors: ['surveyor-001', 'surveyor-002']
        }
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    availableEndpoints: '/api/geo/docs'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
async function startServer() {
  try {
    // Connect to MongoDB
    await database.connect();

    // Connect to Redis (optional, graceful degradation if fails)
    try {
      await cache.connect();
      console.log('✅ Redis cache connected');
    } catch (error) {
      console.warn('⚠️  Redis connection failed, running without cache:', error.message);
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log('');
      console.log('═══════════════════════════════════════════════');
      console.log('  🌍 Geolocation Service');
      console.log('═══════════════════════════════════════════════');
      console.log(`  Port:        ${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  API Docs:    http://localhost:${PORT}/api/geo/docs`);
      console.log(`  Health:      http://localhost:${PORT}/health`);
      console.log(`  Cache:       ${cache.isConnected() ? 'Enabled' : 'Disabled'}`);
      console.log(`  Compression: Enabled`);
      console.log('═══════════════════════════════════════════════');
      console.log('');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
async function shutdown() {
  console.log('\n🛑 Shutting down gracefully...');
  try {
    await cache.disconnect();
    await database.disconnect();
    console.log('✅ Cleanup completed');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();

module.exports = app;
