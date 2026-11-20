'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, useMe } from '@/lib/client';

export default function MyClaims() {
  const me = useMe();
  const router = useRouter();
  const [claims, setClaims] = useState(null);
  useEffect(() => { if (me === null) router.push('/login'); if (me) api('/api/claims').then((d) => setClaims(d.claims)); }, [me, router]);
  if (!claims) return <p className="mute">Loading...</p>;
  return (
    <div className="card"><h1>My claims</h1>
      {claims.map((c) => (
        <div key={c.claim_id} className="card">
          <b><Link href={`/items/${c.report_id}`}>{c.title}</Link></b> <span className={`tag ${c.status}`}>{c.status}</span>
          <div className="mute">{c.proof_text}</div>
          {c.otp && <p>Show this code at the security desk to collect your item: <span className="otp">{c.otp}</span></p>}
        </div>))}
      {!claims.length && <span className="mute">You have not claimed anything yet.</span>}
    </div>
  );
}
