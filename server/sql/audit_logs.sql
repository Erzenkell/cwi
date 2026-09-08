CREATE TABLE IF NOT EXISTS crm_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES crm_app_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  before_data JSONB,
  after_data JSONB,
  changed_fields JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crm_audit_logs_entity
  ON crm_audit_logs(entity);

CREATE INDEX IF NOT EXISTS idx_crm_audit_logs_user_id
  ON crm_audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_crm_audit_logs_created_at
  ON crm_audit_logs(created_at DESC);