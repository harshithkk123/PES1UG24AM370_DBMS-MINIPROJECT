'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client';

export default function Register() {
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const router = useRouter();
  async function submit(e) {
    e.preventDefault(); setErr('');
    try { await api('/api/auth/register', { method: 'POST', body: f }); router.push('/login'); }
    catch (x) { setErr(x.message); }
  }
  return (
    <div className="card"><h1>Create student account</h1>
      <form className="col" onSubmit={submit}>
        <input placeholder="Full name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required />
        <input placeholder="Email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
        <input placeholder="Password (min 8 chars)" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required />
        <button>Register</button>{err && <div className="err">{err}</div>}
      </form>
    </div>
  );
}
