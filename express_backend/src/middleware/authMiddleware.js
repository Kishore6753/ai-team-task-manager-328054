const jwt = require('jsonwebtoken');
const userService = require('../services/user');
const rbacService = require('../services/rbac');

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// PUBLIC_INTERFACE
function authenticateJWT(req, res, next) {
  /** Express middleware: verifies JWT and populates req.user if valid; else 401. */
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header missing' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// PUBLIC_INTERFACE
function requireRole(role) {
  /** Express middleware: user must have the required role globally or for target project. Usage: requireRole('ADMIN'). */
  return async (req, res, next) => {
    const userId = req.user.userId;
    let projectId = req.params.projectId || req.body.projectId;
    const ok = await rbacService.hasRole(userId, role, projectId);
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden: insufficient role' });
    }
    next();
  };
}

// PUBLIC_INTERFACE
function requireAccess(resource, action) {
  /**
   * Express middleware: validates user can perform 'action' on resource type.
   * Usage: requireAccess('project', 'write') (req.params.id required for resource id)
   */
  return async (req, res, next) => {
    const userId = req.user.userId;
    const resourceId =
      req.params.id || req.params.taskId || req.params.projectId || req.body.id;
    const ok = await rbacService.canAccess(userId, resource, resourceId, action);
    if (!ok) {
      return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
    }
    next();
  };
}

module.exports = { authenticateJWT, requireRole, requireAccess };
