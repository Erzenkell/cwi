import { Router } from 'express';
import { authenticate } from '../auth.js';
import { pool, query } from '../db.js';
import { nextInvoiceNumber } from '../modules/invoices/invoice-number.service.js';
import crypto from 'crypto';

import { createAuditLog } from '../audit.js';
import {hasTable, hasColumn} from '../schema.js';

const router = Router();
router.use(authenticate);

const allowedTables = {
  accounts: 'accounts',
  contacts: 'contacts',
  opportunities: 'opportunities',
  subcontractors: 'subcontractors',
  suppliers: 'suppliers',
  leads: 'leads',
  invoices: 'invoices',
  abstract_invoices: 'abstract_invoices',
  users: 'users',
  groups: 'groups',
};

function generateOldUniqueId() {
  return crypto.randomBytes(16).toString('base64');
}

function isEmptyCreateValue(value) {
  return value === undefined || value === null || value === '';
}

function toColumnSet(columns) {
  if (columns instanceof Set) {
    return columns;
  }

  if (Array.isArray(columns)) {
    return new Set(
      columns.map((column) =>
        typeof column === 'string' ? column : column.column_name
      )
    );
  }

  return new Set();
}

function hasDbColumn(columns, columnName) {
  return toColumnSet(columns).has(columnName);
}

async function resolveDefaultCampaignId() {
  const campaignsExists = await hasTable('campaigns');

  if (!campaignsExists) {
    return null;
  }

  const columns = await getColumns('campaigns');
  const names = new Set(
    columns.map((column) =>
      typeof column === 'string'
        ? column
        : column.column_name
    )
  );

  const deletedFilter = names.has('deleted_at')
    ? 'WHERE deleted_at IS NULL'
    : '';

  const result = await query(`
    SELECT id
    FROM campaigns
    ${deletedFilter}
    ORDER BY id DESC
    LIMIT 1
  `);

  return result.rows[0]?.id ?? null;
}

async function resolveDefaultUserId(req) {
  try {
    const result = await query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
      LIMIT 1
      `,
      [req.user?.email || '']
    );

    if (result.rows[0]?.id) {
      return result.rows[0].id;
    }
  } catch {
    // Si la table legacy users n'a pas l'email ou n'existe pas,
    // on utilise l'utilisateur de l'application.
  }

  return req.user?.sub || null;
}

async function applyCreateDefaults(tableName, payload, columnNames, req) {
  const currentUserId = await resolveDefaultUserId(req);

  if (columnNames.includes('user_id') && isEmptyCreateValue(payload.user_id)) {
    payload.user_id = currentUserId;
  }

  if (columnNames.includes('assigned_to') && isEmptyCreateValue(payload.assigned_to)) {
    payload.assigned_to = currentUserId;
  }

  if (columnNames.includes('status') && isEmptyCreateValue(payload.status)) {
    payload.status = 'En attente';
  }

  if (columnNames.includes('state') && isEmptyCreateValue(payload.state)) {
    payload.state = 'En attente';
  }

  if (columnNames.includes('access') && isEmptyCreateValue(payload.access)) {
    payload.access = 'Public';
  }

  if (columnNames.includes('currency') && isEmptyCreateValue(payload.currency)) {
    payload.currency = 'EUR';
  }

  if (columnNames.includes('invoice_year') && isEmptyCreateValue(payload.invoice_year)) {
    payload.invoice_year = new Date().getFullYear();
  }

  if (columnNames.includes('old_uniqueid') && isEmptyCreateValue(payload.old_uniqueid)) {
    payload.old_uniqueid = generateOldUniqueId();
  }

  if (
    tableName === 'opportunities' &&
    columnNames.includes('campaign_id') &&
    isEmptyCreateValue(payload.campaign_id)
  ) {
    const campaignId = await resolveDefaultCampaignId();

    if (campaignId !== null) {
      payload.campaign_id = campaignId;
    }
  }

  return payload;
}

function resolveTable(key) {
  return allowedTables[key] || null;
}

async function getColumns(tableName) {
  const result = await query(
    `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
    `,
    [tableName]
  );

  return result.rows;
}

async function tableHasColumn(tableName, columnName) {
  const result = await query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    LIMIT 1
    `,
    [tableName, columnName]
  );

  return result.rows.length > 0;
}

function normalizeValue(value) {
  if (value === '') return null;
  return value;
}

function splitClientName(fullName) {
  const parts = String(fullName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 0) {
    return {
      firstName: '',
      lastName: '',
    };
  }

  if (parts.length === 1) {
    return {
      firstName: parts[0],
      lastName: '',
    };
  }

  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

async function createPrimaryContactForAccount(
  req,
  accountId,
  clientName,
  companyName
) {
  const cleanName = String(clientName || '').trim();

  if (!accountId || !cleanName) {
    return null;
  }

  if (
    !(await hasTable('contacts')) ||
    !(await hasTable('account_contacts'))
  ) {
    return null;
  }

  const contactColumns = await getColumns('contacts');

  const contactColumnNames = contactColumns.map(
    (column) => column.column_name
  );

  const {
    firstName,
    lastName,
  } = splitClientName(cleanName);

  const contactPayload = {};

  if (contactColumnNames.includes('first_name')) {
    contactPayload.first_name = firstName;
  }

  if (contactColumnNames.includes('last_name')) {
    contactPayload.last_name = lastName;
  }

  /*
   * Certaines versions du dump peuvent avoir
   * une seule colonne name/full_name.
   */
  if (
    !contactColumnNames.includes('first_name') &&
    !contactColumnNames.includes('last_name')
  ) {
    if (contactColumnNames.includes('name')) {
      contactPayload.name = cleanName;
    } else if (contactColumnNames.includes('full_name')) {
      contactPayload.full_name = cleanName;
    }
  }

  if (
    companyName &&
    contactColumnNames.includes('company')
  ) {
    contactPayload.company = companyName;
  }

  const contactWithDefaults = await applyCreateDefaults(
    'contacts',
    contactPayload,
    contactColumnNames,
    req
  );

  const forbiddenColumns = new Set([
    'id',
    'created_at',
    'updated_at',
    'deleted_at',
    'password',
    'password_hash',
    'encrypted_password',
    'reset_password_token',
    'remember_token',
    'confirmation_token',
  ]);

  const entries = Object.entries(contactWithDefaults)
    .filter(([key]) =>
      contactColumnNames.includes(key)
    )
    .filter(([key]) =>
      !forbiddenColumns.has(key)
    )
    .filter(([, value]) =>
      !isEmptyCreateValue(value)
    );

  if (entries.length === 0) {
    return null;
  }

  const insertColumns =
    entries.map(([key]) => key);

  const placeholders =
    entries.map(
      (_, index) => `$${index + 1}`
    );

  const values =
    entries.map(
      ([, value]) => normalizeValue(value)
    );

  const contactResult = await query(
    `
    INSERT INTO contacts (
      ${insertColumns.join(', ')}
    )
    VALUES (
      ${placeholders.join(', ')}
    )
    RETURNING *
    `,
    values
  );

  const contact = contactResult.rows[0];

  if (!contact?.id) {
    return null;
  }

  /*
   * Création de la relation compte/contact.
   */
  const relationColumns =
    await getColumns('account_contacts');

  const relationColumnNames =
    relationColumns.map(
      (column) => column.column_name
    );

  if (
    !relationColumnNames.includes('account_id') ||
    !relationColumnNames.includes('contact_id')
  ) {
    return contact.id;
  }

  const relationPayload =
    await applyCreateDefaults(
      'account_contacts',
      {
        account_id: accountId,
        contact_id: contact.id,
      },
      relationColumnNames,
      req
    );

  const relationEntries =
    Object.entries(relationPayload)
      .filter(([key]) =>
        relationColumnNames.includes(key)
      )
      .filter(([key]) =>
        key !== 'id'
      )
      .filter(([, value]) =>
        !isEmptyCreateValue(value)
      );

  const relationInsertColumns =
    relationEntries.map(([key]) => key);

  const relationPlaceholders =
    relationEntries.map(
      (_, index) => `$${index + 1}`
    );

  const relationValues =
    relationEntries.map(
      ([, value]) => normalizeValue(value)
    );

  await query(
    `
    INSERT INTO account_contacts (
      ${relationInsertColumns.join(', ')}
    )
    VALUES (
      ${relationPlaceholders.join(', ')}
    )
    `,
    relationValues
  );

  await createAuditLog({
    req,
    action: 'create',
    entity: 'contacts',
    entityId: contact.id,
    beforeData: null,
    afterData: contact,
  });

  return contact.id;
}

router.get('/options/accounts', async (_req, res) => {
  try {
    const columns = await getColumns('accounts');
    const names = columns.map((column) => column.column_name);
    const labelColumns = ['name', 'company', 'account_name', 'company_name']
      .filter((name) => names.includes(name));
    const labels = labelColumns.map((name) => `NULLIF(${name}::text, '')`);
    const result = await query(`
      SELECT id, COALESCE(${[...labels, 'id::text'].join(', ')}) AS label
      FROM accounts
      ${names.includes('deleted_at') ? 'WHERE deleted_at IS NULL' : ''}
      ORDER BY label ASC
    `);
    res.json({ accounts: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur chargement comptes' });
  }
});

router.get('/options/suppliers', async (_req, res) => {
  try {
    const tableName = (await hasTable('suppliers'))
      ? 'suppliers'
      : (await hasTable('subcontractors'))
        ? 'subcontractors'
        : null;

    if (!tableName) return res.json({ suppliers: [] });

    const columns = await getColumns(tableName);
    const names = columns.map((column) => column.column_name);
    const firstName = names.includes('first_name') ? "COALESCE(first_name::text, '')" : "''";
    const lastName = names.includes('last_name') ? "COALESCE(last_name::text, '')" : "''";
    const name = names.includes('name') ? "NULLIF(name::text, '')" : 'NULL';
    const company = names.includes('company') ? "NULLIF(company::text, '')" : 'NULL';
    const optional = (column, fallback = 'NULL') => names.includes(column) ? column : fallback;

    const result = await query(`
      SELECT
        id,
        COALESCE(
          NULLIF(TRIM(CONCAT(${firstName}, ' ', ${lastName})), ''),
          ${name},
          ${company},
          id::text
        ) AS label,
        ${optional('language_pairs', "''::text")} AS language_pairs,
        ${optional('word_rate', 'NULL::numeric')} AS word_rate,
        ${optional('flat_rate', 'NULL::numeric')} AS flat_rate
      FROM ${tableName}
      ${names.includes('deleted_at') ? 'WHERE deleted_at IS NULL' : ''}
      ORDER BY label ASC
    `);

    res.json({ suppliers: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message || 'Erreur chargement prestataires' });
  }
});

router.get('/options/users', async (_req, res) => {
  try {
    const tableExists = await hasTable('users');

    if (!tableExists) {
      return res.json({ users: [] });
    }

    const u = await getColumns('users');

    const firstNameExpr = hasDbColumn(u, 'first_name')
      ? "COALESCE(u.first_name::text, '')"
      : "''";

    const lastNameExpr = hasDbColumn(u, 'last_name')
      ? "COALESCE(u.last_name::text, '')"
      : "''";

    const emailExpr = hasDbColumn(u, 'email')
      ? "NULLIF(u.email::text, '')"
      : 'NULL';

    const nameExpr = hasDbColumn(u, 'name')
      ? "NULLIF(u.name::text, '')"
      : 'NULL';

    const deletedFilter = hasDbColumn(u, 'deleted_at')
      ? 'WHERE u.deleted_at IS NULL'
      : '';

    const result = await query(`
      SELECT
        u.id,
        COALESCE(
          NULLIF(TRIM(CONCAT(${firstNameExpr}, ' ', ${lastNameExpr})), ''),
          ${nameExpr},
          ${emailExpr},
          u.id::text
        ) AS label
      FROM users u
      ${deletedFilter}
      ORDER BY label ASC
    `);

    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur chargement utilisateurs CRM' });
  }
});

router.get('/:entity/schema', async (req, res) => {
  try {
    const tableName = resolveTable(req.params.entity);

    if (!tableName) {
      return res.status(400).json({ message: 'Table non autorisée' });
    }

    const columns = await getColumns(tableName);

    res.json({
      table: tableName,
      columns,
      record: {},
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur chargement schéma' });
  }
});

router.get('/options/users', async (_req, res) => {
  try {
    const result = await query(`
      SELECT
        id,
        full_name AS label
      FROM crm_app_users
      ORDER BY full_name ASC
    `);

    res.json({ users: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur chargement utilisateurs' });
  }
});

router.get('/supplier-services/:entity/:id', async (req, res) => {
  try {
    const tableName = req.params.entity === 'suppliers'
      ? 'suppliers'
      : req.params.entity === 'subcontractors'
        ? 'subcontractors'
        : null;

    if (!tableName || !(await hasTable(tableName)) || !(await hasTable('opportunities'))) {
      return res.status(400).json({ message: 'Sous-traitant ou prestations indisponibles' });
    }

    const month = /^\d{4}-\d{2}$/.test(String(req.query.month || ''))
      ? String(req.query.month)
      : new Date().toISOString().slice(0, 7);
    const supplierColumns = await getColumns(tableName);
    const supplierColumnNames = supplierColumns.map((column) => column.column_name);
    const optionalText = (column) => supplierColumnNames.includes(column)
      ? `COALESCE(${column}::text, '')`
      : `''`;

    const supplierResult = await query(
      `SELECT *,
        NULLIF(TRIM(CONCAT(${optionalText('first_name')}, ' ', ${optionalText('last_name')})), '') AS full_name
       FROM ${tableName}
       WHERE id = $1
       LIMIT 1`,
      [req.params.id]
    );
    const supplier = supplierResult.rows[0];

    if (!supplier) {
      return res.status(404).json({ message: 'Sous-traitant introuvable' });
    }

    const names = [
      supplier.full_name,
      supplier.first_name,
      supplier.last_name,
      supplier.name,
      supplier.company,
    ]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean);

    const opportunityColumns = await getColumns('opportunities');
    const opportunityColumnNames = new Set(opportunityColumns.map((column) => column.column_name));
    const assignments = [
      ['subcontractant', 'subcontractant_total', 'Sous-traitant'],
      ['subcontractant2', 'subcontractant2_total', 'Sous-traitant 2'],
      ['reader_name', 'reader_total', 'Relecture'],
    ].filter(([nameColumn, amountColumn]) =>
      opportunityColumnNames.has(nameColumn) && opportunityColumnNames.has(amountColumn)
    );

    if (assignments.length === 0 || names.length === 0) {
      return res.json({ supplier, month, services: [] });
    }

    const valuesSql = assignments
      .map(([nameColumn, amountColumn, role]) =>
        `('${role}', '${amountColumn}', o.${nameColumn}::text, NULLIF(o.${amountColumn}::text, '')::numeric)`
      )
      .join(',\n');
    const dateColumn = opportunityColumnNames.has('out_date')
      ? 'out_date'
      : opportunityColumnNames.has('in_date')
        ? 'in_date'
        : 'created_at';
    const serviceName = opportunityColumnNames.has('name') ? 'o.name' : 'o.id::text';
    const language = opportunityColumnNames.has('languages') ? "COALESCE(o.languages, '—')" : "'—'";
    const taskType = opportunityColumnNames.has('task_type') ? "COALESCE(o.task_type, '—')" : "'—'";

    const servicesResult = await query(
      `SELECT
         o.id,
         ${serviceName} AS prestation,
         o.${dateColumn} AS service_date,
         ${language} AS langue,
         ${taskType} AS type_prestation,
         assignment.role,
         assignment.amount_column,
         COALESCE(assignment.amount, 0) AS amount
       FROM opportunities o
       CROSS JOIN LATERAL (VALUES ${valuesSql})
         AS assignment(role, amount_column, supplier_name, amount)
       WHERE LOWER(TRIM(COALESCE(assignment.supplier_name, ''))) = ANY($1::text[])
         AND o.${dateColumn} >= ($2 || '-01')::date
         AND o.${dateColumn} < (($2 || '-01')::date + INTERVAL '1 month')
         ${opportunityColumnNames.has('deleted_at') ? 'AND o.deleted_at IS NULL' : ''}
       ORDER BY o.${dateColumn} ASC, o.id ASC`,
      [Array.from(new Set(names)), month]
    );

    res.json({ supplier, month, services: servicesResult.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || 'Erreur chargement des prestations' });
  }
});

router.get('/:entity/:id', async (req, res) => {
  try {
    const tableName = resolveTable(req.params.entity);

    if (!tableName) {
      return res.status(400).json({ message: 'Table non autorisée' });
    }

    const hasId = await tableHasColumn(tableName, 'id');

    if (!hasId) {
      return res.status(400).json({ message: `La table ${tableName} n'a pas de colonne id` });
    }

    const columns = await getColumns(tableName);

    const result = await query(
      `
      SELECT *
      FROM ${tableName}
      WHERE id = $1
      LIMIT 1
      `,
      [req.params.id]
    );

    const record = result.rows[0];

    if (!record) {
      return res.status(404).json({ message: 'Enregistrement introuvable' });
    }

    res.json({
        table: tableName,
        columns,
        record: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur chargement enregistrement' });
  }
});

router.patch('/:entity/:id', async (req, res) => {
  try {
    const tableName = resolveTable(req.params.entity);

    if (!tableName) {
      return res.status(400).json({ message: 'Table non autorisée' });
    }

    const columns = await getColumns(tableName);
    const columnNames = columns.map((c) => c.column_name);

    const forbiddenColumns = new Set([
      'id',
      'lead_id',
      'created_at',
      'updated_at',
      'deleted_at',
      'old_uniqueid',
      'password',
      'password_hash',
      'encrypted_password',
      'reset_password_token',
      'remember_token',
      'confirmation_token',
    ]);

    const updates = Object.entries(req.body)
      .filter(([key]) => columnNames.includes(key))
      .filter(([key]) => !forbiddenColumns.has(key));

    if (updates.length === 0) {
      return res.status(400).json({ message: 'Aucun champ modifiable reçu' });
    }

    const setSql = updates
      .map(([key], index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = updates.map(([, value]) => normalizeValue(value));

    const hasUpdatedAt = columnNames.includes('updated_at');

    const sql = `
      UPDATE ${tableName}
      SET ${setSql}
      ${hasUpdatedAt ? ', updated_at = NOW()' : ''}
      WHERE id = $${values.length + 1}
      RETURNING *
    `;

    const beforeResult = await query(
      `
      SELECT *
      FROM ${tableName}
      WHERE id = $1
      LIMIT 1
      `,
      [req.params.id]
    );

    const beforeData = beforeResult.rows[0];

    if (!beforeData) {
      return res.status(404).json({ message: 'Enregistrement introuvable' });
    }

    const result = await query(sql, [...values, req.params.id]);

    await createAuditLog({
      req,
      action: 'update',
      entity: tableName,
      entityId: req.params.id,
      beforeData,
      afterData: result.rows[0],
    });

    res.json({
      table: tableName,
      record: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erreur mise à jour enregistrement' });
  }
});

router.post('/:entity', async (req, res) => {
  let transactionClient;
  try {
    const tableName = resolveTable(req.params.entity);

    if (!tableName) {
      return res.status(400).json({ message: 'Table non autorisée' });
    }

    const columns = await getColumns(tableName);
    const columnNames = columns.map((c) => c.column_name);

    const accountClientName =
      tableName === 'accounts'
        ? String(
            req.body?._client_name || ''
          ).trim()
        : '';

    const accountCompanyName =
      tableName === 'accounts'
        ? String(
            req.body?._company_name || ''
          ).trim()
        : '';

    if (
      tableName === 'accounts' &&
      (!accountClientName || !accountCompanyName)
    ) {
      return res.status(400).json({
        message:
          'Le nom client et le nom de l’entreprise sont obligatoires.',
      });
    }

    const forbiddenColumns = new Set([
      'id',
      'created_at',
      'updated_at',
      'deleted_at',
      'password',
      'password_hash',
      'encrypted_password',
      'reset_password_token',
      'remember_token',
      'confirmation_token',
    ]);

    const rawPayload = {};

    for (const [key, value] of Object.entries(req.body)) {
      if (!columnNames.includes(key)) continue;
      if (forbiddenColumns.has(key)) continue;
      if (isEmptyCreateValue(value)) continue;

      rawPayload[key] = normalizeValue(value);
    }

    /*
    * Transformation du champ frontend
    * "_company_name" vers une vraie colonne PostgreSQL.
    */
    if (
      tableName === 'accounts' &&
      accountCompanyName
    ) {
      const companyColumn = [
        'name',
        'company',
        'account_name',
        'company_name',
      ].find((column) =>
        columnNames.includes(column)
      );

      if (!companyColumn) {
        return res.status(400).json({
          message:
            "Impossible d'enregistrer le nom de l’entreprise : aucune colonne compatible dans accounts.",
        });
      }

      rawPayload[companyColumn] =
        accountCompanyName;
    }

    if (tableName === 'opportunities' && !isEmptyCreateValue(rawPayload.word_count)) {
      const wordCount = Number(rawPayload.word_count);
      if (!Number.isSafeInteger(wordCount) || wordCount < 0) {
        return res.status(400).json({ message: 'Le nombre de mots doit etre un entier positif ou nul.' });
      }
      rawPayload.word_count = wordCount;
    }

    const payload = await applyCreateDefaults(
      tableName,
      rawPayload,
      columnNames,
      req
    );

    if (tableName === 'abstract_invoices' || tableName === 'invoices') {
      transactionClient = await pool.connect();
      await transactionClient.query('BEGIN');
      if (tableName === 'invoices') {
        payload.invoice_number = await nextInvoiceNumber(transactionClient);
      } else {
        // Serialize numbering with insertion, including concurrent creations.
        await transactionClient.query('LOCK TABLE abstract_invoices IN EXCLUSIVE MODE');
        const year = Number(new Intl.DateTimeFormat('en', {
          year: 'numeric', timeZone: 'Europe/Paris',
        }).format(new Date()));
        const numberColumn = ['invoice_number', 'number', 'reference']
          .find((name) => columnNames.includes(name));
        const yearColumn = ['invoice_year', 'year']
          .find((name) => columnNames.includes(name));
        if (!numberColumn) throw new Error('Colonne de reference de facture introuvable');
        const numericColumn = columns.some((column) =>
          column.column_name === numberColumn &&
          ['smallint', 'integer', 'bigint', 'numeric'].includes(column.data_type)
        );
        if (numericColumn && !yearColumn) {
          throw new Error('Colonne annee de facture introuvable');
        }
        const result = await transactionClient.query(`
          SELECT COALESCE(MAX(
            CASE
              WHEN ${numberColumn}::text ~ '^[0-9]+$'
                ${yearColumn ? `AND ${yearColumn}::text = $1` : 'AND FALSE'}
                THEN ${numberColumn}::text::bigint
              WHEN ${numberColumn}::text ~ ('^' || $1 || '-[0-9]+$')
                THEN split_part(${numberColumn}::text, '-', 2)::bigint
              ELSE 0
            END
          ), 0) + 1 AS next_number
          FROM abstract_invoices
        `, [String(year)]);
        const next = result.rows[0].next_number;
        payload[numberColumn] = numericColumn ? next : `${year}-${next}`;
        if (yearColumn) payload[yearColumn] = year;
      }
    }

    if (['abstract_invoices', 'invoices'].includes(tableName) &&
        !isEmptyCreateValue(req.body?._account_id)) {
      const accountColumns = await getColumns('accounts');
      const accountResult = await transactionClient.query(`
        SELECT * FROM accounts WHERE id = $1
        ${hasDbColumn(accountColumns, 'deleted_at') ? 'AND deleted_at IS NULL' : ''}
      `, [req.body._account_id]);
      const account = accountResult.rows[0];
      if (!account) throw new Error('Compte introuvable');
      const accountIdColumn = ['account_id', 'customer_id', 'client_id']
        .find((name) => columnNames.includes(name));
      const clientNameColumn = ['account_name', 'customer_name', 'client', 'client_name']
        .find((name) => columnNames.includes(name));
      if (!accountIdColumn && !clientNameColumn) {
        throw new Error('Association facture/compte indisponible');
      }
      if (accountIdColumn) payload[accountIdColumn] = account.id;
      if (clientNameColumn) {
        payload[clientNameColumn] = ['name', 'company', 'account_name', 'company_name']
          .map((name) => account[name]).find((value) => value != null && String(value).trim())
          || String(account.id);
      }
    }

    const opportunityAccountId = tableName === 'opportunities'
      ? req.body?._account_id : null;
    let opportunityRelation = null;
    if (!isEmptyCreateValue(opportunityAccountId)) {
      const relationColumns = await getColumns('account_opportunities');
      const relationNames = relationColumns.map((column) => column.column_name);
      if (!relationNames.includes('account_id') || !relationNames.includes('opportunity_id')) {
        throw new Error('Association compte/opportunite indisponible');
      }
      const accountColumns = await getColumns('accounts');
      const account = await query(`SELECT id FROM accounts WHERE id = $1
        ${hasDbColumn(accountColumns, 'deleted_at') ? 'AND deleted_at IS NULL' : ''}`,
        [opportunityAccountId]);
      if (!account.rows.length) throw new Error('Compte introuvable');
      opportunityRelation = await applyCreateDefaults('account_opportunities',
        { account_id: opportunityAccountId }, relationNames, req);
      transactionClient = await pool.connect();
      await transactionClient.query('BEGIN');
      if (columnNames.includes('account_id')) payload.account_id = opportunityAccountId;
    }

    const entries = Object.entries(payload)
      .filter(([key]) => columnNames.includes(key))
      .filter(([key]) => !forbiddenColumns.has(key))
      .filter(([, value]) => !isEmptyCreateValue(value));

    const insertColumns = entries.map(([key]) => key);
    const placeholders = entries.map((_, index) => `$${index + 1}`);
    const values = entries.map(([, value]) => normalizeValue(value));

    const result = await (transactionClient || { query }).query(
      `
      INSERT INTO ${tableName} (${insertColumns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
      `,
      values
    );

    if (opportunityRelation) {
      opportunityRelation.opportunity_id = result.rows[0].id;
      const relationEntries = Object.entries(opportunityRelation)
        .filter(([, value]) => !isEmptyCreateValue(value));
      await transactionClient.query(`
        INSERT INTO account_opportunities (${relationEntries.map(([key]) => key).join(', ')})
        VALUES (${relationEntries.map((_, index) => `$${index + 1}`).join(', ')})
      `, relationEntries.map(([, value]) => value));
    }

    if (transactionClient) await transactionClient.query('COMMIT');

    await createAuditLog({
      req,
      action: 'create',
      entity: tableName,
      entityId: result.rows[0]?.id,
      beforeData: null,
      afterData: result.rows[0],
    });

    let primaryContactId = null;

    if (
      tableName === 'accounts' &&
      accountClientName
    ) {
      primaryContactId =
        await createPrimaryContactForAccount(
          req,
          result.rows[0]?.id,
          accountClientName,
          accountCompanyName
        );
    }

    res.status(201).json({
      table: tableName,
      columns,
      record: result.rows[0],
      ...(primaryContactId
        ? {
            primaryContactId,
          }
        : {}),
    });
  } catch (err) {
    if (transactionClient) await transactionClient.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ message: err.message || 'Erreur création enregistrement' });
  } finally {
    transactionClient?.release();
  }
});

export default router;
