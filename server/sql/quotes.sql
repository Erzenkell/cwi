-- Optionnel : table de suivi des devis générés.
-- Le bouton fourni génère directement un DOCX sans persistance.
-- Utilise cette table si tu veux historiser les devis ensuite.

CREATE TABLE IF NOT EXISTS crm_app_quotes (
  id SERIAL PRIMARY KEY,
  quote_number TEXT UNIQUE NOT NULL,
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name TEXT NOT NULL,
  customer_address TEXT,
  customer_postal_city TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  document_name TEXT NOT NULL,
  target_language TEXT NOT NULL,
  total_ht NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_vat NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_ttc NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_by INTEGER REFERENCES crm_app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
