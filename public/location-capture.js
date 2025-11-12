/**
 * Location Capture Module
 * Handles location capture for surveys and responses
 */

class LocationCapture {
  constructor(options = {}) {
    this.apiUrl = options.apiUrl || 'http://localhost:3001/api/geo';
    this.enableHighAccuracy = options.enableHighAccuracy !== false;
    this.timeout = options.timeout || 10000;
    this.maximumAge = options.maximumAge || 0;
    this.offlineQueue = [];
    this.permissionStatus = 'unknown';
  }

  /**
   * Check if geolocation is supported
   */
  isSupported() {
    return 'geolocation' in navigator;
  }

  /**
   * Request location permission
   */
  async requestPermission() {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' });
      this.permissionStatus = result.state;

      // Listen for permission changes
      result.addEventListener('change', () => {
        this.permissionStatus = result.state;
      });

      return result.state;
    } catch (error) {
      console.warn('Permission query not supported, will prompt on request');
      return 'prompt';
    }
  }

  /**
   * Get current location
   */
  getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Geolocation not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            coordinates: [position.coords.longitude, position.coords.latitude],
            accuracy: position.coords.accuracy,
            timestamp: new Date(position.timestamp)
          });
        },
        (error) => {
          let errorMessage = 'Location access denied';

          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location permission denied';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }

          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: this.enableHighAccuracy,
          timeout: this.timeout,
          maximumAge: this.maximumAge
        }
      );
    });
  }

  /**
   * Watch location changes
   */
  watchLocation(callback, errorCallback) {
    if (!this.isSupported()) {
      if (errorCallback) errorCallback(new Error('Geolocation not supported'));
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        callback({
          coordinates: [position.coords.longitude, position.coords.latitude],
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp)
        });
      },
      (error) => {
        if (errorCallback) errorCallback(error);
      },
      {
        enableHighAccuracy: this.enableHighAccuracy,
        timeout: this.timeout,
        maximumAge: this.maximumAge
      }
    );

    return watchId;
  }

  /**
   * Stop watching location
   */
  clearWatch(watchId) {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Capture and save location for a survey
   */
  async captureSurveyLocation(surveyId, additionalData = {}) {
    try {
      const location = await this.getCurrentLocation();

      const locationData = {
        coordinates: location.coordinates,
        type: 'survey',
        entityId: surveyId,
        accuracy: location.accuracy,
        ...additionalData
      };

      // Save location to API
      const saved = await this.saveLocation(locationData);

      return {
        success: true,
        location: saved.location,
        message: 'Survey location captured successfully'
      };
    } catch (error) {
      console.error('Survey location capture error:', error);

      // If offline, queue for later
      if (!navigator.onLine) {
        this.queueOfflineLocation({
          type: 'survey',
          entityId: surveyId,
          ...additionalData
        });

        return {
          success: false,
          offline: true,
          message: 'Queued for sync when online'
        };
      }

      throw error;
    }
  }

  /**
   * Capture and save location for a response
   */
  async captureResponseLocation(surveyId, responseId, additionalData = {}) {
    try {
      const location = await this.getCurrentLocation();

      const locationData = {
        coordinates: location.coordinates,
        type: 'response',
        entityId: responseId,
        accuracy: location.accuracy,
        metadata: {
          surveyId: surveyId,
          ...additionalData
        }
      };

      // Save location to API
      const saved = await this.saveLocation(locationData);

      return {
        success: true,
        location: saved.location,
        message: 'Response location captured successfully'
      };
    } catch (error) {
      console.error('Response location capture error:', error);

      // If offline, queue for later
      if (!navigator.onLine) {
        this.queueOfflineLocation({
          type: 'response',
          entityId: responseId,
          metadata: { surveyId, ...additionalData }
        });

        return {
          success: false,
          offline: true,
          message: 'Queued for sync when online'
        };
      }

      throw error;
    }
  }

  /**
   * Save location to API
   */
  async saveLocation(locationData) {
    const response = await fetch(`${this.apiUrl}/location`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(locationData)
    });

    if (!response.ok) {
      throw new Error('Failed to save location');
    }

    return await response.json();
  }

  /**
   * Queue location for offline sync
   */
  queueOfflineLocation(locationData) {
    this.offlineQueue.push({
      ...locationData,
      queuedAt: new Date().toISOString()
    });

    // Save to localStorage
    localStorage.setItem('locationQueue', JSON.stringify(this.offlineQueue));
  }

  /**
   * Sync offline queue when back online
   */
  async syncOfflineQueue() {
    // Load from localStorage
    const stored = localStorage.getItem('locationQueue');
    if (stored) {
      this.offlineQueue = JSON.parse(stored);
    }

    if (this.offlineQueue.length === 0) {
      return { synced: 0, failed: 0 };
    }

    const results = {
      synced: 0,
      failed: 0,
      errors: []
    };

    for (const queuedLocation of this.offlineQueue) {
      try {
        // Get current location again
        const location = await this.getCurrentLocation();

        const locationData = {
          ...queuedLocation,
          coordinates: location.coordinates,
          accuracy: location.accuracy
        };

        await this.saveLocation(locationData);
        results.synced++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          location: queuedLocation,
          error: error.message
        });
      }
    }

    // Clear queue if all synced
    if (results.failed === 0) {
      this.offlineQueue = [];
      localStorage.removeItem('locationQueue');
    } else {
      // Keep failed items in queue
      this.offlineQueue = results.errors.map(e => e.location);
      localStorage.setItem('locationQueue', JSON.stringify(this.offlineQueue));
    }

    return results;
  }

  /**
   * Get reverse geocoded address
   */
  async getAddress(coordinates) {
    try {
      const response = await fetch(`${this.apiUrl}/reverse-geocode`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ coordinates })
      });

      if (!response.ok) {
        throw new Error('Failed to get address');
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      return null;
    }
  }

  /**
   * Create location capture UI widget
   */
  createCaptureWidget(options = {}) {
    const {
      containerId = 'location-capture-widget',
      onCapture = null,
      showMap = true,
      showAddress = true
    } = options;

    const container = document.getElementById(containerId);
    if (!container) {
      console.error('Container not found:', containerId);
      return;
    }

    const widget = document.createElement('div');
    widget.className = 'location-capture-widget';
    widget.innerHTML = `
      <style>
        .location-capture-widget {
          padding: 20px;
          border: 2px solid #ddd;
          border-radius: 8px;
          background: white;
          margin: 15px 0;
        }

        .location-status {
          display: flex;
          align-items: center;
          margin-bottom: 15px;
          padding: 12px;
          border-radius: 6px;
          font-size: 14px;
        }

        .location-status.pending {
          background: #fff3cd;
          color: #856404;
        }

        .location-status.capturing {
          background: #d1ecf1;
          color: #0c5460;
        }

        .location-status.success {
          background: #d4edda;
          color: #155724;
        }

        .location-status.error {
          background: #f8d7da;
          color: #721c24;
        }

        .location-status-icon {
          margin-right: 10px;
          font-size: 18px;
        }

        .location-details {
          margin-top: 15px;
          padding: 12px;
          background: #f8f9fa;
          border-radius: 6px;
          font-size: 13px;
          display: none;
        }

        .location-details.show {
          display: block;
        }

        .location-detail-row {
          margin: 5px 0;
        }

        .location-detail-label {
          font-weight: 600;
          color: #666;
        }

        .capture-button {
          width: 100%;
          padding: 12px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s;
        }

        .capture-button:hover {
          transform: translateY(-2px);
        }

        .capture-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .location-map {
          height: 200px;
          margin-top: 15px;
          border-radius: 6px;
          overflow: hidden;
          display: none;
        }

        .location-map.show {
          display: block;
        }
      </style>

      <div class="location-status pending">
        <span class="location-status-icon">📍</span>
        <span class="location-status-text">Ready to capture location</span>
      </div>

      <button class="capture-button" onclick="captureCurrentLocation()">
        Capture Location
      </button>

      <div class="location-details" id="location-details">
        <div class="location-detail-row">
          <span class="location-detail-label">Coordinates:</span>
          <span id="location-coords">-</span>
        </div>
        <div class="location-detail-row">
          <span class="location-detail-label">Accuracy:</span>
          <span id="location-accuracy">-</span>
        </div>
        ${showAddress ? `
        <div class="location-detail-row">
          <span class="location-detail-label">Address:</span>
          <span id="location-address">Loading...</span>
        </div>
        ` : ''}
      </div>

      ${showMap ? '<div class="location-map" id="location-map"></div>' : ''}
    `;

    container.appendChild(widget);

    // Expose capture function globally for the button onclick
    window.captureCurrentLocation = async () => {
      const button = widget.querySelector('.capture-button');
      const status = widget.querySelector('.location-status');
      const statusText = widget.querySelector('.location-status-text');
      const statusIcon = widget.querySelector('.location-status-icon');
      const details = widget.querySelector('.location-details');

      try {
        button.disabled = true;
        status.className = 'location-status capturing';
        statusIcon.textContent = '⏳';
        statusText.textContent = 'Capturing location...';

        const location = await this.getCurrentLocation();

        // Update UI
        status.className = 'location-status success';
        statusIcon.textContent = '✓';
        statusText.textContent = 'Location captured successfully';

        details.classList.add('show');
        document.getElementById('location-coords').textContent =
          `${location.coordinates[1].toFixed(6)}, ${location.coordinates[0].toFixed(6)}`;
        document.getElementById('location-accuracy').textContent =
          `±${Math.round(location.accuracy)}m`;

        // Get address if enabled
        if (showAddress) {
          const address = await this.getAddress(location.coordinates);
          if (address) {
            document.getElementById('location-address').textContent =
              address.address || 'Address not available';
          }
        }

        // Show map if enabled
        if (showMap) {
          const mapDiv = document.getElementById('location-map');
          mapDiv.classList.add('show');

          // Initialize small map
          const miniMap = L.map('location-map').setView(
            [location.coordinates[1], location.coordinates[0]],
            15
          );

          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(miniMap);

          L.marker([location.coordinates[1], location.coordinates[0]])
            .addTo(miniMap);
        }

        // Call callback
        if (onCapture) {
          onCapture(location);
        }

      } catch (error) {
        status.className = 'location-status error';
        statusIcon.textContent = '✗';
        statusText.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    };

    return widget;
  }
}

// Auto-sync on coming back online
if (typeof window !== 'undefined') {
  const locationCapture = new LocationCapture();

  window.addEventListener('online', () => {
    locationCapture.syncOfflineQueue().then(results => {
      if (results.synced > 0) {
        console.log(`Synced ${results.synced} offline locations`);
      }
    });
  });
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = LocationCapture;
}
