import { getAccessToken, refreshSession, logout } from './auth';
import { API_URL, DEMO_MODE } from '../../lib/config';
import { demoApi } from '../../demo/mockApi';

function normalizeDemoPath(path: string) {
  return path.replace(/^\/api/, '');
}

export async function apiFetch(path: string, options: RequestInit = {}) {
  if (DEMO_MODE) {
    try {
      const data = await demoApi(normalizeDemoPath(path), options);
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(JSON.stringify({ message: error instanceof Error ? error.message : 'Erreur démo' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  const token = getAccessToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });

  if (res.status !== 401) return res;

  const refreshed = await refreshSession();
  if (!refreshed?.token) {
    await logout();
    return res;
  }

  headers.set('Authorization', `Bearer ${refreshed.token}`);
  return fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers,
  });
}
