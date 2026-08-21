import mongoose from 'mongoose';
import { tryCatch } from '../utlis/tryCatch.js';

export const connectToDatabase = async () => {
  const { data, error } = await tryCatch(() => mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/live-docs', {
    maxPoolSize: 10,
    minPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  }));
if (error) {
  console.error('Error connecting to MongoDB:', error);
  process.exit(1);
}
// `data` is now narrowed to non-null here
console.log('Connected to MongoDB');
}