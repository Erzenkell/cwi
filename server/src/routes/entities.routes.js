import { Router } from 'express';
import { authenticate } from '../auth.js';
import { query } from '../db.js';
import {
  concatNameExpr,
  emptyIfMissing,
  firstColumn,
  getColumns,
  hasColumn,
  hasTable,
  moneyExpr,
  orderBy,
  percentExpr,
  rawExpr,
  textExpr,
  whereNotDeleted,
} from '../schema.js';

const router = Router();
router.use(authenticate);

function entityMeta(alias, columns, entityName) {
  if (!hasColumn(columns, 'id')) {
    return `
      NULL AS _id,
      '${entityName}' AS _entity
    `;
  }

  return `
    ${alias}.id AS _id,
    '${entityName}' AS _entity
  `;
}

async function accountsView() {
  const missing = await emptyIfMissing('accounts');
  if (missing) return missing;

  const a = await getColumns('accounts');

  return query(`
    SELECT
      ${entityMeta('a', a, 'accounts')},
      ${textExpr('a', a, ['name', 'company', 'account_name'])} AS nom,
      ${textExpr('a', a, ['category', 'sector', 'industry', 'account_type', 'type'])} AS categorie,
      ${textExpr('a', a, ['email', 'email_address'])} AS email,
      ${textExpr('a', a, ['phone', 'toll_free_phone', 'mobile', 'telephone'])} AS telephone,
      ${textExpr('a', a, ['location', 'city', 'address', 'billing_address'])} AS localisation,
      ${rawExpr('a', a, ['rating', 'score'], 'NULL')} AS note
    FROM accounts a
    ${whereNotDeleted('a', a)}
    ${orderBy('a', a)}
    LIMIT 50
  `);
}

async function contactsView() {
  const missing = await emptyIfMissing('contacts');
  if (missing) return missing;

  const c = await getColumns('contacts');
  const hasAccountContacts = await hasTable('account_contacts');
  const hasAccounts = await hasTable('accounts');
  const ac = hasAccountContacts ? await getColumns('account_contacts') : new Set();
  const a = hasAccounts ? await getColumns('accounts') : new Set();

  const canJoinAccount =
    hasAccountContacts &&
    hasAccounts &&
    hasColumn(c, 'id') &&
    hasColumn(ac, 'contact_id') &&
    hasColumn(ac, 'account_id') &&
    hasColumn(a, 'id');

  const joinSql = canJoinAccount
    ? `
      LEFT JOIN account_contacts ac
        ON ac.contact_id = c.id ${hasColumn(ac, 'deleted_at') ? 'AND ac.deleted_at IS NULL' : ''}
      LEFT JOIN accounts a
        ON a.id = ac.account_id ${hasColumn(a, 'deleted_at') ? 'AND a.deleted_at IS NULL' : ''}
    `
    : '';

  return query(`
    SELECT
      ${entityMeta('c', c, 'contacts')},
      ${concatNameExpr('c', c)} AS nom,
      ${canJoinAccount ? textExpr('a', a, ['name', 'company', 'account_name']) : `'—'`} AS compte,
      ${textExpr('c', c, ['email', 'alt_email', 'email_address'])} AS email,
      ${textExpr('c', c, ['phone', 'mobile', 'alt_phone', 'telephone'])} AS telephone,
      ${textExpr('c', c, ['title', 'job_title', 'role', 'department', 'position'])} AS fonction,
      ${textExpr('c', c, ['location', 'city', 'address'])} AS localisation
    FROM contacts c
    ${joinSql}
    ${whereNotDeleted('c', c)}
    ${orderBy('c', c)}
    LIMIT 50
  `);
}

async function opportunitiesView() {
  const missing = await emptyIfMissing('opportunities');
  if (missing) return missing;

  const o = await getColumns('opportunities');
  const hasAccountOpportunities = await hasTable('account_opportunities');
  const hasAccounts = await hasTable('accounts');
  const ao = hasAccountOpportunities ? await getColumns('account_opportunities') : new Set();
  const a = hasAccounts ? await getColumns('accounts') : new Set();

  const canJoinAccount =
    hasAccountOpportunities &&
    hasAccounts &&
    hasColumn(o, 'id') &&
    hasColumn(ao, 'opportunity_id') &&
    hasColumn(ao, 'account_id') &&
    hasColumn(a, 'id');

  const joinSql = canJoinAccount
    ? `
      LEFT JOIN account_opportunities ao
        ON ao.opportunity_id = o.id ${hasColumn(ao, 'deleted_at') ? 'AND ao.deleted_at IS NULL' : ''}
      LEFT JOIN accounts a
        ON a.id = ao.account_id ${hasColumn(a, 'deleted_at') ? 'AND a.deleted_at IS NULL' : ''}
    `
    : '';

  const stageColumn = firstColumn(o, ['stage', 'status', 'state']);

  return query(`
    SELECT
      ${entityMeta('o', o, 'opportunities')},
      ${stageColumn ? `'${stageColumn}'` : 'NULL'} AS _stage_column,

      ${textExpr('o', o, ['name', 'label', 'title', 'subject'])} AS opportunite,
      ${canJoinAccount ? textExpr('a', a, ['name', 'company', 'account_name']) : `'—'`} AS compte,
      ${moneyExpr('o', o, ['amount', 'value', 'revenue', 'budget'])} AS montant,
      ${textExpr('o', o, ['stage', 'status', 'state'])} AS etape,
      ${percentExpr('o', o, ['probability', 'probability_percent'])} AS probabilite,
      ${textExpr('o', o, ['languages', 'language', 'source_language'])} AS langues,
      ${textExpr('o', o, ['task_type', 'service_type', 'type', 'category'])} AS prestation
    FROM opportunities o
    ${joinSql}
    ${whereNotDeleted('o', o)}
    ${orderBy('o', o)}
    LIMIT 50
  `);
}

