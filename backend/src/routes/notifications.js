const express = require('express');
const service = require('../notificationService.js');

const router = express.Router();

// POST /notifications
// Called by trigger logic normally, but works as a plain endpoint too --
// tenantId/userId in the body are honored so a server-side trigger can
// create a notification for a *different* user than the one making the
// call (e.g. "creator replied" notifies the outreach owner, not whichever
// service account is running the job). Falls back to the caller's own
// identity headers when the body omits them, which keeps manual testing
// with curl simple.
router.post('/', (req, res, next) => {
  try {
    const {
      tenantId = req.tenantId,
      userId = null,
      type,
      title,
      body,
    } = req.body || {};

    const notification = service.createNotification({ tenantId, userId, type, title, body });
    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
});

// GET /notifications?page=1&pageSize=20
router.get('/', (req, res, next) => {
  try {
    const { page, pageSize } = req.query;
    const result = service.listNotifications({
      tenantId: req.tenantId,
      userId: req.userId,
      page,
      pageSize,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /notifications/unread-count
router.get('/unread-count', (req, res, next) => {
  try {
    const count = service.getUnreadCount({ tenantId: req.tenantId, userId: req.userId });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// PATCH /notifications/read-all
// Registered BEFORE /notifications/:id/read so "read-all" is never matched
// as an :id.
router.patch('/read-all', (req, res, next) => {
  try {
    const updated = service.markAllRead({ tenantId: req.tenantId, userId: req.userId });
    res.json({ updatedCount: updated.length });
  } catch (err) {
    next(err);
  }
});

// PATCH /notifications/:id/read
router.patch('/:id/read', (req, res, next) => {
  try {
    const notification = service.markRead({ id: req.params.id, tenantId: req.tenantId });
    if (!notification) {
      // Same response whether the id doesn't exist at all or belongs to
      // another tenant -- never confirm cross-tenant existence.
      return res.status(404).json({ error: 'Notification not found.' });
    }
    res.json(notification);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
