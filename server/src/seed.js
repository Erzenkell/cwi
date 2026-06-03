import bcrypt from 'bcryptjs';
import { query } from './db.js';

async function seed() {
  await query(`
    CREATE TABLE IF NOT EXISTS crm_app_users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('employee', 'admin')),
      full_name TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  const passwordHash = await bcrypt.hash('password123', 10);

  await query(
    `INSERT INTO crm_app_users (email, password_hash, role, full_name)
     VALUES
       ($1, $3, 'employee', 'Salarié CRM'),
       ($2, $3, 'admin', 'Administrateur CRM')
     ON CONFLICT (email) DO UPDATE
     SET password_hash = EXCLUDED.password_hash,
         role = EXCLUDED.role,
         full_name = EXCLUDED.full_name`,
    ['employee@crm.local', 'admin@crm.local', passwordHash]
  );

  console.log('CRM app users seeded');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
