/**
 * Map Service - Client library for Leaflet.js and OpenStreetMap integration
 * Provides comprehensive mapping functionality for the survey application
 */

class MapService {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'http://localhost:3001/api/geo';
    this.defaultCenter = options.defaultCenter || [25.2048, 55.2708]; // Dubai coordinates
    this.defaultZoom = options.defaultZoom || 12;
    this.maps = new Map(); // Store multiple map instances
  }

  /**
   * Initialize a map in a container
   * @param {string} containerId - DOM element ID for the map
   * @param {Object} options - Map configuration options
   * @returns {Object} - Leaflet map instance
   */
  initMap(containerId, options = {}) {
    const center = options.center || this.defaultCenter;
    const zoom = options.zoom || this.defaultZoom;

    // Create map instance
    const map = L.map(containerId, {
      center: center,
      zoom: zoom,
      zoomControl: options.zoomControl !== false,
      scrollWheelZoom: options.scrollWheelZoom !== false
    });

    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(map);

    // Store map instance
    this.maps.set(containerId, {
      map: map,
      markers: [],
      layers: {},
      clusters: null
    });

    return map;
  }

  /**
   * Get map instance by container ID
   */
  getMap(containerId) {
    const mapData = this.maps.get(containerId);
    return mapData ? mapData.map : null;
  }

  /**
   * Add a marker to the map
   * @param {string} containerId - Map container ID
   * @param {Object} markerData - Marker configuration
   */
  addMarker(containerId, markerData) {
    const mapData = this.maps.get(containerId);
    if (!mapData) return null;

    const { coordinates, popup, type, icon } = markerData;
    const [lng, lat] = coordinates;

    // Create custom icon based on type
    const markerIcon = this.createMarkerIcon(type, icon);

    // Create marker
    const marker = L.marker([lat, lng], { icon: markerIcon });

    // Add popup if provided
    if (popup) {
      marker.bindPopup(popup);
    }

    // Add to map
    marker.addTo(mapData.map);

    // Store marker reference
    mapData.markers.push({
      marker: marker,
      data: markerData
    });

    return marker;
  }

  /**
   * Create custom marker icon
   */
  createMarkerIcon(type, customIcon) {
    if (customIcon) {
      return L.icon(customIcon);
    }

    // Default icons based on type
    const iconColors = {
      survey: '#3388ff',
      response: '#28a745',
      surveyor: '#ff7800'
    };

    const color = iconColors[type] || '#3388ff';

    return L.divIcon({
      className: 'custom-marker',
      html: `<div style="background-color: ${color}; width: 25px; height: 25px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
      iconSize: [25, 25],
      iconAnchor: [12, 12]
    });
  }

  /**
   * Add multiple markers with clustering
   * @param {string} containerId - Map container ID
   * @param {Array} markersData - Array of marker configurations
   */
  addMarkerCluster(containerId, markersData) {
    const mapData = this.maps.get(containerId);
    if (!mapData) return;

    // Create marker cluster group
    const markers = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true
    });

    // Add markers to cluster
    markersData.forEach(markerData => {
      const { coordinates, popup, type } = markerData;
      const [lng, lat] = coordinates;

      const marker = L.marker([lat, lng], {
        icon: this.createMarkerIcon(type)
      });

      if (popup) {
        marker.bindPopup(popup);
      }

      markers.addLayer(marker);
    });

    // Add cluster to map
    mapData.map.addLayer(markers);
    mapData.clusters = markers;
  }

  /**
   * Draw a territory polygon on the map
   * @param {string} containerId - Map container ID
   * @param {Object} territoryData - Territory configuration
   */
  drawTerritory(containerId, territoryData) {
    const mapData = this.maps.get(containerId);
    if (!mapData) return null;

    const { polygon, name, color, popup } = territoryData;

    // Convert coordinates [lng, lat] to [lat, lng] for Leaflet
    const latLngs = polygon.map(coord => [coord[1], coord[0]]);

    // Create polygon
    const territoryPolygon = L.polygon(latLngs, {
      color: color || '#3388ff',
      fillColor: color || '#3388ff',
      fillOpacity: 0.2,
      weight: 2
    });

    // Add popup if provided
    if (popup || name) {
      territoryPolygon.bindPopup(popup || `<strong>${name}</strong>`);
    }

    // Add to map
    territoryPolygon.addTo(mapData.map);

    // Store in layers
    if (!mapData.layers.territories) {
      mapData.layers.territories = [];
    }
    mapData.layers.territories.push({
      polygon: territoryPolygon,
      data: territoryData
    });

    return territoryPolygon;
  }

  /**
   * Create a drawing control for territories
   * @param {string} containerId - Map container ID
   * @param {Function} onDrawComplete - Callback when drawing is complete
   */
  enableTerritoryDrawing(containerId, onDrawComplete) {
    const mapData = this.maps.get(containerId);
    if (!mapData) return;

    // Create feature group for drawn items
    const drawnItems = new L.FeatureGroup();
    mapData.map.addLayer(drawnItems);

    // Create draw control
    const drawControl = new L.Control.Draw({
      edit: {
        featureGroup: drawnItems
      },
      draw: {
        polygon: {
          allowIntersection: false,
          showArea: true,
          drawError: {
            color: '#e74c3c',
            message: '<strong>Error:</strong> shape edges cannot cross!'
          }
        },
        polyline: false,
        circle: false,
        rectangle: true,
        marker: false,
        circlemarker: false
      }
    });

    mapData.map.addControl(drawControl);

    // Handle draw complete event
    mapData.map.on(L.Draw.Event.CREATED, (event) => {
      const layer = event.layer;
      drawnItems.addLayer(layer);

      // Get coordinates
      const coordinates = layer.getLatLngs()[0].map(latLng => [
        latLng.lng,
        latLng.lat
      ]);

      // Close the polygon
      coordinates.push(coordinates[0]);

      if (onDrawComplete) {
        onDrawComplete(coordinates);
      }
    });

    mapData.layers.drawnItems = drawnItems;
  }

  /**
   * Create a heat map layer
   * @param {string} containerId - Map container ID
   * @param {Array} points - Array of [lat, lng, intensity]
   */
  createHeatmap(containerId, points) {
    const mapData = this.maps.get(containerId);
    if (!mapData) return;

    // Convert [lng, lat] to [lat, lng] for Leaflet
    const heatPoints = points.map(point => [point[1], point[0], point[2] || 1]);

    const heat = L.heatLayer(heatPoints, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      gradient: {
        0.0: 'blue',
        0.5: 'yellow',
        1.0: 'red'
      }
    });

    heat.addTo(mapData.map);
    mapData.layers.heatmap = heat;
  }

  /**
   * Fit map bounds to show all markers
   */
  fitBounds(containerId) {
    const mapData = this.maps.get(containerId);
    if (!mapData || mapData.markers.length === 0) return;

    const bounds = L.latLngBounds(
      mapData.markers.map(m => m.marker.getLatLng())
    );

    mapData.map.fitBounds(bounds, { padding: [50, 50] });
  }

  /**
   * Clear all markers from the map
   */
  clearMarkers(containerId) {
    const mapData = this.maps.get(containerId);
    if (!mapData) return;

    mapData.markers.forEach(m => mapData.map.removeLayer(m.marker));
    mapData.markers = [];

    if (mapData.clusters) {
      mapData.map.removeLayer(mapData.clusters);
      mapData.clusters = null;
    }
  }

  /**
   * Clear all territories from the map
   */
  clearTerritories(containerId) {
    const mapData = this.maps.get(containerId);
    if (!mapData || !mapData.layers.territories) return;

    mapData.layers.territories.forEach(t => mapData.map.removeLayer(t.polygon));
    mapData.layers.territories = [];
  }

  /**
   * API Methods - Interact with geolocation service
   */

  async saveLocation(locationData) {
    const response = await fetch(`${this.apiUrl}/location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(locationData)
    });

    if (!response.ok) {
      throw new Error('Failed to save location');
    }

    return await response.json();
  }

  async getLocation(id) {
    const response = await fetch(`${this.apiUrl}/location/${id}`);

    if (!response.ok) {
      throw new Error('Failed to get location');
    }

    return await response.json();
  }

  async geocode(address) {
    const response = await fetch(`${this.apiUrl}/geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address })
    });

    if (!response.ok) {
      throw new Error('Geocoding failed');
    }

    return await response.json();
  }

  async reverseGeocode(coordinates) {
    const response = await fetch(`${this.apiUrl}/reverse-geocode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates })
    });

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    return await response.json();
  }

  async findNearby(coordinates, radius, type) {
    const response = await fetch(`${this.apiUrl}/nearby`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ coordinates, radius, type })
    });

    if (!response.ok) {
      throw new Error('Failed to find nearby locations');
    }

    return await response.json();
  }

  async createTerritory(territoryData) {
    const response = await fetch(`${this.apiUrl}/territory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(territoryData)
    });

    if (!response.ok) {
      throw new Error('Failed to create territory');
    }

    return await response.json();
  }

  async getTerritories() {
    const response = await fetch(`${this.apiUrl}/territories`);

    if (!response.ok) {
      throw new Error('Failed to get territories');
    }

    return await response.json();
  }

  async getLocationsInTerritory(territoryId) {
    const response = await fetch(`${this.apiUrl}/territory/${territoryId}/locations`);

    if (!response.ok) {
      throw new Error('Failed to get locations in territory');
    }

    return await response.json();
  }

  /**
   * Utility: Get current user location
   */
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            coordinates: [position.coords.longitude, position.coords.latitude],
            accuracy: position.coords.accuracy
          });
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );
    });
  }

  /**
   * Utility: Request location permission
   */
  async requestLocationPermission() {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      return result.state; // 'granted', 'denied', or 'prompt'
    } catch (error) {
      console.error('Permission query failed:', error);
      return 'unknown';
    }
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MapService;
}
