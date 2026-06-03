import { Router } from 'express';
import { authenticate, requireAdmin } from '../auth.js';
import { query } from '../db.js';
import { concatNameExpr, firstColumn, getColumns, hasColumn, hasTable, orderBy, textExpr, whereNotDeleted } from '../schema.js';

const router = Router();
router.use(authenticate, requireAdmin);

router.get('/users', async (_req, res) => {
  try {
    if (!(await hasTable('crm_app_users')) && !(await hasTable('users'))) {
      return res.json({ users: [] });
    }

    const tableName = (await hasTable('crm_app_users')) ? 'crm_app_users' : 'users';
    const u = await getColumns(tableName);
    const hasGroupsUsers = await hasTable('groups_users');
    const hasGroups = await hasTable('groups');
    const gu = hasGroupsUsers ? await getColumns('groups_users') : new Set();
    const g = hasGroups ? await getColumns('groups') : new Set();

    const canJoinGroups =
      tableName === 'users' &&
      hasGroupsUsers &&
      hasGroups &&
      hasColumn(u, 'id') &&
      hasColumn(gu, 'user_id') &&
      hasColumn(gu, 'group_id') &&
      hasColumn(g, 'id');

    const adminCol = firstColumn(u, ['admin', 'is_admin']);
    const roleCol = firstColumn(u, ['role']);
    const roleExpr = adminCol
      ? `CASE WHEN u.${adminCol} IS TRUE THEN 'Admin' ELSE 'Utilisateur' END`
      : (roleCol ? `COALESCE(u.${roleCol}::text, 'Utilisateur')` : `'Utilisateur'`);

    const groupName = firstColumn(g, ['name', 'label', 'title']);

    const result = await query(`
      SELECT
        ${concatNameExpr('u', u)} AS nom,
        ${textExpr('u', u, ['email', 'email_address'])} AS email,
        ${textExpr('u', u, ['title', 'job_title', 'position'])} AS titre,
        ${roleExpr} AS role,
        ${canJoinGroups && groupName ? `COALESCE(MAX(g.${groupName}::text), '—')` : `'—'`} AS groupe
      FROM ${tableName} u
      ${canJoinGroups ? `LEFT JOIN groups_users gu ON gu.user_id = u.id LEFT JOIN groups g ON g.id = gu.group_id` : ''}
      ${whereNotDeleted('u', u)}
      ${canJoinGroups ? 'GROUP BY u.id' : ''}
      ${orderBy('u', u)}
      LIMIT 100
    `);

    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/groups', async (_req, res) => {
  try {
    if (!(await hasTable('groups'))) {
      return res.json({ groups: [] });
    }

    const g = await getColumns('groups');
    const hasGroupsUsers = await hasTable('groups_users');
    const gu = hasGroupsUsers ? await getColumns('groups_users') : new Set();
    const canJoinUsers = hasGroupsUsers && hasColumn(g, 'id') && hasColumn(gu, 'group_id') && hasColumn(gu, 'user_id');

    const result = await query(`
      SELECT
        ${textExpr('g', g, ['name', 'label', 'title'])} AS nom,
        ${canJoinUsers ? 'COUNT(gu.user_id)::int' : '0'} AS membres,
        ${textExpr('g', g, ['created_at', 'created_on', 'date_created'])} AS cree_le
      FROM groups g
      ${canJoinUsers ? 'LEFT JOIN groups_users gu ON gu.group_id = g.id' : ''}
      ${whereNotDeleted('g', g)}
      ${canJoinUsers ? 'GROUP BY g.id' : ''}
      ${orderBy('g', g)}
      LIMIT 100
    `);

    res.json({ groups: result.rows });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
