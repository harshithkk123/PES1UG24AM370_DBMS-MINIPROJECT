'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, useMe } from '@/lib/client';

export default function Staff() {
  const me = useMe();
  const router = useRouter();
  const [claims, setClaims] = useState(null);
  const [otp, setOtp] = useState({});
  const [err, setErr] = useState('');
  const load = useCallback(() => api('/api/claims').then((d) => setClaims(d.claims)).catch((e) => setErr(e.message)), []);
  useEffect(() => {
    if (me === null) router.push('/login');
    else if (me && me.role === 'Student') router.push('/');
    else if (me) load();
  }, [me, router, load]);

  async function act(id, action, body) {
    setErr('');
    try { await api(`/api/claims/${id}/${action}`, { method: 'POST', body }); load(); } catch (x) { setErr(x.message); }
  }
  if (!claims) return <p className="mute">Loading...</p>;
  return (
    <div className="card"><h1>Claim queue</h1>{err && <div className="err">{err}</div>}
      <table><thead><tr><th>Item</th><th>Claimant / proof</th><th>Status</th><th>Action</th></tr></thead><tbody>
        {claims.map((c) => (
          <tr key={c.claim_id}>
            <td><Link href={`/items/${c.report_id}`}>{c.title}</Link></td>
            <td>{c.claimant}<div className="mute">{c.proof_text}</div></td>
            <td><span className={`tag ${c.status}`}>{c.status}</span><div className="mute">item {c.item_status}</div></td>
            <td>
              {c.status === 'PENDING' && (<div className="row">
                <button onClick={() => act(c.claim_id, 'approve')}>Approve</button>
                <button className="bad" onClick={() => act(c.claim_id, 'reject')}>Reject</button></div>)}
              {c.status === 'APPROVED' && c.item_status === 'CLAIMED' && (<div className="row">
                <input size="8" placeholder="Student OTP" value={otp[c.claim_id] || ''} onChange={(e) => setOtp({ ...otp, [c.claim_id]: e.target.value })} />
                <button onClick={() => act(c.claim_id, 'handover', { otp: otp[c.claim_id] })}>Hand over</button></div>)}
            </td>
          </tr>))}
        {!claims.length && <tr><td colSpan="4" className="mute">No claims yet.</td></tr>}
      </tbody></table>
    </div>
  );
}
