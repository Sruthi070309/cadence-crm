import { useCallback, useEffect, useState } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export const tokenStore = {
  get: () => localStorage.getItem('cadence_token'),
  set: t => localStorage.setItem('cadence_token', t),
  clear: () => localStorage.removeItem('cadence_token')
};

export async function api(path, { method = 'GET', body, params } = {}) {
  const clean = Object.entries(params || {}).filter(([, v]) => v !== '' && v != null && !(Array.isArray(v) && !v.length));
  const qs = clean.length ? '?' + new URLSearchParams(clean) : '';
  const token = tokenStore.get();
  let res;
  try {
    res = await fetch(BASE + path + qs, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
      body: body && JSON.stringify(body)
    });
  } catch {
    throw Object.assign(new Error('Cannot reach the server. Check that the backend is running on port 5000.'), { status: 0 });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.message || 'Something went wrong'), { status: res.status, data });
  return data;
}

// loading / error / data in one place, so every screen handles all states the same way
export function useAsync(fn, deps = []) {
  const [s, setS] = useState({ data: null, loading: true, error: '' });
  const run = useCallback(async () => {
    setS(p => ({ ...p, loading: true, error: '' }));
    try { setS({ data: await fn(), loading: false, error: '' }); }
    catch (e) { setS({ data: null, loading: false, error: e.message }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { run(); }, [run]);
  return { ...s, reload: run };
}
