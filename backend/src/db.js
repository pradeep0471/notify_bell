/**
 * In-memory "database" for the notification system.
 *
 * The challenge only asks for a runnable demo, not a production database,
 * so we keep everything in memory and reseed on every process start. The
 * shape of `notifications` matches the JSON structure from the brief
 * exactly, which makes swapping this out for a real DB (Postgres, Mongo,
 * etc.) later a matter of replacing this module's functions, not the
 * callers -- see notificationService.js, which is the only file that
 * touches this store directly.
 */

const SEED_NOTIFICATIONS = [
  { id: 'n1', tenantId: 't1', userId: null, type: 'member_invited', title: 'New team member', body: 'Sarah joined Nova Talent', read: false, createdAt: '2026-07-01T09:00:00Z', readAt: null },
  { id: 'n2', tenantId: 't1', userId: 'u1', type: 'new_reply', title: 'Creator replied', body: 'Priya Sharma replied to your outreach message', read: false, createdAt: '2026-07-02T14:30:00Z', readAt: null },
  { id: 'n3', tenantId: 't1', userId: 'u1', type: 'report_ready', title: 'Report ready', body: 'Your July campaign report is ready to view', read: true, createdAt: '2026-06-28T08:00:00Z', readAt: '2026-06-28T10:00:00Z' },
  { id: 'n4', tenantId: 't2', userId: null, type: 'member_invited', title: 'New team member', body: 'James joined Bright Star Agency', read: false, createdAt: '2026-07-01T09:05:00Z', readAt: null },
];

let notifications = [];

function reset() {
  // Deep-clone the seed so mutations never leak into the constant above.
  notifications = SEED_NOTIFICATIONS.map((n) => ({ ...n }));
}

reset();

module.exports = {
  // Exposed as a live reference on purpose: notificationService reads/writes
  // through these helpers rather than reaching into the array directly, but
  // tests occasionally want a raw reset.
  all: () => notifications,
  insert: (notification) => {
    notifications.push(notification);
    return notification;
  },
  reset,
};
