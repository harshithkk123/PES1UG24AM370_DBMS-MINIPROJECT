import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';
import { redis, K } from '@/lib/redis';
import { guard, dbError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(_req, { params }) {
  const { error } = await guard(['Staff', 'Admin']);
  if (error) return error;
  const id = Number(params.id);
  try {
    await db.query('CALL approve_claim(?)', [id]);          // transaction inside the stored procedure
    const otp = String(crypto.randomInt(100000, 1000000));
    await redis.set(K.otp(id), otp, 'EX', 60 * 60 * 24);    // OTP valid 24h, then Redis deletes it
    await redis.del(K.stats);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}
