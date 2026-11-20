import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { redis, K } from '@/lib/redis';

export const dynamic = 'force-dynamic';

export async function POST() {
  const sid = cookies().get('sid')?.value;
  if (sid) await redis.del(K.session(sid));
  const res = NextResponse.json({ ok: true });
  res.cookies.set('sid', '', { path: '/', maxAge: 0 });
  return res;
}
