ALTER TABLE suppliers
  ADD COLUMN IF NOT EXISTS language_pairs TEXT,
  ADD COLUMN IF NOT EXISTS word_rate NUMERIC(12, 4),
  ADD COLUMN IF NOT EXISTS flat_rate NUMERIC(12, 2);

COMMENT ON COLUMN suppliers.language_pairs IS
  'Paires de langues séparées par des virgules, par exemple FR>EN, ES>EN';
COMMENT ON COLUMN suppliers.word_rate IS 'Tarif prestataire par mot';
COMMENT ON COLUMN suppliers.flat_rate IS 'Forfait prestataire prioritaire sur le tarif au mot';
