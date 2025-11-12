const NodeGeocoder = require('node-geocoder');

class GeocodingService {
  constructor() {
    const options = {
      provider: process.env.GEOCODER_PROVIDER || 'openstreetmap',
      httpAdapter: 'https',
      formatter: null
    };

    // Add API key if provider requires it
    if (process.env.GEOCODER_API_KEY) {
      options.apiKey = process.env.GEOCODER_API_KEY;
    }

    this.geocoder = NodeGeocoder(options);
  }

  /**
   * Convert address to coordinates (Geocoding)
   * @param {string} address - The address to geocode
   * @returns {Promise<Object>} - Coordinates and location details
   */
  async geocode(address) {
    try {
      const results = await this.geocoder.geocode(address);

      if (!results || results.length === 0) {
        throw new Error('Address not found');
      }

      const location = results[0];

      return {
        coordinates: [location.longitude, location.latitude],
        address: location.formattedAddress,
        metadata: {
          country: location.country,
          countryCode: location.countryCode,
          city: location.city,
          state: location.state,
          stateCode: location.stateCode,
          postalCode: location.zipcode,
          streetName: location.streetName,
          streetNumber: location.streetNumber,
          formattedAddress: location.formattedAddress
        }
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error(`Geocoding failed: ${error.message}`);
    }
  }

  /**
   * Convert coordinates to address (Reverse Geocoding)
   * @param {number} latitude - Latitude
   * @param {number} longitude - Longitude
   * @returns {Promise<Object>} - Address details
   */
  async reverseGeocode(latitude, longitude) {
    try {
      const results = await this.geocoder.reverse({
        lat: latitude,
        lon: longitude
      });

      if (!results || results.length === 0) {
        throw new Error('Location not found');
      }

      const location = results[0];

      return {
        address: location.formattedAddress,
        metadata: {
          country: location.country,
          countryCode: location.countryCode,
          city: location.city,
          state: location.state,
          stateCode: location.stateCode,
          postalCode: location.zipcode,
          streetName: location.streetName,
          streetNumber: location.streetNumber,
          formattedAddress: location.formattedAddress
        }
      };
    } catch (error) {
      console.error('Reverse geocoding error:', error);
      throw new Error(`Reverse geocoding failed: ${error.message}`);
    }
  }

  /**
   * Batch geocode multiple addresses
   * @param {Array<string>} addresses - Array of addresses to geocode
   * @returns {Promise<Array>} - Array of geocoded locations
   */
  async batchGeocode(addresses) {
    const results = [];

    for (const address of addresses) {
      try {
        const result = await this.geocode(address);
        results.push({ success: true, address, result });
      } catch (error) {
        results.push({ success: false, address, error: error.message });
      }
    }

    return results;
  }
}

module.exports = new GeocodingService();
