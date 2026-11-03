// api/index.js
import 'dotenv/config';
import app from '../app.js';
import connectDB from '../config/db.js';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    return res.status(503).json({
      message: 'Database unavailable',
      error: process.env.NODE_ENV !== 'production' ? err.message : undefined,
    });
  }
  return app(req, res);
}