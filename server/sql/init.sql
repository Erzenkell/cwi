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
