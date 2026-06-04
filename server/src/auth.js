import jwt from 'jsonwebtoken';

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