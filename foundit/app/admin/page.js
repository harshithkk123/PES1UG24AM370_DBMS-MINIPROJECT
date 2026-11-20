'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, useMe } from '@/lib/client';

export default function Admin() {
  const me = useMe();
  const router = useRouter();
  const [s, setS] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => {
    if (me === null) router.push('/login');
    else if (me && me.role === 'Student') router.push('/');
    else if (me) api('/api/stats').then(setS).catch((e) => setErr(e.message));
  }, [me, router]);
  if (err) return <div className="err">{err}</div>;
  if (!s) return <p className="mute">Loading...</p>;
  const c = s.counts;
  return (<>
    <h1>Dashboard <span className="tag mute">{s.cached ? 'served from Redis cache' : 'computed from MySQL'}</span></h1>
    <div className="stats">
      <div className="stat"><b>{c.total}</b>Total reports</div><div className="stat"><b>{c.open_items}</b>Open</div>
      <div className="stat"><b>{c.claimed}</b>Awaiting handover</div><div className="stat"><b>{c.closed}</b>Returned</div>
      <div className="stat"><b>{s.pendingClaims}</b>Pending claims</div>
    </div>
    <div className="card"><h2>Recovery rate by category (SQL view)</h2>
      <table><thead><tr><th>Category</th><th>Reports</th><th>Returned</th><th>Rate</th></tr></thead><tbody>
        {s.byCategory.map((r) => <tr key={r.category}><td>{r.category}</td><td>{r.total_reports}</td><td>{r.recovered}</td><td>{r.recovery_pct}%</td></tr>)}</tbody></table></div>
    <div className="card"><h2>Busiest locations</h2>
      {s.byLocation.map((r) => <div key={r.location}>{r.location}: {r.reports} reports</div>)}</div>
    <div className="card"><h2>Top finders (Redis sorted set)</h2>
      {s.finders.length ? s.finders.map((f, i) => <div key={f.name}>#{i + 1} {f.name} - {f.returned} item(s) returned</div>) : <span className="mute">No returns yet.</span>}</div>
  </>);
}
