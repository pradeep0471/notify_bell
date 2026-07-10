import { useState } from 'react';
import { NotificationBell } from './components/NotificationBell.jsx';
import { useNotifications } from './hooks/useNotifications.js';
import { api } from './api.js';

const IDENTITIES = [
  { key: 't1-u1', tenantId: 't1', userId: 'u1', label: 'Nova Talent — u1', sub: 'sees n1, n2, n3' },
  { key: 't1-u2', tenantId: 't1', userId: 'u2', label: 'Nova Talent — u2', sub: 'sees n1 only (n2/n3 addressed to u1)' },
  { key: 't2-u1', tenantId: 't2', userId: 'u1', label: 'Bright Star — u1', sub: 'different tenant entirely' },
];

export default function App() {
  const [identityKey, setIdentityKey] = useState(IDENTITIES[0].key);
  const identity = IDENTITIES.find((i) => i.key === identityKey);
  const { items, unreadCount, loading, error, refresh, markRead, markAllRead } =
    useNotifications(identity);

  const [firing, setFiring] = useState(null);

  async function fireInvite() {
    setFiring('invite');
    try {
      await api.inviteMember(identity, 'Alex Chen');
      await refresh();
    } finally {
      setFiring(null);
    }
  }

  async function fireReply() {
    setFiring('reply');
    try {
      await api.creatorReply(identity, { ownerUserId: identity.userId, creatorName: 'Jordan Lee' });
      await refresh();
    } finally {
      setFiring(null);
    }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">N</span>
          <span className="brand-word">NOVA</span>
        </div>
        <NotificationBell
          items={items}
          unreadCount={unreadCount}
          loading={loading}
          error={error}
          onMarkRead={markRead}
          onMarkAllRead={markAllRead}
        />
      </header>

      <main className="content">
        <section className="panel">
          <h1>Notification system demo</h1>
          <p className="lede">
            This is the reference client from the challenge — a minimal CRM shell whose only job
            is to exercise the bell. Switch identities to see tenant isolation live, or fire an
            event to watch a notification appear via polling within ~20 seconds (or click{' '}
            <em>Refresh</em>).
          </p>

          <div className="control-row">
            <label className="control-label" htmlFor="identity-select">
              Viewing as
            </label>
            <select
              id="identity-select"
              className="identity-select"
              value={identityKey}
              onChange={(e) => setIdentityKey(e.target.value)}
            >
              {IDENTITIES.map((i) => (
                <option key={i.key} value={i.key}>
                  {i.label}
                </option>
              ))}
            </select>
            <span className="identity-sub">{identity.sub}</span>
          </div>

          <div className="control-row">
            <button className="btn" onClick={fireInvite} disabled={firing !== null}>
              {firing === 'invite' ? 'Firing…' : 'Simulate: invite a team member'}
            </button>
            <button className="btn" onClick={fireReply} disabled={firing !== null}>
              {firing === 'reply' ? 'Firing…' : 'Simulate: creator replies'}
            </button>
            <button className="btn btn-quiet" onClick={refresh}>
              Refresh now
            </button>
          </div>

          <p className="hint">
            Headers sent with every request: <code>X-Tenant-Id: {identity.tenantId}</code>{' '}
            <code>X-User-Id: {identity.userId}</code>
          </p>
        </section>
      </main>
    </div>
  );
}
