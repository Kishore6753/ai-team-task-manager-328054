/**
 * TaskService: CRUD for tasks, Kanban-flow logic.
 * Contract:
 *   - createTask({ projectId, title, description, status, assigneeId, creatorId, dueDate }) => Task
 *   - getTaskById(id, userId) => Task|null
 *   - listTasksForProject(projectId, userId) => [Task]
 *   - updateTask(id, updates, userId) => Task
 *   - deleteTask(id, userId)
 */

const db = require('./db');
const rbac = require('./rbac');

const LoggerTag = '[TaskService]';

// PUBLIC_INTERFACE
async function createTask({
  projectId,
  title,
  description,
  status = 'todo',
  assigneeId,
  creatorId,
  dueDate
}) {
  // Only members/PMs/admins can create for a project
  if (!(await rbac.canAccess(creatorId, 'project', projectId, 'write')))
    throw new Error('No permission');
  if (!title) throw new Error('Task title required');
  const res = await db.query(
    `INSERT INTO tasks 
      (project_id, title, description, status, assignee_id, creator_id, due_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING id, project_id, title, description, status, assignee_id, creator_id, due_date, created_at, updated_at`,
    [projectId, title, description, status, assigneeId, creatorId, dueDate]
  );
  console.log(LoggerTag, `Task ${res.rows[0].id} created by user ${creatorId}`);
  return res.rows[0];
}

// PUBLIC_INTERFACE
async function getTaskById(id, userId) {
  const task = (
    await db.query(
      'SELECT * FROM tasks WHERE id=$1',
      [id]
    )
  ).rows[0];
  if (!task) return null;
  if (!(await rbac.canAccess(userId, 'task', id, 'read'))) throw new Error('No access');
  return task;
}

// PUBLIC_INTERFACE
async function listTasksForProject(projectId, userId) {
  // Check read permission
  if (!(await rbac.canAccess(userId, 'project', projectId, 'read')))
    throw new Error('No access');
  const res = await db.query(
    'SELECT * FROM tasks WHERE project_id=$1 ORDER BY created_at DESC',
    [projectId]
  );
  return res.rows;
}

// PUBLIC_INTERFACE
async function updateTask(id, updates, userId) {
  const task = await getTaskById(id, userId);
  if (!task) throw new Error('Task not found');
  if (!(await rbac.canAccess(userId, 'task', id, 'write')))
    throw new Error('No permission');
  const fields = [];
  const vals = [];
  let idx = 1;
  for (const [k, v] of Object.entries(updates)) {
    fields.push(`${k}=$${idx++}`);
    vals.push(v);
  }
  vals.push(id);
  // Example: fields = ['title=$1', 'status=$2'] WHERE id=$3
  const sql = `UPDATE tasks SET ${fields.join(', ')}, updated_at=NOW() WHERE id=${
    idx
  } RETURNING *`;
  const res = await db.query(sql, vals);
  console.log(LoggerTag, `Task ${id} updated by user ${userId}`);
  return res.rows[0];
}

// PUBLIC_INTERFACE
async function deleteTask(id, userId) {
  const task = await getTaskById(id, userId);
  if (!task) throw new Error('Task not found');
  if (!(await rbac.canAccess(userId, 'task', id, 'delete')))
    throw new Error('No permission');
  await db.query('DELETE FROM tasks WHERE id=$1', [id]);
  console.log(LoggerTag, `Task ${id} deleted by user ${userId}`);
}

module.exports = {
  createTask,
  getTaskById,
  listTasksForProject,
  updateTask,
  deleteTask
};
