/**
 * Standalone demo: fires trigger events directly, with no HTTP server
 * involved at all. Run with `npm run trigger:demo`.
 *
 * This uses its own in-memory store (this is a separate Node process from
 * `npm start`), so it won't show up in the running server/frontend -- its
 * only purpose is to prove that events.js's trigger functions are plain
 * functions with no dependency on Express, callable from anywhere
 * (a script, a queue consumer, a test). For the frontend demo, use the
 * `/demo/*` HTTP endpoints instead (see triggers/demoRoutes.js), which
 * write into the same store the API/frontend read from.
 */

const events = require('./events.js');
const service = require('../notificationService.js');

function line() {
  console.log('-'.repeat(60));
}

function show(label, notification) {
  console.log(`\n[${label}]`);
  console.log(`  id:      ${notification.id}`);
  console.log(`  tenant:  ${notification.tenantId}`);
  console.log(`  userId:  ${notification.userId ?? '(tenant-wide)'}`);
  console.log(`  type:    ${notification.type}`);
  console.log(`  title:   ${notification.title}`);
  console.log(`  body:    ${notification.body}`);
}

line();
console.log('Notification trigger demo (in-process, no server required)');
line();

// Event 1: a new team member is invited -> tenant-wide notification
const invited = events.onMemberInvited({
  tenantId: 't1',
  memberName: 'Alex Chen',
  invitedByUserId: 'u1',
});
show('member_invited', invited);

// Event 2: a creator replies to outreach -> notification for one user
const replied = events.onCreatorReplied({
  tenantId: 't1',
  ownerUserId: 'u1',
  creatorName: 'Jordan Lee',
});
show('new_reply', replied);

// Event 3 (bonus): a deal changes pipeline stage -> tenant-wide notification
const dealMoved = events.onDealStageChanged({
  tenantId: 't1',
  dealName: 'Nova x Aria Skincare',
  fromStage: 'Negotiating',
  toStage: 'Contract Sent',
});
show('deal_stage_changed', dealMoved);

line();
console.log(
  `u1 in t1 now sees ${service.getUnreadCount({ tenantId: 't1', userId: 'u1' })} unread notification(s).`
);
line();
