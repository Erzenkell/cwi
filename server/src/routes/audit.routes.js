import { Router } from 'express';
import { authenticate, requireAdmin } from '../auth.js';
import { query } from '../db.js';

const router = Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 100), 500);

    const result = await query(
      `
      SELECT
        l.id,
        l.action,
        l.entity,
        l.entity_id,
        l.changed_fields,
        l.before_data,
        l.after_data,
        l.created_at,
        u.full_name AS user_name,
        u.email AS user_email
      FROM crm_audit_logs l
      LEFT JOIN crm_app_users u ON u.id = l.user_id
      ORDER BY l.created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    res.json({ logs: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur chargement logs' });
  }
});

export default router;