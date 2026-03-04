const db = require('./db');

/**
 * RBAC Service module.
 * Provides role-based access validation for resources.
 * Contract:
 *   - hasRole(userId, role: string): returns Boolean
 *   - canAccess(userId, resourceType, resourceId, action): returns Boolean
 */

// Helper to get all roles for a user (global and per-project)
async function getUserRoles(userId, projectId = null) {
  // If projectId provided, check for project-specific roles; otherwise, get global roles.
  if (projectId) {
    const res = await db.query(
      `SELECT r.name
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1 AND ur.project_id = $2`,
      [userId, projectId]
    );
    return res.rows.map(r => r.name);
  } else {
    const res = await db.query(
      `SELECT r.name
         FROM user_roles ur
         JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = $1`,
      [userId]
    );
    return res.rows.map(r => r.name);
  }
}

// PUBLIC_INTERFACE
async function hasRole(userId, role, projectId = null) {
  /** Returns true if the user has the role, global or for a given project. */
  const roles = await getUserRoles(userId, projectId);
  return roles.includes(role);
}

// PUBLIC_INTERFACE
async function canAccess(userId, resource, resourceId, action) {
  /** Returns true if the user may 'action' (e.g., read, write, delete) the resource (project/task/comment/etc.) */
  // Admins can do everything
  const globalRoles = await getUserRoles(userId);
  if (globalRoles.includes('ADMIN')) return true;

  // Project-specific RBAC
  let projectId = null;
  if (resource === 'project') projectId = resourceId;
  else if (['task', 'comment', 'attachment'].includes(resource)) {
    // fetch projectId by task/comment/attachment id
    let queryStr, idParam;
    if (resource === 'task') {
      queryStr = 'SELECT project_id FROM tasks WHERE id = $1';
      idParam = resourceId;
    } else if (resource === 'comment') {
      queryStr = 'SELECT project_id FROM comments WHERE id = $1';
      idParam = resourceId;
    } else if (resource === 'attachment') {
      queryStr = 'SELECT project_id FROM attachments WHERE id = $1';
      idParam = resourceId;
    }
    const r = await db.query(queryStr, [idParam]);
    if (!r.rows.length) return false;
    projectId = r.rows[0].project_id;
  }

  const roles = await getUserRoles(userId, projectId);
  // Map actions to required roles
  const permissionMatrix = {
    read: ['ADMIN', 'PROJECT_MANAGER', 'MEMBER', 'VIEWER'],
    write: ['ADMIN', 'PROJECT_MANAGER', 'MEMBER'],
    delete: ['ADMIN', 'PROJECT_MANAGER'],
    comment: ['ADMIN', 'PROJECT_MANAGER', 'MEMBER'],
    attach: ['ADMIN', 'PROJECT_MANAGER', 'MEMBER'],
  };
  // Determine required roles for action
  const neededRoles = permissionMatrix[action] || [];
  return roles.some(r => neededRoles.includes(r));
}

module.exports = { getUserRoles, hasRole, canAccess };
