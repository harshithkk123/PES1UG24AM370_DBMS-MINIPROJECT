import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { fail, dbError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  const { name, email, password } = await req.json().catch(() => ({}));
  if (!name || name.trim().length < 2) return fail('Name must be at least 2 characters');
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) return fail('Enter a valid email');
  if (!password || password.length < 8) return fail('Password must be at least 8 characters');
  try {
    const hash = await bcrypt.hash(password, 10);
    // Self-registration always creates a Student. Staff/Admin are created by an admin in the database.
    await query('INSERT INTO user_account (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
      [name.trim(), email.trim().toLowerCase(), hash, 'Student']);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}
