import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { query } from '../db.js';

const router = Router();

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_DAYS = 30;

function signAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    },
    process.env.JWT_SECRET || 'change-me-in-production',
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function createRefreshToken() {
  return crypto.randomBytes(64).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getRefreshExpiry() {
  const date = new Date();
  date.setDate(date.getDate() + REFRESH_TOKEN_DAYS);
  return date;
}

function setRefreshCookie(res, refreshToken) {
  res.cookie('crm_refresh_token', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
    path: '/api/auth',
  });
}

function clearRefreshCookie(res) {
  res.clearCookie('crm_refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path: '/api/auth',
  });
}

async function createSession(req, res, user) {
  const refreshToken = createRefreshToken();
  const refreshTokenHash = hashToken(refreshToken);

  await query(
    `
    INSERT INTO crm_app_sessions (
      user_id,
      refresh_token_hash,
      user_agent,
      ip_address,
      expires_at
    )
    VALUES ($1, $2, $3, $4, $5)
    `,
    [
      user.id,
      refreshTokenHash,
      req.headers['user-agent'] || null,
      req.ip || null,
      getRefreshExpiry(),
    ]
  );

  setRefreshCookie(res, refreshToken);
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const result = await query(
    `
    SELECT id, email, password_hash, role, full_name
    FROM crm_app_users
    WHERE email = $1
    `,
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const isValid = await bcrypt.compare(password, user.password_hash);

  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  await createSession(req, res, user);

  const accessToken = signAccessToken(user);

  res.json({
    token: accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    },
  });
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.crm_refresh_token;

  if (!refreshToken) {
    return res.status(401).json({ message: 'No session' });
  }

  const refreshTokenHash = hashToken(refreshToken);

  const result = await query(
    `
    SELECT
      s.id AS session_id,
      s.expires_at,
      s.revoked_at,
      u.id AS user_id,
      u.email,
      u.role,
      u.full_name
    FROM crm_app_sessions s
    JOIN crm_app_users u ON u.id = s.user_id
    WHERE s.refresh_token_hash = $1
    LIMIT 1
    `,
    [refreshTokenHash]
  );

  const session = result.rows[0];

  if (!session) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: 'Invalid session' });
  }

  if (session.revoked_at) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: 'Session revoked' });
  }

  if (new Date(session.expires_at) < new Date()) {
    clearRefreshCookie(res);
    return res.status(401).json({ message: 'Session expired' });
  }

  const user = {
    id: session.user_id,
    email: session.email,
    role: session.role,
    full_name: session.full_name,
  };

  const accessToken = signAccessToken(user);

  res.json({
    token: accessToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.full_name,
    },
  });
});

router.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.crm_refresh_token;

  if (refreshToken) {
    const refreshTokenHash = hashToken(refreshToken);

    await query(
      `
      UPDATE crm_app_sessions
      SET revoked_at = NOW()
      WHERE refresh_token_hash = $1
      `,
      [refreshTokenHash]
    );
  }

  clearRefreshCookie(res);

  res.json({ success: true });
});

router.post('/logout-all', async (req, res) => {
  const refreshToken = req.cookies?.crm_refresh_token;

  if (!refreshToken) {
    clearRefreshCookie(res);
    return res.json({ success: true });
  }

  const refreshTokenHash = hashToken(refreshToken);

  const sessionResult = await query(
    `
    SELECT user_id
    FROM crm_app_sessions
    WHERE refresh_token_hash = $1
    `,
    [refreshTokenHash]
  );

  const session = sessionResult.rows[0];

  if (session) {
    await query(
      `
      UPDATE crm_app_sessions
      SET revoked_at = NOW()
      WHERE user_id = $1
        AND revoked_at IS NULL
      `,
      [session.user_id]
    );
  }

  clearRefreshCookie(res);

  res.json({ success: true });
});

export default router;