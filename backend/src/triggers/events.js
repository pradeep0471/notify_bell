const service = require('../notificationService.js');

/**
 * Each function here represents a "real world event" translated into a
 * notification. They only depend on notificationService, never on
 * Express -- so the exact same functions get called from:
 *   - triggers/demoRoutes.js  (HTTP endpoints, for the frontend demo)
 *   - triggers/cli.js         (a standalone script, for a terminal demo)
 *   - a real event bus / job queue, in production (see README.md)
 *
 * That's the "decoupled and reusable" requirement from the brief: adding a
 * third trigger scenario means adding one function here, not touching the
 * HTTP layer.
 */

/** Event: a new team member was invited into the tenant. Tenant-wide notification. */
function onMemberInvited({ tenantId, memberName, invitedByUserId }) {
  return service.createNotification({
    tenantId,
    userId: null, // visible to everyone in the tenant
    type: 'member_invited',
    title: 'New team member',
    body: `${memberName} joined the team${invitedByUserId ? ` (invited by ${invitedByUserId})` : ''}`,
  });
}

/** Event: a creator replied to an outreach message. Notifies the specific outreach owner. */
function onCreatorReplied({ tenantId, ownerUserId, creatorName }) {
  return service.createNotification({
    tenantId,
    userId: ownerUserId, // addressed to one person
    type: 'new_reply',
    title: 'Creator replied',
    body: `${creatorName} replied to your outreach message`,
  });
}

/** Event: a scheduled/async report finished generating. Notifies whoever requested it. */
function onReportReady({ tenantId, requestedByUserId, reportName }) {
  return service.createNotification({
    tenantId,
    userId: requestedByUserId,
    type: 'report_ready',
    title: 'Report ready',
    body: `${reportName} is ready to view`,
  });
}

/** Event: a deal moved to a new pipeline stage. Tenant-wide (anyone watching the board sees it). */
function onDealStageChanged({ tenantId, dealName, fromStage, toStage }) {
  return service.createNotification({
    tenantId,
    userId: null,
    type: 'deal_stage_changed',
    title: 'Deal updated',
    body: `${dealName} moved from "${fromStage}" to "${toStage}"`,
  });
}

module.exports = {
  onMemberInvited,
  onCreatorReplied,
  onReportReady,
  onDealStageChanged,
};
