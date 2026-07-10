const request = require('supertest');
const { createApp } = require('../src/app.js');
const db = require('../src/db.js');

const app = createApp();

const t1u1 = { 'X-Tenant-Id': 't1', 'X-User-Id': 'u1' };
const t2u1 = { 'X-Tenant-Id': 't2', 'X-User-Id': 'u1' }; // same user id, different tenant on purpose

beforeEach(() => {
  db.reset();
});

describe('auth headers', () => {
  it('rejects requests missing identity headers', async () => {
    const res = await request(app).get('/notifications');
    expect(res.status).toBe(401);
  });
});

describe('tenant isolation', () => {
  it('GET /notifications only returns the caller tenant\'s notifications', async () => {
    const res = await request(app).get('/notifications').set(t1u1);
    expect(res.status).toBe(200);
    const ids = res.body.items.map((n) => n.id);
    expect(ids).toEqual(expect.arrayContaining(['n1', 'n2', 'n3']));
    expect(ids).not.toContain('n4'); // n4 belongs to t2
  });

  it('GET /notifications never returns another tenant\'s data even for the same X-User-Id', async () => {
    // u1 exists conceptually in both tenants here; t2 only has a tenant-wide
    // notification (n4) with no per-user notifications for u1.
    const res = await request(app).get('/notifications').set(t2u1);
    expect(res.status).toBe(200);
    const ids = res.body.items.map((n) => n.id);
    expect(ids).toEqual(['n4']);
    expect(ids).not.toEqual(expect.arrayContaining(['n1', 'n2', 'n3']));
  });

  it('GET /notifications/unread-count is scoped per tenant', async () => {
    const t1Count = await request(app).get('/notifications/unread-count').set(t1u1);
    const t2Count = await request(app).get('/notifications/unread-count').set(t2u1);
    expect(t1Count.body.count).toBe(2); // n1, n2 unread
    expect(t2Count.body.count).toBe(1); // n4 unread
  });

  it('cannot mark another tenant\'s notification as read, even by guessing the id', async () => {
    // t1's user tries to mark t2's notification (n4) as read.
    const res = await request(app).patch('/notifications/n4/read').set(t1u1);
    expect(res.status).toBe(404);

    // Confirm n4 is genuinely untouched by checking it from t2's own session.
    const fromT2 = await request(app).get('/notifications').set(t2u1);
    const n4 = fromT2.body.items.find((n) => n.id === 'n4');
    expect(n4.read).toBe(false);
    expect(n4.readAt).toBeNull();
  });

  it('PATCH /notifications/read-all only marks the caller\'s own tenant read', async () => {
    const res = await request(app).patch('/notifications/read-all').set(t1u1);
    expect(res.status).toBe(200);
    expect(res.body.updatedCount).toBe(2); // n1 + n2 were unread in t1

    // t2's notification must be unaffected.
    const t2Count = await request(app).get('/notifications/unread-count').set(t2u1);
    expect(t2Count.body.count).toBe(1);
  });

  it('a notification addressed to a specific user is invisible to other users in the same tenant', async () => {
    // n2 is addressed to u1 only. A different user in t1 shouldn't see it.
    const res = await request(app)
      .get('/notifications')
      .set({ 'X-Tenant-Id': 't1', 'X-User-Id': 'someone-else' });
    const ids = res.body.items.map((n) => n.id);
    expect(ids).not.toContain('n2');
    expect(ids).toContain('n1'); // tenant-wide notification is still visible
  });
});

describe('ordering', () => {
  it('lists unread first, then newest first within each group', async () => {
    const res = await request(app).get('/notifications').set(t1u1);
    const ids = res.body.items.map((n) => n.id);
    // n1 (unread, 07-01) and n2 (unread, 07-02) come before n3 (read, 06-28).
    // Within unread, newest first: n2 before n1.
    expect(ids).toEqual(['n2', 'n1', 'n3']);
  });
});

describe('create + trigger pipeline', () => {
  it('POST /notifications creates a notification visible to the addressed user only', async () => {
    const createRes = await request(app)
      .post('/notifications')
      .set(t1u1)
      .send({ type: 'new_reply', title: 'Creator replied', body: 'Test body', userId: 'u1' });
    expect(createRes.status).toBe(201);

    const listRes = await request(app).get('/notifications').set(t1u1);
    expect(listRes.body.items[0].id).toBe(createRes.body.id); // newest unread, sorted first
  });

  it('demo trigger endpoints create real notifications through the same service', async () => {
    const res = await request(app)
      .post('/demo/invite-member')
      .set(t1u1)
      .send({ memberName: 'Test Person' });
    expect(res.status).toBe(201);
    expect(res.body.type).toBe('member_invited');
    expect(res.body.userId).toBeNull();

    const countRes = await request(app).get('/notifications/unread-count').set(t1u1);
    expect(countRes.body.count).toBe(3); // n1, n2, + the new one
  });
});
