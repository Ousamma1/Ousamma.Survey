import mongoose from 'mongoose';
import winston from 'winston';
import { config } from '../config';

export const connectDatabase = async (logger: winston.Logger): Promise<void> => {
  try {
    mongoose.set('strictQuery', false);

    await mongoose.connect(config.mongo.uri, {
      dbName: config.mongo.dbName
    });

    logger.info(`✅ Connected to MongoDB: ${config.mongo.dbName}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    throw error;
  }
};

export const disconnectDatabase = async (logger: winston.Logger): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('Disconnected from MongoDB');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};
