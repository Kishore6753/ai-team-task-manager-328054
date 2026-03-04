/**
 * CommentService: CRUD for comments.
 * Contract: createComment({ taskId, text, authorId }), listForTask(taskId, userId), updateComment(id, ...), deleteComment(id, ...)
 */

const db = require('./db');
const rbac = require('./rbac');

const LoggerTag = '[CommentService]';

// PUBLIC_INTERFACE
async function createComment({ taskId, text, authorId }) {
  // Must be member/pm/admin on task's project
  if (!text) throw new Error('Comment text required');
  const projectIdRes = await db.query('SELECT project_id FROM tasks WHERE id = $1', [taskId]);
  if (!projectIdRes.rows.length) throw new Error('Task not found');
  const projectId = projectIdRes.rows[0].project_id;
  if (!(await rbac.canAccess(authorId, 'project', projectId, 'comment')))
    throw new Error('No comment permission');
  const res = await db.query(
    `INSERT INTO comments (task_id, author_id, text) VALUES ($1,$2,$3)
     RETURNING id, task_id, author_id, text, created_at, updated_at`,
    [taskId, authorId, text]
  );
  console.log(LoggerTag, `Comment ${res.rows[0].id} by user ${authorId}`);
  return res.rows[0];
}

// PUBLIC_INTERFACE
async function listCommentsForTask(taskId, userId) {
  // Must be able to read task
  if (!(await rbac.canAccess(userId, 'task', taskId, 'read')))
    throw new Error('No access to comments');
  const res = await db.query(
    `SELECT c.id, c.task_id, c.author_id, c.text, c.created_at, c.updated_at, u.username
      FROM comments c
      JOIN users u ON c.author_id = u.id
      WHERE c.task_id=$1
      ORDER BY c.created_at ASC`,
    [taskId]
  );
  return res.rows;
}

// PUBLIC_INTERFACE
async function updateComment(id, text, userId) {
  // Only author (or admin/pm on project) can edit
  const comment = (await db.query('SELECT * FROM comments WHERE id=$1', [id])).rows[0];
  if (!comment) throw new Error('Comment not found');
  if (comment.author_id !== userId) {
    // fallback to project PM/admin
    const projectId = (await db.query('SELECT project_id FROM tasks WHERE id=$1', [comment.task_id])).rows[0].project_id;
    if (!(await rbac.canAccess(userId, 'project', projectId, 'write')))
      throw new Error('No permission');
  }
  const res = await db.query(
    'UPDATE comments SET text=$1, updated_at=NOW() WHERE id=$2 RETURNING *',
    [text, id]
  );
  console.log(LoggerTag, `Comment ${id} updated by user ${userId}`);
  return res.rows[0];
}

// PUBLIC_INTERFACE
async function deleteComment(id, userId) {
  const comment = (await db.query('SELECT * FROM comments WHERE id=$1', [id])).rows[0];
  if (!comment) throw new Error('Comment not found');
  if (comment.author_id !== userId) {
    // fallback to project PM/admin
    const projectId = (await db.query('SELECT project_id FROM tasks WHERE id=$1', [comment.task_id])).rows[0].project_id;
    if (!(await rbac.canAccess(userId, 'project', projectId, 'delete')))
      throw new Error('No permission');
  }
  await db.query('DELETE FROM comments WHERE id = $1', [id]);
  console.log(LoggerTag, `Comment ${id} deleted by user ${userId}`);
}

module.exports = {
  createComment,
  listCommentsForTask,
  updateComment,
  deleteComment
};
