'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, useMe } from '@/lib/client';

export default function NewReport() {
  const me = useMe();
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const [lk, setLk] = useState({ categories: [], locations: [] });
  const [f, setF] = useState({ type: 'LOST', title: '', description: '', category_id: '', location_id: '', report_date: today });
  const [err, setErr] = useState('');

  useEffect(() => { if (me === null) router.push('/login'); }, [me, router]);
  useEffect(() => { if (me) api('/api/lookups').then(setLk); }, [me]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault(); setErr('');
    try { const d = await api('/api/reports', { method: 'POST', body: f }); router.push(`/items/${d.id}`); }
    catch (x) { setErr(x.message); }
  }
  if (!me) return <p className="mute">Loading...</p>;
  return (
    <div className="card"><h1>Report an item</h1>
      <form className="col" onSubmit={submit}>
        <select value={f.type} onChange={set('type')}><option value="LOST">I lost something</option><option value="FOUND">I found something</option></select>
        <input placeholder="Title (e.g. Black wallet)" value={f.title} onChange={set('title')} required />
        <textarea placeholder="Describe it: colour, brand, marks, contents..." value={f.description} onChange={set('description')} required />
        <select value={f.category_id} onChange={set('category_id')} required><option value="">Category</option>{lk.categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}</select>
        <select value={f.location_id} onChange={set('location_id')} required><option value="">Location</option>{lk.locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}</select>
        <input type="date" max={today} value={f.report_date} onChange={set('report_date')} required />
        <button>Submit report</button>{err && <div className="err">{err}</div>}
      </form>
    </div>
  );
}
