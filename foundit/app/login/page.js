'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

export default function Login() {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const router = useRouter();
  async function submit(e) {
    e.preventDefault(); setErr('');
    try { await api('/api/auth/login', { method: 'POST', body: f }); router.push('/'); router.refresh(); }
    catch (x) { setErr(x.message); }
  }
  return (
    <div className="card"><h1>Log in</h1>
      <form className="col" onSubmit={submit}>
        <input placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <input placeholder="Password" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        <button>Log in</button>{err && <div className="err">{err}</div>}
      </form>
      <p className="mute">Demo: student harshith@foundit.edu, staff staff@foundit.edu, admin admin@foundit.edu - password Password@123</p>
    </div>
  );
}
