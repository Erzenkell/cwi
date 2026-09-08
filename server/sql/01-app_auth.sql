CREATE TABLE IF NOT EXISTS crm_app_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee', 'admin')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_app_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES crm_app_users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  user_agent TEXT,
  ip_address TEXT,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_app_sessions_user_id
  ON crm_app_sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_crm_app_sessions_token_hash
  ON crm_app_sessions(refresh_token_hash);

CREATE TABLE IF NOT EXISTS crm_app_users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee', 'admin')),
  full_name TEXT NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS crm_app_user_tab_permissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES crm_app_users(id) ON DELETE CASCADE,
  tab_key TEXT NOT NULL,
  can_access BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, tab_key)
);

INSERT INTO crm_app_user_tab_permissions (user_id, tab_key, can_access)
SELECT id, tab_key, true
FROM crm_app_users
CROSS JOIN (
  VALUES
    ('COMPTES'),
    ('CONTACTS'),
    ('OPPORTUNITÉS'),
    ('SOUS-TRAITANT')
) AS tabs(tab_key)
WHERE role = 'employee'
ON CONFLICT (user_id, tab_key) DO NOTHING;

INSERT INTO crm_app_user_tab_permissions (user_id, tab_key, can_access)
SELECT id, tab_key, true
FROM crm_app_users
CROSS JOIN (
  VALUES
    ('COMPTES'),
    ('CONTACTS'),
    ('OPPORTUNITÉS'),
    ('SOUS-TRAITANT'),
    ('PISTES'),
    ('FACTURES'),
    ('SYNTHÈSE'),
    ('MEILLEURS CLIENTS'),
    ('ADMINISTRATION')
) AS tabs(tab_key)
WHERE role = 'admin'
ON CONFLICT (user_id, tab_key) DO NOTHING;

INSERT INTO crm_app_user_tab_permissions (user_id, tab_key, can_access)
SELECT id, 'LOGS', true
FROM crm_app_users
WHERE role = 'admin'
ON CONFLICT (user_id, tab_key) DO NOTHING;