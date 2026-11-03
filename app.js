import express from 'express';
import cors from 'cors';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/authRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import contactRoutes from './routes/contactRoutes.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || true }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/contact', contactRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
