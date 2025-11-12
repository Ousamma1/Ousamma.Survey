const express = require('express');
const router = express.Router();
const controller = require('../controllers/geolocationController');

// Location endpoints
router.post('/location', controller.saveLocation.bind(controller));
router.get('/location/:id', controller.getLocation.bind(controller));
router.get('/locations', controller.getLocationsByEntity.bind(controller));
router.get('/locations/stats', controller.getLocationStats.bind(controller));

// Geocoding endpoints
router.post('/geocode', controller.geocode.bind(controller));
router.post('/reverse-geocode', controller.reverseGeocode.bind(controller));

// Distance and proximity endpoints
router.post('/distance', controller.calculateDistance.bind(controller));
router.post('/nearby', controller.findNearby.bind(controller));

// Territory endpoints
router.post('/territory', controller.createTerritory.bind(controller));
router.get('/territory/:id', controller.getTerritory.bind(controller));
router.get('/territories', controller.getAllTerritories.bind(controller));
router.put('/territory/:id', controller.updateTerritory.bind(controller));
router.delete('/territory/:id', controller.deleteTerritory.bind(controller));

// Territory-location operations
router.get('/territory/:id/locations', controller.getLocationsInTerritory.bind(controller));
router.post('/geofence/check', controller.checkGeofence.bind(controller));

module.exports = router;
