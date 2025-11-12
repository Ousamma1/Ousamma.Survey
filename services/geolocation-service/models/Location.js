const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  coordinates: {
    type: [Number], // [longitude, latitude]
    required: true,
    validate: {
      validator: function(v) {
        return v.length === 2 &&
               v[0] >= -180 && v[0] <= 180 &&
               v[1] >= -90 && v[1] <= 90;
      },
      message: 'Coordinates must be [longitude, latitude] with valid ranges'
    }
  },
  address: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['survey', 'response', 'surveyor'],
    required: true
  },
  entityId: {
    type: String,
    required: true,
    index: true
  },
  accuracy: {
    type: Number,
    min: 0
  },
  metadata: {
    country: String,
    city: String,
    state: String,
    postalCode: String,
    formattedAddress: String
  }
}, {
  timestamps: true
});

// Create geospatial index for location-based queries
locationSchema.index({ coordinates: '2dsphere' });

// Index for querying by type and entity
locationSchema.index({ type: 1, entityId: 1 });

// Virtual for GeoJSON format
locationSchema.virtual('geoJSON').get(function() {
  return {
    type: 'Point',
    coordinates: this.coordinates
  };
});

// Method to calculate distance to another location
locationSchema.methods.distanceTo = function(otherLocation) {
  const geolib = require('geolib');
  return geolib.getDistance(
    { latitude: this.coordinates[1], longitude: this.coordinates[0] },
    { latitude: otherLocation.coordinates[1], longitude: otherLocation.coordinates[0] }
  );
};

// Static method to find locations within radius
locationSchema.statics.findWithinRadius = function(coordinates, radiusInMeters) {
  return this.find({
    coordinates: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        },
        $maxDistance: radiusInMeters
      }
    }
  });
};

const Location = mongoose.model('Location', locationSchema);

module.exports = Location;
