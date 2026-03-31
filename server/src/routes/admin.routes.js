import { Router } from 'express';
import { authenticate, requireAdmin } from '../auth.js';
import { query } from '../db.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/users', async (_req, res) => {
  const result = await query(`
    SELECT u.full_name AS name, u.email, u.role, COALESCE(g.name, 'Non assigné') AS group_name
    FROM users u
    LEFT JOIN groups g ON g.id = u.group_id
    ORDER BY u.id ASC
  `);
  res.json({ users: result.rows.map((row) => ({ name: row.name, email: row.email, role: row.role, group: row.group_name })) });
});

router.get('/groups', async (_req, res) => {
  const result = await query(`
    SELECT g.name, g.description, COUNT(u.id)::int AS members
    FROM groups g
    LEFT JOIN users u ON u.group_id = g.id
    GROUP BY g.id
    ORDER BY g.id ASC
  `);
  res.json({ groups: result.rows });
});

export default router;
