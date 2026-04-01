CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('employee', 'admin')),
  group_id INTEGER REFERENCES groups(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  sector TEXT,
  owner_name TEXT,
  status TEXT,
  revenue NUMERIC(12,2) DEFAULT 0
);

CREATE TABLE IF NOT EXISTS contacts (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  role TEXT
);

CREATE TABLE IF NOT EXISTS opportunities (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  value_eur NUMERIC(12,2) DEFAULT 0,
  stage TEXT,
  probability INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subcontractors (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  specialty TEXT,
  rating NUMERIC(3,1),
  availability TEXT
);

CREATE TABLE IF NOT EXISTS leads (
  id SERIAL PRIMARY KEY,
  company TEXT NOT NULL,
  source TEXT,
  score INTEGER,
  assigned_to TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  client TEXT,
  amount_eur NUMERIC(12,2) DEFAULT 0,
  status TEXT
);

-- ========================
-- INVOICES
-- ========================
CREATE TABLE IF NOT EXISTS invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  customer_siret TEXT,
  issue_date DATE NOT NULL,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'draft',
  technical_status TEXT NOT NULL DEFAULT 'pending',
  subtotal_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  platform_name TEXT,
  platform_external_id TEXT,
  pdf_path TEXT,
  facturx_path TEXT,
  xml_path TEXT,
  payment_reference TEXT,
  notes TEXT,
  paid_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_lines (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  description TEXT,
  quantity NUMERIC(12,2) NOT NULL DEFAULT 1,
  unit_price_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  vat_rate NUMERIC(5,2) NOT NULL DEFAULT 20,
  total_ht NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS invoice_events (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_sequences (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  current_value INTEGER NOT NULL DEFAULT 0
);