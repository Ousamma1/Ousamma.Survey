const mongoose = require('mongoose');

const territorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    trim: true
  },
  polygon: {
    type: [[Number]], // Array of [longitude, latitude] pairs
    required: true,
    validate: {
      validator: function(v) {
        // Must have at least 3 points and first point should equal last point for closed polygon
        return v.length >= 4 &&
               v[0][0] === v[v.length - 1][0] &&
               v[0][1] === v[v.length - 1][1];
      },
      message: 'Polygon must have at least 3 points and be closed (first point = last point)'
    }
  },
  assignedSurveyors: [{
    type: String,
    index: true
  }],
  color: {
    type: String,
    default: '#3388ff'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    area: Number, // in square meters
    perimeter: Number, // in meters
    centerPoint: [Number] // [longitude, latitude]
  }
}, {
  timestamps: true
});

// Create geospatial index for polygon
territorySchema.index({ polygon: '2dsphere' });

// Virtual for GeoJSON format
territorySchema.virtual('geoJSON').get(function() {
  return {
    type: 'Polygon',
    coordinates: [this.polygon]
  };
});

// Method to check if a point is within territory
territorySchema.methods.containsPoint = function(coordinates) {
  const turf = require('@turf/turf');
  const point = turf.point(coordinates);
  const polygon = turf.polygon([this.polygon]);
  return turf.booleanPointInPolygon(point, polygon);
};

// Method to calculate territory area
territorySchema.methods.calculateArea = function() {
  const turf = require('@turf/turf');
  const polygon = turf.polygon([this.polygon]);
  return turf.area(polygon); // Returns area in square meters
};

// Static method to find territories containing a point
territorySchema.statics.findContainingPoint = function(coordinates) {
  return this.find({
    polygon: {
      $geoIntersects: {
        $geometry: {
          type: 'Point',
          coordinates: coordinates
        }
      }
    }
  });
};

// Pre-save hook to calculate metadata
territorySchema.pre('save', function(next) {
  const turf = require('@turf/turf');
  const polygon = turf.polygon([this.polygon]);

  // Calculate area
  this.metadata.area = turf.area(polygon);

  // Calculate center point
  const center = turf.centroid(polygon);
  this.metadata.centerPoint = center.geometry.coordinates;

  next();
});

const Territory = mongoose.model('Territory', territorySchema);

module.exports = Territory;
