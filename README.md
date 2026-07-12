# Notification System — Full-Stack Challenge

A tenant-aware notification system: backend API, two decoupled event triggers, and a
React frontend (bell + dropdown) that polls for updates.

```
notification-system/
├── backend/     Express API + notification service + trigger demo + tests
└── frontend/    Vite + React app (the notification bell)
```

## Note on this repo's git history

This scaffold was generated in one pass, so it's committed as a small number of
logical commits (backend, tests, frontend, docs) rather than a fake multi-day history —
padding timestamps to look like incremental team work over a sprint would be
misleading. If your team adopts this as a starting point, commit as you go from here.

## Quick start

Requires Node.js 18+.

### 1. Backend

```bash
cd backend
npm install
npm start          # http://localhost:4000
```

Sanity check:

```bash
curl -H "X-Tenant-Id: t1" -H "X-User-Id: u1" http://localhost:4000/notifications
```

Run the tenant-isolation tests:

```bash
npm test
```

Run the standalone trigger demo (no server needed — proves the trigger functions are
plain, reusable functions, not HTTP handlers):

```bash
npm run trigger:demo
```

### 2. Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev         # http://localhost:5173
```

Open `http://localhost:5173`. The page has an identity switcher (to demo tenant
isolation live) and two buttons that simulate real events (invite a member / creator
replies) — click one, and the notification appears in the bell within ~20s of polling,
or immediately via "Refresh now."

If your backend runs somewhere other than `localhost:4000`, set
`VITE_API_BASE_URL` in `frontend/.env.local`.

## Design decisions & where things live

- **`backend/src/notificationService.js`** is the only module that touches the data
  store. It has no knowledge of HTTP. Both `routes/notifications.js` (the public API)
  and `triggers/events.js` (the trigger demo) call into it. This is what "triggers are
  decoupled and reusable" means in practice: `POST /notifications` and
  `onCreatorReplied(...)` both end up calling the same `createNotification()`.
- **`backend/src/triggers/events.js`** holds four event handlers (two required by the
  brief, two extra) as plain functions. `triggers/demoRoutes.js` exposes them over
  HTTP for the frontend demo; `triggers/cli.js` calls them directly with no server at
  all, to prove they don't depend on Express.
- **Auth** is the simplified header convention from the brief
  (`X-Tenant-Id` / `X-User-Id`), enforced by `middleware/auth.js`. See the integration
  write-up below for how this would be replaced by real auth.
- **Storage** is a single in-memory array (`backend/src/db.js`), reseeded on every
  process start, matching the brief's seed data exactly. `notificationService.js` is
  deliberately the only file that imports it, so swapping in a real database later is a
  one-file change.
- **Tenant isolation** is enforced in one place: `visibleTo(tenantId, userId)` inside
  `notificationService.js`, used by every read/write path (list, count, mark-read,
  mark-all-read). `markRead` looks up by `(id, tenantId)` together, so a wrong-tenant id
  behaves exactly like a nonexistent id (404), never leaking existence.
- **Frontend** is Vite + React (not Next.js) to keep the demo to a single dev server
  with no SSR concerns — the brief says plain React is fine. `useNotifications.js`
  polls every 20s and does optimistic mark-read/mark-all-read updates.

## Tests

`backend/tests/tenantIsolation.test.js` covers:

- Requests without identity headers are rejected.
- `GET /notifications` never returns another tenant's rows, including the case where
  the *same* `X-User-Id` value happens to exist in both tenants.
- `GET /notifications/unread-count` is scoped per tenant.
- `PATCH /notifications/:id/read` on another tenant's id returns 404 and leaves that
  notification untouched (verified from the owning tenant's own view).
- `PATCH /notifications/read-all` only touches the caller's tenant.
- A notification addressed to a specific user is invisible to a different user in the
  *same* tenant.
- Ordering (unread first, then newest) and the create → list pipeline, including the
  demo trigger endpoints.

---

## Integration write-up: fitting this into a real product

If the agency already had a real product, here's what I'd keep vs. redesign:

**Keep as-is:**
- The notification shape and the `notificationService.js` interface
  (`createNotification`, `listNotifications`, `getUnreadCount`, `markRead`,
  `markAllRead`). These are the contract; nothing above or below them needs to know
  whether storage is an array or Postgres.
- The principle that *nothing calls the datastore directly except one service module*.
  That boundary is what makes the notification system safe to evolve independently of
  everything else.
- The `type` field as an open string rather than an enum baked into the schema — new
  notification types shouldn't require a migration.

**Redesign:**
- **Auth**: replace `middleware/auth.js`'s header trust with real JWT/session
  verification, resolving `tenantId`/`userId` from the verified token instead of
  request headers a client could forge. The rest of the app is unaffected since it only
  ever sees `req.tenantId` / `req.userId`, not the headers themselves.
- **Storage**: move `db.js` to the product's real database, with an index on
  `(tenantId, userId, read, createdAt)` to keep the "unread first, then newest" list
  query fast at scale. I'd also add a hard foreign key or at minimum an application-level
  check tying `tenantId` to the real tenants table, so a bug elsewhere can't insert a
  notification with a tenant that doesn't exist.
- **Triggers → real events**: right now `events.js` functions are called directly and
  synchronously from HTTP handlers. In a real product I'd put an event bus (or even
  just a Postgres `LISTEN/NOTIFY`, or a lightweight job queue like BullMQ) between
  "something happened" and "a notification gets created," so notification creation
  never blocks or fails the primary action (inviting a member shouldn't roll back if
  notification creation throws). Each domain event (deal moved stage, message received,
  report finished) would publish once; a single notification consumer would subscribe
  and translate events into notifications the same way `events.js` does now — the
  translation logic barely changes, only how it's invoked.
- **Delivery**: polling every 20–30s is fine for a demo but wasteful at real scale.
  I'd add a WebSocket or SSE channel per authenticated session, scoped to that user's
  tenant, and use polling only as a fallback for clients that don't keep the socket
  open (e.g. a background tab). This is additive — `notificationService.js` doesn't
  change, only whoever consumes it after a write also pushes to the socket.
- **Pagination & retention**: right now everything lives in memory forever. I'd add
  a retention job (e.g. auto-archive/read-suppress notifications after N days) and
  cursor-based pagination once volumes are large, since offset pagination degrades on
  big tenants.

## What I'd do differently with more time

- Add integration tests for the trigger endpoints end-to-end (event fired → API list
  reflects it) rather than only unit-style service tests — currently one test does
  cover this, but I'd add coverage for all four trigger types.
- Add a WebSocket/SSE channel as described above instead of pure polling — it was
  cut for time given the 7-day/complexity budget of a challenge, not because it's
  hard.
- Persist to SQLite (via better-sqlite3, zero extra infra) instead of an in-memory
  array, so restarting the backend doesn't lose demo state — kept in-memory here purely
  to keep `npm install` minimal and setup foolproof for review.
- Add per-notification "action" metadata (e.g. a deep link to the deal/message the
  notification is about) — the schema in the brief doesn't include it, so I left it out
  rather than inventing fields, but it's the natural next addition for the "they can
  act on it" part of the brief.
- Rate-limit `POST /notifications` and the `/demo/*` endpoints, since right now
  anything with valid-looking headers can create unlimited notifications.
