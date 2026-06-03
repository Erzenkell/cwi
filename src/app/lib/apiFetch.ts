import { getAccessToken, refreshSession, logout } from './auth';

const API_BASE = 'http://localhost:4000/api';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = getAccessToken();

  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (res.status !== 401) {
    return res;
  }

  const refreshed = await refreshSession();

  if (!refreshed?.token) {
    await logout();
    return res;
  }

  headers.set('Authorization', `Bearer ${refreshed.token}`);

  res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  return res;
}