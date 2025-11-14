const mongoose = require('mongoose');

class Database {
  constructor() {
    this.connection = null;
  }

  async connect() {
    // Connect to the admin_service database where audit logs are stored
    const mongoUri = process.env.MONGODB_URI || 'mongodb://mongodb:27017/admin_service';
    const maxRetries = 10;
    const retryDelay = 5000; // 5 seconds

    const options = {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4
    };

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Connecting to MongoDB... (attempt ${attempt}/${maxRetries})`);
        this.connection = await mongoose.connect(mongoUri, options);

        console.log('✅ MongoDB connected successfully');
        console.log(`📊 Database: ${this.connection.connection.name}`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
          console.error('❌ MongoDB connection error:', err);
        });

        mongoose.connection.on('disconnected', () => {
          console.warn('⚠️  MongoDB disconnected');
        });

        mongoose.connection.on('reconnected', () => {
          console.log('✅ MongoDB reconnected');
        });

        return this.connection;
      } catch (error) {
        console.error(`❌ MongoDB connection attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          console.log(`Retrying in ${retryDelay / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          console.error('❌ MongoDB connection failed after all retries');
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
