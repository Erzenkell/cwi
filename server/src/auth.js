import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Missing bearer token' });
  }

  try {
    const token = auth.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'change-me-in-production');
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
}
