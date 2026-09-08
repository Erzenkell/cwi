import jwt from 'jsonwebtoken';
import { query } from './db.js';

export function authenticate(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing token' });
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || 'change-me-in-production'
    );

    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs' });
  }

  next();
}

export function requireTabAccess(tabKey) {
  return async (req, res, next) => {
    try {
      if (req.user?.role === 'admin') {
        return next();
      }

      const result = await query(
        `
        SELECT 1
        FROM crm_app_user_tab_permissions
        WHERE user_id = $1
          AND tab_key = $2
          AND can_access = true
        LIMIT 1
        `,
        [req.user.sub, tabKey]
      );

      if (!result.rows.length) {
        return res.status(403).json({
          message: `Accès interdit à l'onglet ${tabKey}`,
        });
      }

      next();
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erreur vérification permission' });
    }
  };
}