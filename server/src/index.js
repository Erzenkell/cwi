import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

import { query } from './db.js';
import authRoutes from './routes/auth.routes.js';
import entityRoutes from './routes/entities.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import adminRoutes from './routes/admin.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', async (_, res) => {
  const result = await query('SELECT NOW()');
  res.json({ status: 'ok', dbTime: result.rows[0].now });
});

app.use('/api/auth', authRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`CRM API running on http://localhost:${PORT}`);
});