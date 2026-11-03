import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

const app = express();

// Browsers allowed to call this API: CLIENT_URL (comma separated) plus local dev servers.
// If CLIENT_URL is not set, any origin is allowed.
const devOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:4173'];
const isAllowed = (origin) => {
  const allowed = (process.env.CLIENT_URL || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
  return !origin || !allowed.length || allowed.includes(origin) || devOrigins.includes(origin);
};

// CORS runs first so even errors and preflight (OPTIONS) requests carry the right headers.
app.use(cors({ origin: (origin, callback) => callback(null, isAllowed(origin)) }));
app.use((req, res, next) =>
  isAllowed(req.headers.origin) ? next() : res.status(403).json({ message: 'This website is not allowed to use the API' })
);
app.use(express.json());

// Open this URL in the browser to check the deployment: /api/health
app.get('/api/health', (req, res) =>
  res.json({ ok: true, db: mongoose.connection.readyState === 1 ? 'connected' : 'not connected yet' })
);

// Connect to MongoDB on the first request (works for a normal server and for Vercel).
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (e) {
    next(e);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/contact', contactRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
