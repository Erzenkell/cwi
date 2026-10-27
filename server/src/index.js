import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import { query } from './db.js';
import authRoutes from './routes/auth.routes.js';
import entityRoutes from './routes/entities.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import recordRoutes from './routes/records.routes.js';
import appUsersRoutes from './routes/app-users.routes.js';
import quotesRoutes from './routes/quotes.routes.js';
import auditRoutes from './routes/audit.routes.js';
import invoiceDocumentsRoutes from './routes/invoice-documents.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsOptions = {
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin not allowed by CORS'));
  },
  credentials: true,
  exposedHeaders: ['Content-Disposition'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', async (_, res) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'error', message: 'Database unavailable' });
  }
});

app.use('/api/quotes', quotesRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/records', recordRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/app-users', appUsersRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/invoice-documents', invoiceDocumentsRoutes);

app.listen(PORT, '::', () => {
  console.log(`CRM API running on port ${PORT}`);
});