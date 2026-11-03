import mongoose from 'mongoose';

// Global cache — serverless container ke andar reuse hota hai
let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

export default async function connectDB() {
  // 1. Already connected? wahi return karo
  if (cached.conn) return cached.conn;

  // 2. Connection in progress? usi promise ka intezaar karo
  if (!cached.promise) {
    cached.promise = mongoose.connect(process.env.MONGO_URI, {
      bufferCommands: false,          // fail-fast: DB na ho toh commands queue na karein
      serverSelectionTimeoutMS: 10000, // 10s mein fail ho jaye, Vercel ke 10s limit se pehle
    });
  }

  try {
    cached.conn = await cached.promise;
    console.log('✅ MongoDB connected');
    return cached.conn;
  } catch (err) {
    cached.promise = null;            // aglay attempt par retry ho sake
    console.error('❌ MongoDB connection failed:', err.message);
    throw err;                        // ⚠️ exit NAHI — caller ko error do
  }
}