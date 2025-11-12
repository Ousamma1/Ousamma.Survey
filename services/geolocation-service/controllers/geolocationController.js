const Location = require('../models/Location');
const Territory = require('../models/Territory');
const geocodingService = require('../services/geocodingService');
const locationService = require('../services/locationService');

class GeolocationController {
  /**
   * Save a new location
   */
  async saveLocation(req, res) {
    try {
      const { coordinates, address, type, entityId, accuracy, metadata } = req.body;

      // Validate required fields
      if (!coordinates || !type || !entityId) {
        return res.status(400).json({
          error: 'Missing required fields: coordinates, type, entityId'
        });
      }

      // Validate coordinates
      if (!locationService.validateCoordinates(coordinates)) {
        return res.status(400).json({
          error: 'Invalid coordinates format. Expected [longitude, latitude]'
        });
      }

      // If address is provided but no metadata, try to reverse geocode
      let locationMetadata = metadata;
      if (!locationMetadata && coordinates) {
        try {
          const geocoded = await geocodingService.reverseGeocode(
            coordinates[1],
            coordinates[0]
          );
          locationMetadata = geocoded.metadata;
        } catch (error) {
          console.log('Reverse geocoding failed, continuing without metadata');
        }
      }

      // Create location
      const location = new Location({
        coordinates,
        address,
        type,
        entityId,
        accuracy,
        metadata: locationMetadata
      });

      await location.save();

      res.status(201).json({
        success: true,
        location
      });
    } catch (error) {
      console.error('Save location error:', error);
      res.status(500).json({
        error: 'Failed to save location',
        details: error.message
      });
    }
  }

  /**
   * Get location by ID
   */
  async getLocation(req, res) {
    try {
      const { id } = req.params;

      const location = await Location.findById(id);

      if (!location) {
        return res.status(404).json({
          error: 'Location not found'
        });
      }

      res.json({
        success: true,
        location
      });
    } catch (error) {
      console.error('Get location error:', error);
      res.status(500).json({
        error: 'Failed to retrieve location',
        details: error.message
      });
    }
  }

  /**
   * Get locations by entity ID
   */
  async getLocationsByEntity(req, res) {
    try {
      const { entityId, type } = req.query;

      const query = {};
      if (entityId) query.entityId = entityId;
      if (type) query.type = type;

      const locations = await Location.find(query).sort({ createdAt: -1 });

      res.json({
        success: true,
        count: locations.length,
        locations
      });
    } catch (error) {
      console.error('Get locations error:', error);
      res.status(500).json({
        error: 'Failed to retrieve locations',
        details: error.message
      });
    }
  }

