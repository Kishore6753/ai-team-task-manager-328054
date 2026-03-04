/**
 * ProjectService provides CRUD operations for Projects.
 * Contract:
 *   - createProject({ name, description, ownerId }): Project
 *   - getProjectById(id): Project | null
 *   - listProjects(userId): [Project]
 *   - updateProject(id, updates, userId): Project
 *   - deleteProject(id, userId): void
 */

const db = require('./db');
const rbac = require('./rbac');
const LoggerTag = '[ProjectService]';

// PUBLIC_INTERFACE
async function createProject({ name, description, ownerId }) {
  if (!name) throw new Error('Project name required');
  const res = await db.query(
    `INSERT INTO projects (name, description, owner_id) 
     VALUES ($1, $2, $3)
     RETURNING id, name, description, owner_id, created_at, updated_at`,
    [name, description, ownerId]
  );
  // Add owner as admin in user_roles
  await db.query(
    `INSERT INTO user_roles (user_id, role_id, project_id)
      SELECT $1, r.id, $2 FROM roles r WHERE r.name='ADMIN'`,
    [ownerId, res.rows[0].id]
  );
  console.log(LoggerTag, `Created project ${res.rows[0].id} by user ${ownerId}`);
  return res.rows[0];
}

// PUBLIC_INTERFACE
async function getProjectById(id, userId) {
  const project = (
    await db.query(
      'SELECT id, name, description, owner_id, created_at, updated_at FROM projects WHERE id = $1',
      [id]
    )
  ).rows[0];
  if (!project) return null;

  // check read access
  if (!(await rbac.canAccess(userId, 'project', id, 'read'))) {
    throw new Error('No access');
  }
  return project;
}

// PUBLIC_INTERFACE
async function listProjects(userId) {
  // Return all projects where user has any role
  const res = await db.query(
    `SELECT p.id, p.name, p.description, p.owner_id, p.created_at, p.updated_at
     FROM projects p
       JOIN user_roles ur ON ur.project_id = p.id
     WHERE ur.user_id=$1`,
    [userId]
  );
  return res.rows;
}

// PUBLIC_INTERFACE
async function updateProject(id, updates, userId) {
  // Only admins/project managers allowed
  if (!(await rbac.canAccess(userId, 'project', id, 'write')))
    throw new Error('No write permission');

  const project = await getProjectById(id, userId); // Also checks read access
  if (!project) throw new Error('Project not found');
  const { name = project.name, description = project.description } = updates;
  const res = await db.query(
    `UPDATE projects SET name=$1, description=$2, updated_at=NOW() WHERE id = $3
     RETURNING id, name, description, owner_id, created_at, updated_at`,
    [name, description, id]
  );
  console.log(LoggerTag, `Updated project ${id} by user ${userId}`);
  return res.rows[0];
}

// PUBLIC_INTERFACE
async function deleteProject(id, userId) {
  // Only admins/project managers
  if (!(await rbac.canAccess(userId, 'project', id, 'delete')))
    throw new Error('No delete permission');
  await db.query('DELETE FROM projects WHERE id=$1', [id]);
  console.log(LoggerTag, `Deleted project ${id} by user ${userId}`);
}

module.exports = {
  createProject,
  getProjectById,
  listProjects,
  updateProject,
  deleteProject
};
