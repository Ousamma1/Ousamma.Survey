const express = require('express');
const router = express.Router();
const controller = require('../controllers/geolocationController');
const { cacheMiddleware, invalidateMiddleware } = require('../../shared/cache/cache-middleware');

// Location endpoints
router.post('/location',
  invalidateMiddleware({ namespace: 'geolocation', pattern: 'location:*' }),
  controller.saveLocation.bind(controller)
);

router.get('/location/:id',
  cacheMiddleware('geolocation', {
    namespace: 'geolocation',
    keyGenerator: (req) => `location:${req.params.id}`
  }),
  controller.getLocation.bind(controller)
);

router.get('/locations',
  cacheMiddleware('medium', {
    namespace: 'geolocation',
    keyGenerator: (req) => `locations:${req.query.entityId}:${req.query.type || 'all'}`
  }),
  controller.getLocationsByEntity.bind(controller)
);

router.get('/locations/stats',
  cacheMiddleware('short', {
    namespace: 'geolocation',
    keyGenerator: () => 'stats:all'
  }),
  controller.getLocationStats.bind(controller)
);

// Geocoding endpoints (cache geocoding results)
router.post('/geocode',
  controller.geocode.bind(controller)
);

router.post('/reverse-geocode',
  controller.reverseGeocode.bind(controller)
);

// Distance and proximity endpoints
router.post('/distance', controller.calculateDistance.bind(controller));
router.post('/nearby',
  controller.findNearby.bind(controller)
);

// Territory endpoints
router.post('/territory',
  invalidateMiddleware({ namespace: 'geolocation', pattern: 'territory:*' }),
  controller.createTerritory.bind(controller)
);

router.get('/territory/:id',
  cacheMiddleware('long', {
    namespace: 'geolocation',
    keyGenerator: (req) => `territory:${req.params.id}`
  }),
  controller.getTerritory.bind(controller)
);

router.get('/territories',
  cacheMiddleware('medium', {
    namespace: 'geolocation',
    keyGenerator: () => 'territory:list:all'
  }),
  controller.getAllTerritories.bind(controller)
);

router.put('/territory/:id',
  invalidateMiddleware({ namespace: 'geolocation', pattern: 'territory:*' }),
  controller.updateTerritory.bind(controller)
);

router.delete('/territory/:id',
  invalidateMiddleware({ namespace: 'geolocation', pattern: 'territory:*' }),
  controller.deleteTerritory.bind(controller)
);

// Territory-location operations
router.get('/territory/:id/locations',
  cacheMiddleware('medium', {
    namespace: 'geolocation',
    keyGenerator: (req) => `territory:${req.params.id}:locations`
  }),
  controller.getLocationsInTerritory.bind(controller)
);

router.post('/geofence/check',
  controller.checkGeofence.bind(controller)
);

module.exports = router;
