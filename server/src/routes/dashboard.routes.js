import { Router } from 'express';
import { authenticate } from '../auth.js';
import { query } from '../db.js';
import { firstColumn, getColumns, hasColumn, hasTable, whereNotDeleted } from '../schema.js';

const router = Router();
router.use(authenticate);

async function countRows(tableName) {
  if (!(await hasTable(tableName))) return 0;
  const columns = await getColumns(tableName);
  const result = await query(`SELECT COUNT(*)::int AS total FROM ${tableName} ${whereNotDeleted(tableName, columns)}`);
  return result.rows[0]?.total || 0;
}

async function sumColumn(tableName, candidates) {
  if (!(await hasTable(tableName))) return 0;
  const columns = await getColumns(tableName);
  const column = firstColumn(columns, candidates);
  if (!column) return 0;
  const result = await query(`SELECT COALESCE(SUM(${column}::numeric), 0)::numeric(12,2) AS total FROM ${tableName} ${whereNotDeleted(tableName, columns)}`);
  return result.rows[0]?.total || 0;
}

async function unpaidInvoiceCount(tableName) {
  if (!(await hasTable(tableName))) return 0;
  const columns = await getColumns(tableName);
  const paid = firstColumn(columns, ['paid', 'is_paid']);
  const status = firstColumn(columns, ['status', 'state']);

  let where = whereNotDeleted(tableName, columns).replace(/^WHERE\s*/, '');
  const filters = [];
  if (where) filters.push(where);
  if (paid) filters.push(`${paid} IS NOT TRUE`);
  else if (status) filters.push(`LOWER(COALESCE(${status}::text, '')) NOT IN ('paid', 'payée', 'paye', 'paid_at')`);

  const result = await query(`SELECT COUNT(*)::int AS total FROM ${tableName} ${filters.length ? `WHERE ${filters.join(' AND ')}` : ''}`);
  return result.rows[0]?.total || 0;
}

router.get('/summary', async (_req, res) => {
  try {
    const invoiceTable = (await hasTable('abstract_invoices')) ? 'abstract_invoices' : ((await hasTable('invoices')) ? 'invoices' : null);

    const [accounts, contacts, opportunities, pipeline, invoiceAmount, unpaidInvoices, leads, suppliers] = await Promise.all([
      countRows('accounts'),
      countRows('contacts'),
      countRows('opportunities'),
      sumColumn('opportunities', ['amount', 'value', 'revenue', 'budget']),
      invoiceTable ? sumColumn(invoiceTable, ['amount', 'total_ttc', 'total', 'total_amount']) : 0,
      invoiceTable ? unpaidInvoiceCount(invoiceTable) : 0,
      countRows('leads'),
      countRows('suppliers'),
    ]);

    const summary = [
      { label: 'Comptes actifs', value: String(accounts) },
      { label: 'Contacts', value: String(contacts) },
      { label: 'Opportunités', value: String(opportunities) },
      { label: 'Pipeline', value: `${pipeline} €` },
      { label: 'Factures émises', value: `${invoiceAmount} €` },
      { label: 'Factures ouvertes', value: String(unpaidInvoices) },
      { label: 'Pistes', value: String(leads) },
      { label: 'Sous-traitants', value: String(suppliers) },
    ];

    res.json({ summary, summaryCards: summary.slice(0, 4) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/top-clients', async (_req, res) => {
  try {
    const tableName = (await hasTable('abstract_invoices')) ? 'abstract_invoices' : ((await hasTable('invoices')) ? 'invoices' : null);
    if (!tableName) return res.json({ topClients: [] });

    const ai = await getColumns(tableName);
    const amount = firstColumn(ai, ['amount', 'total_ttc', 'total', 'total_amount']);
    if (!amount) return res.json({ topClients: [] });

    const hasAccountsTable = await hasTable('accounts');
    const a = hasAccountsTable ? await getColumns('accounts') : new Set();
    const accountId = firstColumn(ai, ['account_id', 'customer_id', 'client_id']);
    const accountName = firstColumn(ai, ['account_name', 'customer_name', 'client', 'client_name']);
    const canJoinAccount = hasAccountsTable && accountId && hasColumn(a, 'id');
    const accountNameFromJoin = firstColumn(a, ['name', 'company', 'account_name']);

    const nameExpr = accountName
      ? `COALESCE(ai.${accountName}::text, 'Client inconnu')`
      : (canJoinAccount && accountNameFromJoin ? `COALESCE(a.${accountNameFromJoin}::text, 'Client inconnu')` : `'Client inconnu'`);

    const result = await query(`
      SELECT
        ${nameExpr} AS nom,
        CONCAT(ROUND(SUM(COALESCE(ai.${amount}, 0))::numeric, 2)::text, ' EUR') AS ca_facture,
        COUNT(ai.${hasColumn(ai, 'id') ? 'id' : amount})::int AS factures,
        CASE
          WHEN SUM(COALESCE(ai.${amount}, 0)) >= 50000 THEN 'Excellent'
          WHEN SUM(COALESCE(ai.${amount}, 0)) >= 10000 THEN 'Stable'
          ELSE 'À développer'
        END AS sante
      FROM ${tableName} ai
      ${canJoinAccount ? `LEFT JOIN accounts a ON a.id = ai.${accountId}` : ''}
      ${whereNotDeleted('ai', ai)}
      GROUP BY ${nameExpr}
      ORDER BY SUM(COALESCE(ai.${amount}, 0)) DESC
      LIMIT 10
    `);

    res.json({ topClients: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