async function suppliersView() {
  const tableName = (await hasTable('suppliers'))
    ? 'suppliers'
    : (await hasTable('subcontractors'))
      ? 'subcontractors'
      : null;

  if (!tableName) return { rows: [] };

  const s = await getColumns(tableName);

  return query(`
    SELECT
      ${entityMeta('s', s, tableName)},
      ${concatNameExpr('s', s)} AS nom,
      ${textExpr('s', s, ['company', 'company_name', 'name', 'business_name'])} AS societe,
      ${textExpr('s', s, ['email', 'alt_email', 'email_address'])} AS email,
      ${textExpr('s', s, ['phone', 'alt_phone', 'mobile', 'telephone'])} AS telephone,
      ${textExpr('s', s, ['location', 'city', 'address', 'country'])} AS localisation,
      ${textExpr('s', s, ['speciality', 'specialty', 'skills', 'service_type'])} AS specialite
    FROM ${tableName} s
    ${whereNotDeleted('s', s)}
    ${orderBy('s', s)}
    LIMIT 50
  `);
}

async function leadsView() {
  const tableExists = await hasTable('leads');
  if (!tableExists) return { rows: [] };

  const l = await getColumns('leads');

  const whereSql = hasColumn(l, 'deleted_at')
    ? 'WHERE l.deleted_at IS NULL'
    : '';

  const noteExpr = hasColumn(l, 'rating')
    ? 'l.rating'
    : hasColumn(l, 'score')
      ? 'l.score'
      : '0';

  const firstNameExpr = hasColumn(l, 'first_name') ? "COALESCE(l.first_name, '')" : "''";
  const lastNameExpr = hasColumn(l, 'last_name') ? "COALESCE(l.last_name, '')" : "''";
  const companyExpr = hasColumn(l, 'company') ? "COALESCE(NULLIF(l.company::text, ''), '—')" : "'—'";
  const statusExpr = hasColumn(l, 'status') ? "COALESCE(NULLIF(l.status::text, ''), 'En attente')" : "'En attente'";
  const sourceExpr = hasColumn(l, 'source') ? "COALESCE(NULLIF(l.source::text, ''), '—')" : "'—'";
  const emailExpr = hasColumn(l, 'email') ? "COALESCE(NULLIF(l.email::text, ''), '—')" : "'—'";
  const phoneExpr = hasColumn(l, 'phone') ? "COALESCE(NULLIF(l.phone::text, ''), '—')" : "'—'";

  const result = await query(`
    SELECT
      l.id AS _id,
      'leads' AS _entity,
      COALESCE(
        NULLIF(TRIM(CONCAT(${firstNameExpr}, ' ', ${lastNameExpr})), ''),
        ${companyExpr},
        '—'
      ) AS nom,
      ${companyExpr} AS societe,
      ${statusExpr} AS statut,
      ${sourceExpr} AS source,
      ${emailExpr} AS email,
      ${phoneExpr} AS telephone,
      ${noteExpr} AS note
    FROM leads l
    ${whereSql}
    ORDER BY l.id DESC
    LIMIT 50
  `);

  return result;
}

