const app = require('./app');
const notificationSvc = require('./services/notification');
const jwt = require('jsonwebtoken');
const { getUserById } = require('./services/user');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  console.log(`Server running at http://${HOST}:${PORT}`);
});

// --- WebSocket for notifications ---
const wsClients = {}; // userId: [ws, ...]
const WebSocket = require('ws');
const wss = new WebSocket.Server({ server, path: '/ws' });
notificationSvc.setWsClients(wsClients);

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';

// Usage note route for API docs
app.get('/ws-info', (req, res) => {
  res.json({
    websocket_url: '/ws',
    usage: 'Connect to ws://host:port/ws with JWT in query (?token=...) to subscribe to real-time notifications.'
  });
});

/**
 * WebSocket protocol:
 * - clients must provide JWT with ?token=
 * - server pushes {"event":"notification", notification:{...}}
 * - on connection, sends all unread notifications
 */
wss.on('connection', async function connection(ws, req) {
  try {
    const url = require('url');
    const query = url.parse(req.url, true).query;
    const token = query.token;
    if (!token) {
      ws.close(4001, 'Missing token');
      return;
    }
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      ws.close(4002, 'Invalid token');
      return;
    }
    const userId = payload.userId;
    const user = await getUserById(userId);
    if (!user) {
      ws.close(4003, 'Unknown user');
      return;
    }

    ws.userId = userId;
    wsClients[userId] = wsClients[userId] || [];
    wsClients[userId].push(ws);

    // Send all unread notifications on connect
    const unread = (await require('./services/notification').getNotificationsForUser(userId)).filter(n => !n.is_read);
    if (unread.length) {
      ws.send(JSON.stringify({ event: 'notification', batch: unread }));
    }
    console.log(`[WebSocket] User ${userId} connected. Client count: ${wsClients[userId].length}`);

    ws.on('close', () => {
      wsClients[userId] = (wsClients[userId] || []).filter(w => w !== ws);
      if (!wsClients[userId].length) delete wsClients[userId];
      console.log(`[WebSocket] User ${userId} disconnected. Remaining: ${wsClients[userId]?.length||0}`);
    });

    ws.on('message', (data) => {
      // (Optionally: clients could mark notifications as read via ws)
      // For now, ignore.
    });
  } catch (err) {
    ws.close(4000, 'Internal server error');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    wss.close();
    process.exit(0);
  });
});

module.exports = server;
