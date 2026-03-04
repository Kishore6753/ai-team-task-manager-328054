/**
 * NotificationService for DB + WebSocket updates.
 * Contract:
 *  - createNotificationForUser(userId, type, message, data): Notification
 *  - getNotificationsForUser(userId): [Notification]
 *  - markAsRead(notificationId, userId): Notification
 *  - notifyViaWebSocket(userId, payload): void
 */

const db = require('./db');

let wsClients = {}; // userId: [ws, ...]

function setWsClients(ref) {
  wsClients = ref;
}

// PUBLIC_INTERFACE
async function createNotificationForUser(userId, type, message, data = null) {
  const res = await db.query(
    `INSERT INTO notifications (user_id, type, message, data) VALUES ($1,$2,$3,$4)
      RETURNING id, user_id, type, message, data, is_read, created_at`,
    [userId, type, message, data && JSON.stringify(data)]
  );
  // Push to websocket
  if (wsClients[userId]) {
    wsClients[userId].forEach(ws => {
      if (ws.readyState === 1) ws.send(JSON.stringify({ event: 'notification', notification: res.rows[0] }));
    });
  }
  return res.rows[0];
}

// PUBLIC_INTERFACE
async function getNotificationsForUser(userId) {
  const res = await db.query(
    `SELECT id, type, message, data, is_read, created_at 
       FROM notifications WHERE user_id=$1 ORDER BY created_at DESC`,
    [userId]
  );
  return res.rows;
}

// PUBLIC_INTERFACE
async function markAsRead(notificationId, userId) {
  const res = await db.query(
    'UPDATE notifications SET is_read=TRUE WHERE id=$1 AND user_id=$2 RETURNING *',
    [notificationId, userId]
  );
  return res.rows[0];
}

module.exports = {
  createNotificationForUser,
  getNotificationsForUser,
  markAsRead,
  setWsClients
};
