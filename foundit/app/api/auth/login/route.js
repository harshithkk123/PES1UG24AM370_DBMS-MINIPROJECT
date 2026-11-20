import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { redis, K } from '@/lib/redis';
import { fail, SESSION_SECONDS } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return fail('Email and password required');
  const mail = email.trim().toLowerCase();

  // Redis rate limit: max 5 failed attempts per 5 minutes per email
  const failKey = K.loginFail(mail);
  if (Number((await redis.get(failKey)) || 0) >= 5) return fail('Too many attempts. Try again in 5 minutes.', 429);

  const rows = await query('SELECT user_id, name, email, role, password_hash FROM user_account WHERE email = ?', [mail]);
  const u = rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash))) {
    await redis.multi().incr(failKey).expire(failKey, 300).exec();
    return fail('Invalid email or password', 401);
  }
  await redis.del(failKey);

  const sid = crypto.randomUUID();
  const user = { id: u.user_id, name: u.name, email: u.email, role: u.role };
  await redis.set(K.session(sid), JSON.stringify(user), 'EX', SESSION_SECONDS);   // String with expiry

  const res = NextResponse.json({ user });
  res.cookies.set('sid', sid, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: SESSION_SECONDS });
  return res;
}
