'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, useMe } from '@/lib/client';

export default function ItemPage({ params }) {
  const me = useMe();
  const router = useRouter();
  const [d, setD] = useState(null);
  const [proof, setProof] = useState('');
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => api(`/api/reports/${params.id}`).then(setD).catch((e) => setErr(e.message)), [params.id]);
  useEffect(() => { if (me === null) router.push('/login'); if (me) load(); }, [me, router, load]);

  async function claim(e) {
    e.preventDefault(); setErr(''); setMsg('');
    try { await api('/api/claims', { method: 'POST', body: { report_id: Number(params.id), proof_text: proof } }); setMsg('Claim submitted. Staff will review it.'); load(); }
    catch (x) { setErr(x.message); }
  }
  if (err && !d) return <div className="err">{err}</div>;
  if (!d) return <p className="mute">Loading...</p>;
  const r = d.report;
  const canClaim = me?.role === 'Student' && r.type === 'FOUND' && r.status === 'OPEN' && r.reported_by !== me.id && !d.myClaim;

  return (<>
    <div className="card">
      <h1>{r.title} <span className={`tag ${r.type}`}>{r.type}</span> <span className={`tag ${r.status}`}>{r.status}</span></h1>
      <p>{r.description}</p>
      <p className="mute">{r.category} - {r.location} - {r.report_date} - reported by {r.reporter}</p>
    </div>
    {canClaim && <div className="card"><h2>This is mine - claim it</h2>
      <form className="col" onSubmit={claim}>
        <textarea placeholder="Proof of ownership (what is inside, marks, ID number...)" value={proof} onChange={(e) => setProof(e.target.value)} required />
        <button>Submit claim</button>
      </form>{err && <div className="err">{err}</div>}{msg && <div className="msg">{msg}</div>}
    </div>}
    {d.myClaim && <div className="card">Your claim: <span className={`tag ${d.myClaim.status}`}>{d.myClaim.status}</span> <Link href="/my-claims">View</Link></div>}
    <div className="card"><h2>Suggested matches</h2>
      {d.matches.length ? <table><tbody>{d.matches.map((m) => (
        <tr key={m.report_id}><td><span className={`tag ${m.type}`}>{m.type}</span></td>
          <td><Link href={`/items/${m.report_id}`}>{m.title}</Link></td>
          <td><span className={`tag ${m.status}`}>{m.status}</span></td><td className="mute">score {Number(m.score).toFixed(2)}</td></tr>))}</tbody></table>
        : <span className="mute">No matches yet.</span>}
    </div>
    <div className="card"><h2>History (audit trail)</h2>
      {d.history.map((h, i) => <div key={i} className="mute">{h.changed_at}: {h.old_status || 'created'} {'->'} {h.new_status}</div>)}
    </div>
  </>);
}