  /**
   * Geocode address to coordinates
   */
  async geocode(req, res) {
    try {
      const { address } = req.body;

      if (!address) {
        return res.status(400).json({
          error: 'Address is required'
        });
      }

      const result = await geocodingService.geocode(address);

      res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error('Geocode error:', error);
      res.status(500).json({
        error: 'Geocoding failed',
        details: error.message
      });
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(req, res) {
    try {
      const { coordinates } = req.body;

      if (!coordinates || coordinates.length !== 2) {
        return res.status(400).json({
          error: 'Valid coordinates [longitude, latitude] are required'
        });
      }

      const [longitude, latitude] = coordinates;
      const result = await geocodingService.reverseGeocode(latitude, longitude);

      res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error('Reverse geocode error:', error);
      res.status(500).json({
        error: 'Reverse geocoding failed',
        details: error.message
      });
    }
  }

  /**
   * Calculate distance between two points
   */
  async calculateDistance(req, res) {
    try {
      const { point1, point2, unit } = req.body;

      if (!point1 || !point2) {
        return res.status(400).json({
          error: 'Both point1 and point2 are required'
        });
      }

      const distance = locationService.calculateDistance(point1, point2, unit);

      res.json({
        success: true,
        distance,
        unit: unit || 'meters'
      });
    } catch (error) {
      console.error('Calculate distance error:', error);
      res.status(500).json({
        error: 'Failed to calculate distance',
        details: error.message
      });
    }
  }

  /**
   * Find locations within radius
   */
  async findNearby(req, res) {
    try {
      const { coordinates, radius, type } = req.body;

      if (!coordinates || !radius) {
        return res.status(400).json({
          error: 'Coordinates and radius are required'
        });
      }

      const query = {
        coordinates: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: coordinates
            },
            $maxDistance: radius
          }
        }
      };

      if (type) {
        query.type = type;
      }

      const locations = await Location.find(query);

      res.json({
        success: true,
        count: locations.length,
        locations
      });
    } catch (error) {
      console.error('Find nearby error:', error);
      res.status(500).json({
        error: 'Failed to find nearby locations',
        details: error.message
      });
    }
  }

  /**
   * Create a new territory
   */
  async createTerritory(req, res) {
    try {
      const { name, description, polygon, assignedSurveyors, color } = req.body;

      if (!name || !polygon) {
        return res.status(400).json({
          error: 'Name and polygon are required'
        });
      }

      const territory = new Territory({
        name,
        description,
        polygon,
        assignedSurveyors: assignedSurveyors || [],
        color
      });

      await territory.save();

      res.status(201).json({
        success: true,
        territory
      });
    } catch (error) {
      console.error('Create territory error:', error);
      res.status(500).json({
        error: 'Failed to create territory',
        details: error.message
      });
    }
  }

  /**
   * Get territory by ID
   */
  async getTerritory(req, res) {
    try {
      const { id } = req.params;

      const territory = await Territory.findById(id);

      if (!territory) {
        return res.status(404).json({
          error: 'Territory not found'
        });
      }

      res.json({
        success: true,
        territory
      });
    } catch (error) {
      console.error('Get territory error:', error);
      res.status(500).json({
        error: 'Failed to retrieve territory',
        details: error.message
      });
    }
  }

  /**
   * Get all territories
   */
  async getAllTerritories(req, res) {
    try {
      const territories = await Territory.find({ isActive: true });

      res.json({
        success: true,
        count: territories.length,
        territories
      });
    } catch (error) {
      console.error('Get territories error:', error);
      res.status(500).json({
        error: 'Failed to retrieve territories',
        details: error.message
      });
    }
  }

  /**
   * Get locations within a territory
   */
  async getLocationsInTerritory(req, res) {
    try {
      const { id } = req.params;

      const territory = await Territory.findById(id);

      if (!territory) {
        return res.status(404).json({
          error: 'Territory not found'
        });
      }

      const locations = await Location.find({
        coordinates: {
          $geoWithin: {
            $geometry: {
              type: 'Polygon',
              coordinates: [territory.polygon]
            }
          }
        }
      });

      res.json({
        success: true,
        territory: {
          id: territory._id,
          name: territory.name
        },
        count: locations.length,
        locations
      });
    } catch (error) {
      console.error('Get locations in territory error:', error);
      res.status(500).json({
        error: 'Failed to retrieve locations in territory',
        details: error.message
      });
    }
  }

  /**
   * Check if point is within territory (geofencing)
   */
  async checkGeofence(req, res) {
    try {
      const { coordinates, territoryId } = req.body;

      if (!coordinates || !territoryId) {
        return res.status(400).json({
          error: 'Coordinates and territoryId are required'
        });
      }

      const territory = await Territory.findById(territoryId);

      if (!territory) {
        return res.status(404).json({
          error: 'Territory not found'
        });
      }

      const isInside = territory.containsPoint(coordinates);

      res.json({
        success: true,
        isInside,
        territory: {
          id: territory._id,
          name: territory.name
        }
      });
    } catch (error) {
      console.error('Check geofence error:', error);
      res.status(500).json({
        error: 'Failed to check geofence',
        details: error.message
      });
    }
  }

  /**
   * Update territory
   */
  async updateTerritory(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const territory = await Territory.findByIdAndUpdate(
        id,
        updates,
        { new: true, runValidators: true }
      );

      if (!territory) {
        return res.status(404).json({
          error: 'Territory not found'
        });
      }

      res.json({
        success: true,
        territory
      });
    } catch (error) {
      console.error('Update territory error:', error);
      res.status(500).json({
        error: 'Failed to update territory',
        details: error.message
      });
    }
  }

  /**
   * Delete territory
   */
  async deleteTerritory(req, res) {
    try {
      const { id } = req.params;

      const territory = await Territory.findByIdAndUpdate(
        id,
        { isActive: false },
        { new: true }
      );

      if (!territory) {
        return res.status(404).json({
          error: 'Territory not found'
        });
      }

      res.json({
        success: true,
        message: 'Territory deleted successfully'
      });
    } catch (error) {
      console.error('Delete territory error:', error);
      res.status(500).json({
        error: 'Failed to delete territory',
        details: error.message
      });
    }
  }

  /**
   * Get location statistics
   */
  async getLocationStats(req, res) {
    try {
      const { type, entityId } = req.query;

      const query = {};
      if (type) query.type = type;
      if (entityId) query.entityId = entityId;

      const totalLocations = await Location.countDocuments(query);

      const locationsByType = await Location.aggregate([
        { $match: query },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);

      const recentLocations = await Location.find(query)
        .sort({ createdAt: -1 })
        .limit(10);

      res.json({
        success: true,
        stats: {
          total: totalLocations,
          byType: locationsByType,
          recent: recentLocations
        }
      });
    } catch (error) {
      console.error('Get location stats error:', error);
      res.status(500).json({
        error: 'Failed to retrieve location statistics',
        details: error.message
      });
    }
  }
}

module.exports = new GeolocationController();
