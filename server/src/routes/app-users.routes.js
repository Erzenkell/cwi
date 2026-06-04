import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { authenticate, requireAdmin } from '../auth.js';
import { query } from '../db.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', async (_req, res) => {
  const result = await query(`
    SELECT
      id,
      email,
      role,
      full_name,
      created_at
    FROM crm_app_users
    ORDER BY id ASC
  `);

  res.json({ users: result.rows });
});

router.post('/', async (req, res) => {
  try {
    const { email, password, role, full_name } = req.body;

    if (!email || !password || !role || !full_name) {
      return res.status(400).json({
        message: 'email, password, role et full_name sont obligatoires',
      });
    }

    if (!['employee', 'admin'].includes(role)) {
      return res.status(400).json({
        message: 'Rôle invalide',
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await query(
      `
      INSERT INTO crm_app_users (
        email,
        password_hash,
        role,
        full_name
      )
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, role, full_name, created_at
      `,
      [email, passwordHash, role, full_name]
    );

    res.status(201).json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Cet email existe déjà' });
    }

    console.error(err);
    res.status(500).json({ message: 'Erreur création utilisateur' });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { email, role, full_name, password } = req.body;

    const updates = [];
    const values = [];

    if (email !== undefined) {
      values.push(email);
      updates.push(`email = $${values.length}`);
    }

    if (role !== undefined) {
      if (!['employee', 'admin'].includes(role)) {
        return res.status(400).json({ message: 'Rôle invalide' });
      }

      values.push(role);
      updates.push(`role = $${values.length}`);
    }

    if (full_name !== undefined) {
      values.push(full_name);
      updates.push(`full_name = $${values.length}`);
    }

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      values.push(passwordHash);
      updates.push(`password_hash = $${values.length}`);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Aucune donnée à modifier' });
    }

    values.push(req.params.id);

    const result = await query(
      `
      UPDATE crm_app_users
      SET ${updates.join(', ')}
      WHERE id = $${values.length}
      RETURNING id, email, role, full_name, created_at
      `,
      values
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur modification utilisateur' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    if (Number(req.params.id) === Number(req.user.sub)) {
      return res.status(400).json({
        message: 'Tu ne peux pas supprimer ton propre compte',
      });
    }

    const result = await query(
      `
      DELETE FROM crm_app_users
      WHERE id = $1
      RETURNING id
      `,
      [req.params.id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur suppression utilisateur' });
  }
});

export default router;