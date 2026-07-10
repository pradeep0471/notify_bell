const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function request(path, { identity, method = 'GET', body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': identity.tenantId,
      'X-User-Id': identity.userId,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  listNotifications: (identity, { page = 1, pageSize = 20 } = {}) =>
    request(`/notifications?page=${page}&pageSize=${pageSize}`, { identity }),

  unreadCount: (identity) => request('/notifications/unread-count', { identity }),

  markRead: (identity, id) =>
    request(`/notifications/${id}/read`, { identity, method: 'PATCH' }),

  markAllRead: (identity) =>
    request('/notifications/read-all', { identity, method: 'PATCH' }),

  // Demo trigger endpoints - simulate real-world events firing.
  inviteMember: (identity, memberName) =>
    request('/demo/invite-member', { identity, method: 'POST', body: { memberName } }),

  creatorReply: (identity, { ownerUserId, creatorName }) =>
    request('/demo/creator-reply', { identity, method: 'POST', body: { ownerUserId, creatorName } }),
};
