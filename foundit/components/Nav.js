'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';

export default function Nav() {
  const [me, setMe] = useState(null);
  const path = usePathname();
  const router = useRouter();
  useEffect(() => { api('/api/auth/me').then((d) => setMe(d.user)).catch(() => setMe(null)); }, [path]);
  const staff = me && ['Staff', 'Admin'].includes(me.role);

  async function logout() { await api('/api/auth/logout', { method: 'POST' }); setMe(null); router.push('/login'); }

  return (
    <nav>
      <Link href="/" className="logo">FoundIt</Link>
      {me && <Link href="/">Items</Link>}
      {me && <Link href="/report/new">Report item</Link>}
      {me?.role === 'Student' && <Link href="/my-claims">My claims</Link>}
      {staff && <Link href="/staff">Claim queue</Link>}
      {staff && <Link href="/admin">Dashboard</Link>}
      {me ? (<><span className="mute">{me.name} ({me.role})</span><button className="sec" onClick={logout}>Log out</button></>)
          : (<><Link href="/login">Log in</Link><Link href="/register">Register</Link></>)}
    </nav>
  );
}
