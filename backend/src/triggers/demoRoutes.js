const express = require('express');
const events = require('./events.js');

/**
 * These are NOT part of the "real" notification API (that's
 * routes/notifications.js). They exist purely so the pipeline can be
 * demoed end-to-end without a real invite flow / inbox / report generator
 * behind them: hit one of these, and it simulates that event happening and
 * fires the matching trigger from events.js.
 */

const router = express.Router();

// POST /demo/invite-member  { memberName }
// -> tenant-wide notification (userId: null)
router.post('/invite-member', (req, res, next) => {
  try {
    const { memberName } = req.body || {};
    if (!memberName) return res.status(400).json({ error: 'memberName is required' });

    const notification = events.onMemberInvited({
      tenantId: req.tenantId,
      memberName,
      invitedByUserId: req.userId,
    });
    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
});

// POST /demo/creator-reply  { ownerUserId, creatorName }
// -> notification addressed to a specific user
router.post('/creator-reply', (req, res, next) => {
  try {
    const { ownerUserId, creatorName } = req.body || {};
    if (!ownerUserId || !creatorName) {
      return res.status(400).json({ error: 'ownerUserId and creatorName are required' });
    }

    const notification = events.onCreatorReplied({
      tenantId: req.tenantId,
      ownerUserId,
      creatorName,
    });
    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
});

// POST /demo/report-ready  { requestedByUserId, reportName }
router.post('/report-ready', (req, res, next) => {
  try {
    const { requestedByUserId, reportName } = req.body || {};
    if (!requestedByUserId || !reportName) {
      return res.status(400).json({ error: 'requestedByUserId and reportName are required' });
    }

    const notification = events.onReportReady({
      tenantId: req.tenantId,
      requestedByUserId,
      reportName,
    });
    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
});

// POST /demo/deal-stage-changed  { dealName, fromStage, toStage }
router.post('/deal-stage-changed', (req, res, next) => {
  try {
    const { dealName, fromStage, toStage } = req.body || {};
    if (!dealName || !fromStage || !toStage) {
      return res.status(400).json({ error: 'dealName, fromStage and toStage are required' });
    }

    const notification = events.onDealStageChanged({
      tenantId: req.tenantId,
      dealName,
      fromStage,
      toStage,
    });
    res.status(201).json(notification);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
