import { Router } from 'express';
import { authenticate } from '../auth.js';
import { query } from '../db.js';
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

    const payload = await applyCreateDefaults(
      tableName,
      rawPayload,
      columnNames,
      req
    );

    const entries = Object.entries(payload)
      .filter(([key]) => columnNames.includes(key))
      .filter(([key]) => !forbiddenColumns.has(key))
      .filter(([, value]) => !isEmptyCreateValue(value));

    const insertColumns = entries.map(([key]) => key);
    const placeholders = entries.map((_, index) => `$${index + 1}`);
    const values = entries.map(([, value]) => normalizeValue(value));

    const result = await query(
      `
      INSERT INTO ${tableName} (${insertColumns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
      `,
      values
    );

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
    console.error(err);
    res.status(500).json({ message: err.message || 'Erreur création enregistrement' });
  }
});

export default router;
