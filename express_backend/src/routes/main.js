const express = require('express');
const projectSvc = require('../services/project');
const taskSvc = require('../services/task');
const commentSvc = require('../services/comment');
const notificationSvc = require('../services/notification');
const attachmentSvc = require('../services/attachment');
const aiController = require('../controllers/ai');
const { authenticateJWT } = require('../middleware/authMiddleware');

const router = express.Router();

// -- Project CRUD --
/**
 * @swagger
 * /projects:
 *   get:
 *     summary: List all projects for the current user
 *     security: [{ bearerAuth: [] }]
 *     tags: [Projects]
 */
router.get('/projects', authenticateJWT, async (req, res) => {
  const projects = await projectSvc.listProjects(req.user.userId);
  res.json(projects);
});

/**
 * @swagger
 * /projects/{id}:
 *   get:
 *     summary: Get project by id (if permitted)
 *     tags: [Projects]
 */
router.get('/projects/:id', authenticateJWT, async (req, res) => {
  try {
    const p = await projectSvc.getProjectById(req.params.id, req.user.userId);
    res.json(p);
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

router.post('/projects', authenticateJWT, async (req, res) => {
  try {
    const p = await projectSvc.createProject({
      name: req.body.name,
      description: req.body.description,
      ownerId: req.user.userId
    });
    res.status(201).json(p);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/projects/:id', authenticateJWT, async (req, res) => {
  try {
    const p = await projectSvc.updateProject(req.params.id, req.body, req.user.userId);
    res.json(p);
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

router.delete('/projects/:id', authenticateJWT, async (req, res) => {
  try {
    await projectSvc.deleteProject(req.params.id, req.user.userId);
    res.status(204).send();
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// -- Task CRUD --
router.post('/projects/:projectId/tasks', authenticateJWT, async (req, res) => {
  try {
    const t = await taskSvc.createTask({
      ...req.body,
      projectId: req.params.projectId,
      creatorId: req.user.userId
    });
    res.status(201).json(t);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/projects/:projectId/tasks', authenticateJWT, async (req, res) => {
  try {
    const tasks = await taskSvc.listTasksForProject(req.params.projectId, req.user.userId);
    res.json(tasks);
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

router.get('/tasks/:id', authenticateJWT, async (req, res) => {
  try {
    const t = await taskSvc.getTaskById(req.params.id, req.user.userId);
    res.json(t);
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

router.put('/tasks/:id', authenticateJWT, async (req, res) => {
  try {
    const t = await taskSvc.updateTask(req.params.id, req.body, req.user.userId);
    res.json(t);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/tasks/:id', authenticateJWT, async (req, res) => {
  try {
    await taskSvc.deleteTask(req.params.id, req.user.userId);
    res.status(204).send();
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// -- Comments CRUD --
router.post('/tasks/:taskId/comments', authenticateJWT, async (req, res) => {
  try {
    const c = await commentSvc.createComment({
      taskId: req.params.taskId,
      text: req.body.text,
      authorId: req.user.userId
    });
    res.status(201).json(c);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/tasks/:taskId/comments', authenticateJWT, async (req, res) => {
  try {
    const comms = await commentSvc.listCommentsForTask(req.params.taskId, req.user.userId);
    res.json(comms);
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

router.put('/comments/:id', authenticateJWT, async (req, res) => {
  try {
    const c = await commentSvc.updateComment(req.params.id, req.body.text, req.user.userId);
    res.json(c);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/comments/:id', authenticateJWT, async (req, res) => {
  try {
    await commentSvc.deleteComment(req.params.id, req.user.userId);
    res.status(204).send();
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// -- Attachments metadata --
router.post('/tasks/:taskId/attachments', authenticateJWT, async (req, res) => {
  try {
    const att = await attachmentSvc.createAttachment({
      ...req.body,
      taskId: req.params.taskId,
      uploaderId: req.user.userId
    });
    res.status(201).json(att);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.get('/tasks/:taskId/attachments', authenticateJWT, async (req, res) => {
  try {
    const atts = await attachmentSvc.listForTask(req.params.taskId, req.user.userId);
    res.json(atts);
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

router.get('/attachments/:id', authenticateJWT, async (req, res) => {
  try {
    const att = await attachmentSvc.getAttachment(req.params.id, req.user.userId);
    res.json(att);
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// -- Notifications REST --
router.get('/notifications', authenticateJWT, async (req, res) => {
  const notifications = await notificationSvc.getNotificationsForUser(req.user.userId);
  res.json(notifications);
});

router.post('/notifications/:id/read', authenticateJWT, async (req, res) => {
  const notif = await notificationSvc.markAsRead(req.params.id, req.user.userId);
  res.json(notif);
});

// -- AI placeholder endpoints --
router.post('/ai/suggest-tasks', authenticateJWT, aiController.suggestTasks.bind(aiController));
router.get('/ai/daily-summary', authenticateJWT, aiController.dailySummary.bind(aiController));

module.exports = router;
