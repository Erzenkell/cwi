import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db.js';
import authRoutes from './routes/auth.routes.js';
import entityRoutes from './routes/entities.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import adminRoutes from './routes/admin.routes.js';
import invoicesRoutes from './modules/invoices/invoices.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.get('/api/health', async (_, res) => {
  const result = await query('SELECT NOW()');
  res.json({ status: 'ok', dbTime: result.rows[0].now });
});

app.use('/api/auth', authRoutes);
app.use('/api/entities', entityRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/invoices', invoicesRoutes);

app.listen(PORT, () => {
  console.log(`CRM API running on http://localhost:${PORT}`);
});
