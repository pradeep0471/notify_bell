const { nanoid } = require('nanoid');
const db = require('./db.js');

/**
 * This module is the single place that knows how to create, read, and
 * update notifications. Both the HTTP routes (routes/notifications.js) and
 * the trigger demo (triggers/*) call into it -- neither of them touches
 * db.js directly. That's the "decoupled and reusable" requirement from the
 * brief: any future event source (a queue consumer, a cron job, a webhook
 * handler) can call `createNotification` the same way an HTTP request does.
 */

const VALID_TYPES_HINT =
  'type should be a short machine-readable string, e.g. "new_reply"';

function assert(condition, message) {
  if (!condition) {
    const err = new Error(message);
    err.statusCode = 400;
    throw err;
  }
}

/**
 * Create a notification.
 * userId === null (or omitted) => visible to everyone in the tenant.
 * userId === '<id>'            => visible only to that user.
 */
function createNotification({ tenantId, userId = null, type, title, body }) {
  assert(typeof tenantId === 'string' && tenantId.length > 0, 'tenantId is required');
  assert(typeof type === 'string' && type.length > 0, `type is required (${VALID_TYPES_HINT})`);
  assert(typeof title === 'string' && title.length > 0, 'title is required');
  assert(typeof body === 'string' && body.length > 0, 'body is required');
  assert(userId === null || typeof userId === 'string', 'userId must be a string or null');

  const notification = {
    id: nanoid(),
    tenantId,
    userId: userId || null,
    type,
    title,
    body,
    read: false,
    createdAt: new Date().toISOString(),
    readAt: null,
  };

  db.insert(notification);
  return notification;
}

/** Notifications visible to a given tenant+user: tenant-wide (userId null) + addressed to them. */
function visibleTo(tenantId, userId) {
  return db
    .all()
    .filter((n) => n.tenantId === tenantId && (n.userId === null || n.userId === userId));
}

function sortUnreadFirstThenNewest(list) {
  return [...list].sort((a, b) => {
    if (a.read !== b.read) return a.read ? 1 : -1; // unread (false) first
    return new Date(b.createdAt) - new Date(a.createdAt); // newest first
  });
}

function listNotifications({ tenantId, userId, page = 1, pageSize = 20 }) {
  const sorted = sortUnreadFirstThenNewest(visibleTo(tenantId, userId));
  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20));
  const start = (safePage - 1) * safePageSize;
  const items = sorted.slice(start, start + safePageSize);

  return {
    items,
    page: safePage,
    pageSize: safePageSize,
    total: sorted.length,
    totalPages: Math.max(1, Math.ceil(sorted.length / safePageSize)),
  };
}

function getUnreadCount({ tenantId, userId }) {
  return visibleTo(tenantId, userId).filter((n) => !n.read).length;
}

/**
 * Mark a single notification read. Returns null if it doesn't exist OR
 * belongs to a different tenant -- callers should turn that into a 404,
 * never leaking whether the id exists in another tenant.
 */
function markRead({ id, tenantId }) {
  const notification = db.all().find((n) => n.id === id && n.tenantId === tenantId);
  if (!notification) return null;
  if (!notification.read) {
    notification.read = true;
    notification.readAt = new Date().toISOString();
  }
  return notification;
}

function markAllRead({ tenantId, userId }) {
  const now = new Date().toISOString();
  const updated = visibleTo(tenantId, userId)
    .filter((n) => !n.read)
    .map((n) => {
      n.read = true;
      n.readAt = now;
      return n;
    });
  return updated;
}

module.exports = {
  createNotification,
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};
