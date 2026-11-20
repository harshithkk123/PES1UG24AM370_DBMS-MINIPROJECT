'use client';
import { useEffect, useState } from 'react';

export async function api(url, opts = {}) {
  const res = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json' },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// Returns undefined while loading, null if logged out, or the user object
export function useMe() {
  const [me, setMe] = useState(undefined);
  useEffect(() => { api('/api/auth/me').then((d) => setMe(d.user)).catch(() => setMe(null)); }, []);
  return me;
}
