import { useEffect, useRef, useState } from 'react';
import { relativeTime } from '../relativeTime.js';

const TYPE_LABEL = {
  member_invited: 'Team',
  new_reply: 'Reply',
  report_ready: 'Report',
  deal_stage_changed: 'Deal',
};

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 3a5.5 5.5 0 0 0-5.5 5.5v2.6c0 .58-.2 1.14-.57 1.59L4.6 14.6c-.75.9-.1 2.25 1.06 2.25h12.68c1.16 0 1.81-1.35 1.06-2.25l-1.33-1.9a2.5 2.5 0 0 1-.57-1.6V8.5A5.5 5.5 0 0 0 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

export function NotificationBell({ items, unreadCount, loading, error, onMarkRead, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="bell-wrap" ref={panelRef}>
      <button
        className="bell-button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications, ${unreadCount} unread`}
        aria-expanded={open}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
        )}
      </button>

      {open && (
        <div className="bell-panel" role="menu">
          <div className="bell-panel-header">
            <span className="bell-panel-title">Notifications</span>
            <button
              className="bell-mark-all"
              onClick={onMarkAllRead}
              disabled={unreadCount === 0}
            >
              Mark all read
            </button>
          </div>

          <div className="bell-panel-body">
            {loading && <div className="bell-empty">Loading…</div>}
            {!loading && error && <div className="bell-empty bell-error">Couldn't load notifications: {error}</div>}
            {!loading && !error && items.length === 0 && (
              <div className="bell-empty">Nothing here yet. You're all caught up.</div>
            )}
            {!loading &&
              !error &&
              items.map((n) => (
                <button
                  key={n.id}
                  className={`bell-item ${n.read ? 'is-read' : 'is-unread'}`}
                  onClick={() => !n.read && onMarkRead(n.id)}
                >
                  <span className="bell-item-dot" aria-hidden="true" />
                  <span className="bell-item-content">
                    <span className="bell-item-top">
                      <span className="bell-item-type">{TYPE_LABEL[n.type] || n.type}</span>
                      <span className="bell-item-time">{relativeTime(n.createdAt)}</span>
                    </span>
                    <span className="bell-item-title">{n.title}</span>
                    <span className="bell-item-body">{n.body}</span>
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
