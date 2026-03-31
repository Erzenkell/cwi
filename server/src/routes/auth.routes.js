import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';

const router = Router();

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const result = await query('SELECT id, email, password_hash, role, full_name FROM users WHERE email = $1', [email]);
  const user = result.rows[0];

  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const isValid = await bcrypt.compare(password, user.password_hash);
  if (!isValid) return res.status(401).json({ message: 'Invalid credentials' });

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, fullName: user.full_name },
    process.env.JWT_SECRET || 'change-me-in-production',
    { expiresIn: '8h' },
  );

  res.json({ token, user: { id: user.id, email: user.email, role: user.role, fullName: user.full_name } });
});

export default router;
