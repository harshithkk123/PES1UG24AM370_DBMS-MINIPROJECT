import { NextResponse } from 'next/server';
import { db, query } from '@/lib/db';
import { redis, K } from '@/lib/redis';
import { guard, fail, dbError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Staff enter the OTP the student shows. If it matches: item -> CLOSED and the finder earns a point.
export async function POST(req, { params }) {
  const { error } = await guard(['Staff', 'Admin']);
  if (error) return error;
  const id = Number(params.id);
  const { otp } = await req.json().catch(() => ({}));
  const stored = await redis.get(K.otp(id));
  if (!stored) return fail('OTP expired or claim not approved', 400);
  if (String(otp).trim() !== stored) return fail('Wrong OTP', 400);

  const [row] = await query(
    `SELECT r.report_id, u.name AS finder FROM claim cl
     JOIN item_report r ON r.report_id = cl.report_id
     JOIN user_account u ON u.user_id = r.reported_by
     WHERE cl.claim_id = ? AND cl.status = 'APPROVED'`, [id]);
  if (!row) return fail('Claim not approved', 400);

  try {
    await db.query("UPDATE item_report SET status = 'CLOSED' WHERE report_id = ?", [row.report_id]);
    await redis.multi()
      .del(K.otp(id))
      .zincrby(K.finders, 1, row.finder)      // Sorted Set leaderboard of finders
      .del(K.stats)
      .exec();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return dbError(e);
  }
}
