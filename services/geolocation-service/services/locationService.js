const geolib = require('geolib');
const turf = require('@turf/turf');

class LocationService {
  /**
   * Calculate distance between two points
   * @param {Array} point1 - [longitude, latitude]
   * @param {Array} point2 - [longitude, latitude]
   * @param {string} unit - 'meters', 'kilometers', 'miles'
   * @returns {number} - Distance in specified unit
   */
  calculateDistance(point1, point2, unit = 'meters') {
    const distance = geolib.getDistance(
      { latitude: point1[1], longitude: point1[0] },
      { latitude: point2[1], longitude: point2[0] }
    );

    switch (unit) {
      case 'kilometers':
        return distance / 1000;
      case 'miles':
        return distance / 1609.34;
      default:
        return distance;
    }
  }

  /**
   * Calculate center point of multiple coordinates
   * @param {Array} coordinates - Array of [longitude, latitude] pairs
   * @returns {Array} - Center point [longitude, latitude]
   */
  calculateCenter(coordinates) {
    const points = coordinates.map(coord => ({
      latitude: coord[1],
      longitude: coord[0]
    }));

    const center = geolib.getCenter(points);
    return [center.longitude, center.latitude];
  }

  /**
   * Check if point is within radius of center
   * @param {Array} point - [longitude, latitude]
   * @param {Array} center - [longitude, latitude]
   * @param {number} radius - Radius in meters
   * @returns {boolean}
   */
  isWithinRadius(point, center, radius) {
    const distance = this.calculateDistance(point, center);
    return distance <= radius;
  }

  /**
   * Check if point is within polygon (geofencing)
   * @param {Array} point - [longitude, latitude]
   * @param {Array} polygon - Array of [longitude, latitude] pairs
   * @returns {boolean}
   */
  isPointInPolygon(point, polygon) {
    const pt = turf.point(point);
    const poly = turf.polygon([polygon]);
    return turf.booleanPointInPolygon(pt, poly);
  }

  /**
   * Calculate area of polygon
   * @param {Array} polygon - Array of [longitude, latitude] pairs
   * @returns {number} - Area in square meters
   */
  calculatePolygonArea(polygon) {
    const poly = turf.polygon([polygon]);
    return turf.area(poly);
  }

  /**
   * Get bounding box for coordinates
   * @param {Array} coordinates - Array of [longitude, latitude] pairs
   * @returns {Object} - Bounding box {minLng, minLat, maxLng, maxLat}
   */
  getBoundingBox(coordinates) {
    const lngs = coordinates.map(c => c[0]);
    const lats = coordinates.map(c => c[1]);

    return {
      minLng: Math.min(...lngs),
      minLat: Math.min(...lats),
      maxLng: Math.max(...lngs),
      maxLat: Math.max(...lats)
    };
  }

  /**
   * Validate coordinates
   * @param {Array} coordinates - [longitude, latitude]
   * @returns {boolean}
   */
  validateCoordinates(coordinates) {
    if (!Array.isArray(coordinates) || coordinates.length !== 2) {
      return false;
    }

    const [lng, lat] = coordinates;
    return lng >= -180 && lng <= 180 && lat >= -90 && lat <= 90;
  }

  /**
   * Calculate bearing between two points
   * @param {Array} point1 - [longitude, latitude]
   * @param {Array} point2 - [longitude, latitude]
   * @returns {number} - Bearing in degrees
   */
  calculateBearing(point1, point2) {
    const from = turf.point(point1);
    const to = turf.point(point2);
    return turf.bearing(from, to);
  }

  /**
   * Get destination point from start point, bearing and distance
   * @param {Array} point - [longitude, latitude]
   * @param {number} distance - Distance in kilometers
   * @param {number} bearing - Bearing in degrees
   * @returns {Array} - Destination point [longitude, latitude]
   */
  getDestination(point, distance, bearing) {
    const from = turf.point(point);
    const destination = turf.destination(from, distance, bearing);
    return destination.geometry.coordinates;
  }

  /**
   * Cluster nearby points
   * @param {Array} points - Array of [longitude, latitude] pairs
   * @param {number} maxDistance - Maximum distance in meters for clustering
   * @returns {Array} - Array of clusters
   */
  clusterPoints(points, maxDistance = 100) {
    const clusters = [];
    const processed = new Set();

    points.forEach((point, index) => {
      if (processed.has(index)) return;

      const cluster = [point];
      processed.add(index);

      points.forEach((otherPoint, otherIndex) => {
        if (processed.has(otherIndex)) return;

        const distance = this.calculateDistance(point, otherPoint);
        if (distance <= maxDistance) {
          cluster.push(otherPoint);
          processed.add(otherIndex);
        }
      });

      clusters.push({
        center: this.calculateCenter(cluster),
        points: cluster,
        count: cluster.length
      });
    });

    return clusters;
  }
}

module.exports = new LocationService();
