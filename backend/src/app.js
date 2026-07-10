const express = require('express');
const cors = require('cors');
const { requireIdentity } = require('./middleware/auth.js');
const notificationsRouter = require('./routes/notifications.js');
const demoTriggersRouter = require('./triggers/demoRoutes.js');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (req, res) => res.json({ ok: true }));

  // Every notification route requires the tenant/user identity headers.
  app.use('/notifications', requireIdentity, notificationsRouter);

  // Demo endpoints simulating real-world events (see triggers/demoRoutes.js).
  // Also identity-scoped since a real event source would know who/what
  // tenant it's acting on behalf of.
  app.use('/demo', requireIdentity, demoTriggersRouter);

  // Central error handler -- service-layer validation errors carry a
  // statusCode (see notificationService.js's `assert`); anything else is a
  // 500 so a bug never leaks a stack trace to the client.
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    const status = err.statusCode || 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: err.message || 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };
