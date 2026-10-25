import bcrypt from 'bcryptjs';
import { pool, query } from './db.js';

async function seedProductionAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_FULL_NAME || 'Administrateur CRM';

  if (!email || !password) {
    throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD sont obligatoires.');
  }
  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD doit contenir au moins 12 caractères.');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const result = await query(
    `INSERT INTO crm_app_users (email, password_hash, role, full_name)
     VALUES ($1, $2, 'admin', $3)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    [email, passwordHash, fullName],
  );

  console.log(result.rowCount ? 'Compte administrateur créé.' : 'Compte administrateur déjà présent, aucune modification.');
}

seedProductionAdmin()
  .then(() => pool.end())
  .catch(async (error) => {
    console.error(error.message);
    await pool.end();
    process.exit(1);
  });
