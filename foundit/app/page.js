'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, useMe } from '@/lib/client';

export default function Home() {
  const me = useMe();
  const router = useRouter();
  const [lk, setLk] = useState({ categories: [], locations: [] });
  const [filters, setFilters] = useState({ q: '', type: '', status: '', category: '' });
  const [rows, setRows] = useState([]);
  const [feed, setFeed] = useState([]);
  const [err, setErr] = useState('');

  useEffect(() => { if (me === null) router.push('/login'); }, [me, router]);
  useEffect(() => { if (me) api('/api/lookups').then(setLk); }, [me]);
  useEffect(() => {
    if (!me) return;
    const t = setTimeout(() => {
      const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
      api('/api/reports?' + qs).then((d) => setRows(d.reports)).catch((e) => setErr(e.message));
    }, 250);
    return () => clearTimeout(t);
  }, [me, filters]);
  useEffect(() => { if (me) api('/api/feed').then((d) => setFeed(d.feed)).catch(() => {}); }, [me]);

  if (!me) return <p className="mute">Loading...</p>;
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (<>
    <div className="card">
      <h1>Lost &amp; found items</h1>
      <div className="row">
        <input placeholder="Search e.g. black wallet" value={filters.q} onChange={set('q')} />
        <select value={filters.type} onChange={set('type')}><option value="">Lost + Found</option><option>LOST</option><option>FOUND</option></select>
        <select value={filters.status} onChange={set('status')}><option value="">Any status</option><option>OPEN</option><option>CLAIMED</option><option>CLOSED</option></select>
        <select value={filters.category} onChange={set('category')}><option value="">All categories</option>{lk.categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}</select>
      </div>
      {err && <div className="err">{err}</div>}
      <table><thead><tr><th>Type</th><th>Item</th><th>Category</th><th>Location</th><th>Date</th><th>Status</th></tr></thead>
        <tbody>{rows.map((r) => (
          <tr key={r.report_id}>
            <td><span className={`tag ${r.type}`}>{r.type}</span></td>
            <td><Link href={`/items/${r.report_id}`}>{r.title}</Link><div className="mute">by {r.reporter}</div></td>
            <td>{r.category}</td><td>{r.location}</td><td>{r.report_date}</td>
            <td><span className={`tag ${r.status}`}>{r.status}</span></td>
          </tr>))}
          {!rows.length && <tr><td colSpan="6" className="mute">No items found.</td></tr>}
        </tbody></table>
    </div>
    <div className="card"><h2>Recent activity (Redis feed)</h2>
      {feed.length ? feed.map((f, i) => <div key={i}><span className={`tag ${f.type}`}>{f.type}</span> {f.title} <span className="mute">- {f.by}</span></div>) : <span className="mute">Nothing yet.</span>}
    </div>
  </>);
}
