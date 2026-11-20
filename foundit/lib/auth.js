import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { redis, K } from './redis';

export const SESSION_SECONDS = 60 * 60; // 1 hour

export async function getUser() {
  const sid = cookies().get('sid')?.value;
  if (!sid) return null;
  const raw = await redis.get(K.session(sid));
  return raw ? JSON.parse(raw) : null;
}

// Usage: const { user, error } = await guard(['Staff','Admin']); if (error) return error;
export async function guard(roles) {
  const user = await getUser();
  if (!user) return { error: NextResponse.json({ error: 'Please log in' }, { status: 401 }) };
  if (roles && !roles.includes(user.role))
    return { error: NextResponse.json({ error: 'Not allowed for your role' }, { status: 403 }) };
  return { user };
}

export function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Turns MySQL errors (trigger SIGNAL, CHECK, UNIQUE, FK) into friendly messages
export function dbError(e) {
  if (e.code === 'ER_DUP_ENTRY') return fail('That record already exists', 409);
  if (e.sqlState === '45000') return fail(e.sqlMessage, 400);          // our trigger/procedure messages
  if (e.code === 'ER_CHECK_CONSTRAINT_VIOLATED') return fail('Value rejected by a database rule', 400);
  if (e.code === 'ER_NO_REFERENCED_ROW_2') return fail('Invalid reference (category/location/user)', 400);
  console.error(e);
  return fail('Server error', 500);
}
