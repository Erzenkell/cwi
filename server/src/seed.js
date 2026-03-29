import bcrypt from 'bcryptjs';
import { query, pool } from './db.js';

const passwordHash = await bcrypt.hash('password123', 10);

await query(
  `INSERT INTO users (full_name, email, password_hash, role)
   VALUES
     ('Salarié Demo', 'employee@crm.local', $1, 'employee'),
     ('Admin Demo', 'admin@crm.local', $1, 'admin')
   ON CONFLICT (email) DO NOTHING`,
  [passwordHash],
);

await query(`
  INSERT INTO accounts (name, sector, owner_name, status, revenue)
  VALUES
    ('Wordsinvest Capital', 'Finance', 'Sofia', 'Actif', 320000),
    ('Nova Industrie', 'Industrie', 'Yanis', 'À relancer', 185000),
    ('Aster Conseil', 'Conseil', 'Lina', 'Fidèle', 96000)
  ON CONFLICT DO NOTHING
`);

await query(`
  INSERT INTO contacts (name, company, email, role)
  VALUES
    ('Camille Durand', 'Wordsinvest Capital', 'camille@wordsinvest.test', 'CEO'),
    ('Romain Perez', 'Nova Industrie', 'romain@nova.test', 'Acheteur'),
    ('Inès Martin', 'Aster Conseil', 'ines@aster.test', 'CFO')
  ON CONFLICT DO NOTHING
`);

await query(`
  INSERT INTO opportunities (label, value_eur, stage, probability)
  VALUES
    ('Refonte CRM Europe', 42000, 'Proposition', 75),
    ('Migration data room', 28000, 'Négociation', 60),
    ('Audit partenaires', 18000, 'Découverte', 35)
  ON CONFLICT DO NOTHING
`);

await query(`
  INSERT INTO subcontractors (name, specialty, rating, availability)
  VALUES
    ('Atlas Tech', 'Développement', 4.8, 'Disponible'),
    ('Blue Ledger', 'Comptabilité', 4.4, 'Sous 2 semaines'),
    ('North Ops', 'Support', 4.6, 'Disponible')
  ON CONFLICT DO NOTHING
`);

await query(`
  INSERT INTO leads (company, source, score, assigned_to)
  VALUES
    ('Meridian Group', 'LinkedIn', 82, 'Sofia'),
    ('Hexa Patrimoine', 'Salon', 76, 'Yanis'),
    ('Delta One', 'Referral', 69, 'Lina')
  ON CONFLICT DO NOTHING
`);

await query(`
  INSERT INTO invoices (reference, client, amount_eur, status)
  VALUES
    ('INV-2026-001', 'Wordsinvest Capital', 12500, 'Payée'),
    ('INV-2026-002', 'Nova Industrie', 8900, 'En attente'),
    ('INV-2026-003', 'Aster Conseil', 6100, 'Brouillon')
  ON CONFLICT DO NOTHING
`);

console.log('Seed completed');
await pool.end();
