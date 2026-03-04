/**
 * AttachmentService manages file attachment metadata.
 * Contract: createAttachment({taskId, filename, mimetype, size, uploaderId, url}), getAttachment(id, userId), listForTask(taskId, userId)
 */
const db = require('./db');
const rbac = require('./rbac');
const LoggerTag = '[AttachmentService]';

// PUBLIC_INTERFACE
async function createAttachment({ taskId, filename, mimetype, size, uploaderId, url }) {
  // Only members/etc. can attach
  if (!filename || !url) throw new Error('Filename and URL required');
  const projectIdRes = await db.query('SELECT project_id FROM tasks WHERE id = $1', [taskId]);
  if (!projectIdRes.rows.length) throw new Error('Task not found');
  const projectId = projectIdRes.rows[0].project_id;
  if (!(await rbac.canAccess(uploaderId, 'project', projectId, 'attach')))
    throw new Error('No attachment permission');
  const res = await db.query(
    `INSERT INTO attachments (task_id, filename, mimetype, size, uploader_id, url)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, task_id, filename, mimetype, size, uploader_id, url, created_at`,
    [taskId, filename, mimetype, size, uploaderId, url]
  );
  console.log(LoggerTag, `Attachment ${res.rows[0].id} uploaded by ${uploaderId}`);
  return res.rows[0];
}

// PUBLIC_INTERFACE
async function getAttachment(id, userId) {
  const att = (
    await db.query('SELECT * FROM attachments WHERE id = $1', [id])
  ).rows[0];
  if (!att) throw new Error('Attachment not found');
  if (!(await rbac.canAccess(userId, 'attachment', id, 'read')))
    throw new Error('No access');
  return att;
}

// PUBLIC_INTERFACE
async function listForTask(taskId, userId) {
  // Must have read perm on task
  if (!(await rbac.canAccess(userId, 'task', taskId, 'read')))
    throw new Error('No access');
  const res = await db.query(
    'SELECT * FROM attachments WHERE task_id = $1 ORDER BY created_at ASC',
    [taskId]
  );
  return res.rows;
}

module.exports = {
  createAttachment,
  getAttachment,
  listForTask
};
