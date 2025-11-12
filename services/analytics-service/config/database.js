const mongoose = require('mongoose');

/**
 * Database connection manager for Analytics Service
 * Singleton pattern to ensure only one connection instance
 */
class Database {
  constructor() {
    this.connection = null;
  }

  /**
   * Connect to MongoDB
   */
  async connect() {
    try {
      const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/analytics';

      const options = {
        maxPoolSize: 10,
        minPoolSize: 2,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 5000,
        family: 4
      };

      console.log('Connecting to MongoDB...');
      this.connection = await mongoose.connect(mongoUri, options);

      console.log('MongoDB connected successfully');
      console.log(`Database: ${this.connection.connection.name}`);

      // Connection event handlers
      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected');
      });

      mongoose.connection.on('reconnected', () => {
        console.log('MongoDB reconnected');
      });

      return this.connection;
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  /**
   * Disconnect from MongoDB
   */
  async disconnect() {
    try {
      if (this.connection) {
        await mongoose.disconnect();
        this.connection = null;
        console.log('MongoDB disconnected successfully');
      }
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
      throw error;
    }
  }

  /**
   * Check if connected to MongoDB
   */
  isConnected() {
    return mongoose.connection.readyState === 1;
  }

  /**
   * Get connection instance
   */
  getConnection() {
    return this.connection;
  }
}

// Export singleton instance
module.exports = new Database();
