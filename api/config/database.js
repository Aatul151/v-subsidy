import mongoose from 'mongoose';
import logger from './logger.js';
import { initDefaultUsers } from '../utils/initDefaultUsers.js';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    logger.info('MongoDB Connected');

    // Initialize default users after successful connection
    await initDefaultUsers();
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

