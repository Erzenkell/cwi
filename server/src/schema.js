import { query } from './db.js';

const schemaCache = new Map();
const tableCache = new Map();

export async function getColumns(tableName) {
  if (schemaCache.has(tableName)) return schemaCache.get(tableName);

  const result = await query(
    `
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
    ORDER BY ordinal_position
    `,
    [tableName]
  );

  const columns = new Set(result.rows.map((row) => row.column_name));
  schemaCache.set(tableName, columns);
  tableCache.set(tableName, columns.size > 0);
  return columns;
}

export async function hasTable(tableName) {
  if (tableCache.has(tableName)) return tableCache.get(tableName);
  await getColumns(tableName);
  return tableCache.get(tableName) || false;
}

export function hasColumn(columns, columnName) {
  return columns.has(columnName);
}

export function firstColumn(columns, candidates) {
  return candidates.find((column) => columns.has(column)) || null;
}

export function textExpr(alias, columns, candidates, fallback = '—') {
  const column = firstColumn(columns, candidates);
  if (!column) return `'${fallback}'`;
  return `COALESCE(${alias}.${column}::text, '${fallback}')`;
}

export function rawExpr(alias, columns, candidates, fallback = 'NULL') {
  const column = firstColumn(columns, candidates);
  if (!column) return fallback;
  return `${alias}.${column}`;
}

export function concatNameExpr(alias, columns) {
  const firstName = firstColumn(columns, ['first_name', 'firstname', 'given_name']);
  const lastName = firstColumn(columns, ['last_name', 'lastname', 'family_name']);
  const fullName = firstColumn(columns, ['name', 'full_name', 'display_name']);

  if (firstName || lastName) {
    const first = firstName ? `COALESCE(${alias}.${firstName}::text, '')` : `''`;
    const last = lastName ? `COALESCE(${alias}.${lastName}::text, '')` : `''`;
    return `COALESCE(NULLIF(TRIM(CONCAT(${first}, ' ', ${last})), ''), '—')`;
  }

  if (fullName) return `COALESCE(${alias}.${fullName}::text, '—')`;
  return `'—'`;
}

export function whereNotDeleted(alias, columns) {
  return hasColumn(columns, 'deleted_at') ? `WHERE ${alias}.deleted_at IS NULL` : '';
}

export function orderBy(alias, columns) {
  const parts = [];
  if (hasColumn(columns, 'updated_at')) parts.push(`${alias}.updated_at DESC`);
  if (hasColumn(columns, 'created_at')) parts.push(`${alias}.created_at DESC`);
  if (hasColumn(columns, 'id')) parts.push(`${alias}.id DESC`);
  return parts.length ? `ORDER BY ${parts.join(', ')}` : '';
}

export async function emptyIfMissing(tableName) {
  return (await hasTable(tableName)) ? null : { rows: [] };
}

export function moneyExpr(alias, columns, amountCandidates, currencyCandidates = ['currency']) {
  const amount = firstColumn(columns, amountCandidates);
  const currency = firstColumn(columns, currencyCandidates);
  const amountSql = amount ? `COALESCE(ROUND(${alias}.${amount}::numeric, 2)::text, '0')` : `'0'`;
  const currencySql = currency ? `COALESCE(${alias}.${currency}::text, 'EUR')` : `'EUR'`;
  return `CONCAT(${amountSql}, ' ', ${currencySql})`;
}

export function percentExpr(alias, columns, candidates) {
  const column = firstColumn(columns, candidates);
  if (!column) return `'—'`;
  return `CONCAT(COALESCE(${alias}.${column}::text, '0'), '%')`;
}