async function invoicesView() {
  const tableName = (await hasTable('abstract_invoices'))
    ? 'abstract_invoices'
    : (await hasTable('invoices'))
      ? 'invoices'
      : null;

  if (!tableName) return { rows: [] };

  const ai = await getColumns(tableName);
  const hasAccounts = await hasTable('accounts');
  const a = hasAccounts ? await getColumns('accounts') : new Set();
  const accountIdColumn = firstColumn(ai, ['account_id', 'customer_id', 'client_id']);
  const canJoinAccount = hasAccounts && accountIdColumn && hasColumn(a, 'id');

  const invoiceYear = firstColumn(ai, ['invoice_year', 'year']);
  const invoiceNumber = firstColumn(ai, ['invoice_number', 'number', 'reference']);
  const statusColumn = firstColumn(ai, ['status', 'state']);
  const sentDateColumn = firstColumn(ai, ['sent_date', 'sent_at', 'issue_date', 'created_at']);
  const paymentDateColumn = firstColumn(ai, ['payment_date', 'paid_at']);
  const paidColumn = firstColumn(ai, ['paid', 'is_paid']);

  const referenceExpr =
    invoiceYear && invoiceNumber
      ? `CONCAT(COALESCE(ai.${invoiceYear}::text, '—'), '-', COALESCE(ai.${invoiceNumber}::text, ai.id::text))`
      : textExpr('ai', ai, ['invoice_number', 'number', 'reference', 'id']);

  const statusExpr = paidColumn
    ? `CASE
         WHEN ai.${paidColumn} IS TRUE THEN 'Payée'
         ELSE ${statusColumn ? `COALESCE(NULLIF(ai.${statusColumn}::text, ''), 'En attente')` : `'En attente'`}
       END`
    : textExpr('ai', ai, ['status', 'state'], 'En attente');

  const directClientExpr = textExpr('ai', ai, ['account_name', 'customer_name', 'client', 'client_name']);
  const clientExpr = directClientExpr !== `'—'`
    ? directClientExpr
    : canJoinAccount
      ? textExpr('a', a, ['name', 'company', 'account_name'])
      : `'—'`;

  return query(`
    SELECT
      ${entityMeta('ai', ai, tableName)},
      ${statusColumn ? `'${statusColumn}'` : 'NULL'} AS _status_column,
      ${sentDateColumn ? `'${sentDateColumn}'` : 'NULL'} AS _date_envoi_column,
      ${paymentDateColumn ? `'${paymentDateColumn}'` : 'NULL'} AS _date_paiement_column,
      ${paidColumn ? `'${paidColumn}'` : 'NULL'} AS _paid_column,

      ${referenceExpr} AS reference,
      ${clientExpr} AS client,
      ${moneyExpr('ai', ai, ['amount', 'total_ttc', 'total', 'total_amount'])} AS montant,
      ${percentExpr('ai', ai, ['vat', 'vat_rate', 'tax_rate'])} AS tva,
      ${statusExpr} AS statut,
      ${textExpr('ai', ai, ['sent_date', 'sent_at', 'issue_date', 'created_at'])} AS date_envoi,
      ${textExpr('ai', ai, ['payment_date', 'paid_at'])} AS date_paiement
    FROM ${tableName} ai
    ${canJoinAccount ? `LEFT JOIN accounts a ON a.id = ai.${accountIdColumn}` : ''}
    ${whereNotDeleted('ai', ai)}
    ${orderBy('ai', ai)}
    LIMIT 50
  `);
}

router.get('/', async (req, res) => {
  try {
    const allowedTabs = await getAllowedTabs(req.user);

    const payload = {
      accounts: [],
      contacts: [],
      opportunities: [],
      subcontractors: [],
      leads: [],
      invoices: [],
    };

    const tasks = [];

    if (allowedTabs.includes('COMPTES')) {
      tasks.push(accountsView().then((r) => { payload.accounts = r.rows; }));
    }

    if (allowedTabs.includes('CONTACTS')) {
      tasks.push(contactsView().then((r) => { payload.contacts = r.rows; }));
    }

    if (allowedTabs.includes('OPPORTUNITÉS')) {
      tasks.push(opportunitiesView().then((r) => { payload.opportunities = r.rows; }));
    }

    if (allowedTabs.includes('SOUS-TRAITANT')) {
      tasks.push(suppliersView().then((r) => { payload.subcontractors = r.rows; }));
    }

    if (allowedTabs.includes('PISTES')) {
      tasks.push(leadsView().then((r) => { payload.leads = r.rows; }));
    }

    if (allowedTabs.includes('FACTURES')) {
      tasks.push(invoicesView().then((r) => { payload.invoices = r.rows; }));
    }

    await Promise.all(tasks);

    res.json(payload);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;

async function getAllowedTabs(user) {
  if (user.role === 'admin') {
    return [
      'COMPTES',
      'CONTACTS',
      'OPPORTUNITÉS',
      'SOUS-TRAITANT',
      'PISTES',
      'FACTURES',
      'SYNTHÈSE',
      'MEILLEURS CLIENTS',
      'ADMINISTRATION',
    ];
  }

  const result = await query(
    `
    SELECT tab_key
    FROM crm_app_user_tab_permissions
    WHERE user_id = $1
      AND can_access = true
    `,
    [user.sub]
  );

  return result.rows.map((row) => row.tab_key);
}