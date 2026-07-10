import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api.js';

const POLL_INTERVAL_MS = 20000;

export function useNotifications(identity) {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const identityRef = useRef(identity);
  identityRef.current = identity;

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const [list, count] = await Promise.all([
        api.listNotifications(identityRef.current),
        api.unreadCount(identityRef.current),
      ]);
      setItems(list.items);
      setUnreadCount(count.count);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // Re-run whenever the identity (tenant/user) changes, and reset polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity.tenantId, identity.userId, refresh]);

  const markRead = useCallback(
    async (id) => {
      // Optimistic update so the UI feels instant, then reconcile with the server.
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
      try {
        await api.markRead(identityRef.current, id);
      } finally {
        refresh();
      }
    },
    [refresh]
  );

  const markAllRead = useCallback(async () => {
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    try {
      await api.markAllRead(identityRef.current);
    } finally {
      refresh();
    }
  }, [refresh]);

  return { items, unreadCount, loading, error, refresh, markRead, markAllRead };
}
