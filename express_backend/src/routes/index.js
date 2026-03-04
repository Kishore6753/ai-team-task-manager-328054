const express = require('express');
// Add main app routes for projects, tasks, comments, files, notifications, AI
const healthController = require('../controllers/health');
const authRoutes = require('./auth');
const mainRoutes = require('./main');

const router = express.Router();

// Mount auth routes
router.use('/auth', authRoutes);

// Mount main routes for projects/tasks/comments/etc.
router.use('/', mainRoutes);

// Health endpoint
/**
 * @swagger
 * /:
 *   get:
 *     summary: Health endpoint
 *     responses:
 *       200:
 *         description: Service health check passed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 message:
 *                   type: string
 *                   example: Service is healthy
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 environment:
 *                   type: string
 *                   example: development
 */
router.get('/', healthController.check.bind(healthController));

module.exports = router;
