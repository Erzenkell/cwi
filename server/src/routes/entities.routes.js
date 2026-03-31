import { Router } from 'express';
import { authenticate } from '../auth.js';
import { query } from '../db.js';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res) => {
  const [accounts, contacts, opportunities, subcontractors, leads, invoices] = await Promise.all([
    query('SELECT name, sector, owner_name AS owner, status, CONCAT(ROUND(revenue)::text, $1) AS revenue FROM accounts ORDER BY id ASC LIMIT 50', [' €']),
    query('SELECT name, company, email, role FROM contacts ORDER BY id ASC LIMIT 50'),
    query("SELECT label, CONCAT(value_eur::text, ' €') AS value, stage, CONCAT(probability::text, '%') AS probability FROM opportunities ORDER BY id ASC LIMIT 50"),
    query('SELECT name, specialty, rating, availability FROM subcontractors ORDER BY id ASC LIMIT 50'),
    query('SELECT company, source, score, assigned_to FROM leads ORDER BY id ASC LIMIT 50'),
    query("SELECT reference, client, CONCAT(amount_eur::text, ' €') AS amount, status FROM invoices ORDER BY id ASC LIMIT 50"),
  ]);

  res.json({
    accounts: accounts.rows,
    contacts: contacts.rows,
    opportunities: opportunities.rows,
    subcontractors: subcontractors.rows,
    leads: leads.rows,
    invoices: invoices.rows,
  });
});

export default router;
