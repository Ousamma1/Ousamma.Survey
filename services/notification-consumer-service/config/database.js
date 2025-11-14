const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/notifications';
    const maxRetries = 10;
    const retryDelay = 5000; // 5 seconds

    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Connecting to MongoDB... (attempt ${attempt}/${maxRetries})`);
        this.connection = await mongoose.connect(mongoUri, options);

        console.log('✓ MongoDB connected successfully');
        console.log(`  Database: ${mongoose.connection.name}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
          console.error('MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
          console.warn('MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
          console.log('✓ MongoDB reconnected');
        });

        return this.connection;
      } catch (error) {
        console.error(`MongoDB connection attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          console.log(`Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.error('Failed to connect to MongoDB after all retries');
          throw error;
        }
      }
    }
  }

  async disconnect() {
    if (this.connection) {
      await mongoose.disconnect();
      console.log('MongoDB disconnected');
    }
  }

  isConnected() {
    return mongoose.connection.readyState === 1;
  }
}

module.exports = new Database();
