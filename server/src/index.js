import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from './db.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'change-me-in-production';

app.use(cors());
app.use(express.json());

function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }

  try {
    const token = auth.split(' ')[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

app.get('/api/health', async (_, res) => {
  const result = await query('SELECT NOW()');
  res.json({ status: 'ok', dbTime: result.rows[0].now });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const result = await query('SELECT id, email, password_hash, role, full_name FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, fullName: user.full_name },
    JWT_SECRET,
    { expiresIn: '8h' },
  );

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    },
  });
});

app.get('/api/navigation', authenticate, (req, res) => {
  const byRole = {
    employee: ['COMPTES', 'CONTACTS', 'OPPORTUNITÉS', 'SOUS-TRAITANT'],
    admin: ['PISTES', 'FACTURES', 'SYNTHÈSE', 'MEILLEURS CLIENTS'],
  };

  res.json({ tabs: byRole[req.user.role] || [] });
});

app.get('/api/seed-data', authenticate, async (req, res) => {
  const tables = ['accounts', 'contacts', 'opportunities', 'subcontractors', 'leads', 'invoices'];
  const payload = {};

  for (const table of tables) {
    const result = await query(`SELECT * FROM ${table} ORDER BY id ASC LIMIT 25`);
    payload[table] = result.rows;
  }

  res.json(payload);
});

app.listen(PORT, () => {
  console.log(`CRM API running on http://localhost:${PORT}`);
});
