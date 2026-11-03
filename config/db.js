import mongoose from 'mongoose';
import httpError from '../utils/httpError.js';

let connecting = null;

// Safe to call on every request: it reuses the open connection.
// That matters on serverless hosts like Vercel, where there is no long-running server.
export default async () => {
  if (mongoose.connection.readyState === 0) connecting = null; // dropped, allow a fresh connect
  if (mongoose.connection.readyState === 1) return;
  if (!process.env.MONGO_URI) throw httpError(500, 'MONGO_URI is not set on the server');

  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 8000 })
      .catch((e) => { connecting = null; throw e; });
  }
  try {
    await connecting;
  } catch (e) {
    console.error('MongoDB connection failed:', e.message);
    throw httpError(503, 'Database connection failed. Check MONGO_URI and the Atlas network access list.');
  }
};
