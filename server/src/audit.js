import { query } from './db.js';

export function getChangedFields(beforeData = {}, afterData = {}) {
  const changes = {};

  for (const key of Object.keys(afterData)) {
    if (key.startsWith('_')) continue;

    const beforeValue = beforeData?.[key] ?? null;
    const afterValue = afterData?.[key] ?? null;

    if (String(beforeValue) !== String(afterValue)) {
      changes[key] = {
        before: beforeValue,
        after: afterValue,
      };
    }
  }

  return changes;
}

export async function createAuditLog({
  req,
  action,
  entity,
  entityId,
  beforeData = null,
  afterData = null,
}) {
  const changedFields =
    action === 'update'
      ? getChangedFields(beforeData || {}, afterData || {})
      : null;

  await query(
    `
    INSERT INTO crm_audit_logs (
      user_id,
      action,
      entity,
      entity_id,
      before_data,
      after_data,
      changed_fields,
      ip_address,
      user_agent
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      req.user?.sub || null,
      action,
      entity,
      entityId ? String(entityId) : null,
      beforeData ? JSON.stringify(beforeData) : null,
      afterData ? JSON.stringify(afterData) : null,
      changedFields ? JSON.stringify(changedFields) : null,
      req.ip || null,
      req.headers['user-agent'] || null,
    ]
  );
}