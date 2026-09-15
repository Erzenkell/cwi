import { DEMO_MODE, API_URL } from '../../lib/config';
import { DEMO_AUTH } from '../mockApi';

const TOKEN_KEY = 'crm_access_token';

export function getAccessToken() {
  if (DEMO_MODE) return DEMO_AUTH.token;
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string) {
  if (!DEMO_MODE) localStorage.setItem(TOKEN_KEY, token);
}

export function clearAccessToken() {
  if (!DEMO_MODE) localStorage.removeItem(TOKEN_KEY);
}

export async function refreshSession() {
  if (DEMO_MODE) {
    return DEMO_AUTH;
  }

  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    clearAccessToken();
    return null;
  }

  const data = await response.json();
  if (data?.token) setAccessToken(data.token);
  return data;
}

export async function logout() {
  if (DEMO_MODE) {
    return;
  }

  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  clearAccessToken();
}
