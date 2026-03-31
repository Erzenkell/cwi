import { Router } from 'express';
import { authenticate } from '../auth.js';
import { query } from '../db.js';

const router = Router();
router.use(authenticate);

router.get('/summary', async (_req, res) => {
  const [revenue, pipeline, invoiceOpen, leadCount] = await Promise.all([
    query('SELECT COALESCE(SUM(revenue), 0) AS total FROM accounts'),
    query('SELECT COALESCE(SUM(value_eur), 0) AS total FROM opportunities'),
    query("SELECT COUNT(*)::int AS total FROM invoices WHERE status <> 'Payée'"),
    query('SELECT COUNT(*)::int AS total FROM leads'),
  ]);

  const summary = [
    { label: 'CA comptes', value: `${revenue.rows[0].total} €` },
    { label: 'Pipeline opportunités', value: `${pipeline.rows[0].total} €` },
    { label: 'Factures ouvertes', value: String(invoiceOpen.rows[0].total) },
    { label: 'Pistes actives', value: String(leadCount.rows[0].total) },
  ];

  res.json({ summary, summaryCards: summary });
});

router.get('/top-clients', async (_req, res) => {
  const result = await query(`
    SELECT name, CONCAT(revenue::text, ' €') AS turnover,
      CASE
        WHEN revenue >= 250000 THEN 'Excellent'
        WHEN revenue >= 120000 THEN 'Stable'
        ELSE 'Croissance'
      END AS health
    FROM accounts
    ORDER BY revenue DESC, id ASC
    LIMIT 10
  `);

  res.json({ topClients: result.rows });
});

export default router;
