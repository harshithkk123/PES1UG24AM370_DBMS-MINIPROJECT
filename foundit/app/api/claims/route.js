import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { redis, K } from '@/lib/redis';
import { guard, fail, dbError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET: Students see their own claims (with OTP once approved). Staff/Admin see all claims.
export async function GET() {
  const { user, error } = await guard();
  if (error) return error;
  const staff = ['Staff', 'Admin'].includes(user.role);
  const rows = await query(
    `SELECT cl.claim_id, cl.report_id, cl.proof_text, cl.status, cl.created_at,
            r.title, r.status AS item_status, u.name AS claimant
     FROM claim cl
     JOIN item_report r  ON r.report_id = cl.report_id
     JOIN user_account u ON u.user_id   = cl.claimant_id
     ${staff ? '' : 'WHERE cl.claimant_id = ?'}
     ORDER BY FIELD(cl.status,'PENDING','APPROVED','REJECTED'), cl.created_at DESC`,
    staff ? [] : [user.id]);

  if (!staff) {                              // only the claimant ever sees the OTP
    for (const c of rows) {
      if (c.status === 'APPROVED' && c.item_status === 'CLAIMED') c.otp = await redis.get(K.otp(c.claim_id));
    }
  }
  return NextResponse.json({ claims: rows });
}

// POST: a student claims a FOUND item (rules enforced by trigger trg_claim_before_insert + UNIQUE)
export async function POST(req) {
  const { user, error } = await guard(['Student']);
  if (error) return error;
  const { report_id, proof_text } = await req.json().catch(() => ({}));
  if (!Number(report_id)) return fail('Missing report');
  if (!proof_text || proof_text.trim().length < 5) return fail('Describe proof of ownership (min 5 characters)');
  try {
    await query('INSERT INTO claim (report_id, claimant_id, proof_text) VALUES (?, ?, ?)',
      [Number(report_id), user.id, proof_text.trim()]);
    await redis.del(K.stats);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e) {
    return dbError(e);
  }
}
