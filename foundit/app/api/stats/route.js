import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { redis, K } from '@/lib/redis';
import { guard } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await guard(['Staff', 'Admin']);
  if (error) return error;

  // Hash cache: counts are recomputed from MySQL only when the cache is empty/expired
  let counts = await redis.hgetall(K.stats);
  let cached = true;
  if (!counts || !counts.total) {
    cached = false;
    const [c] = await query(
      `SELECT COUNT(*) AS total, SUM(status='OPEN') AS open_items,
              SUM(status='CLAIMED') AS claimed, SUM(status='CLOSED') AS closed FROM item_report`);
    counts = { total: c.total, open_items: c.open_items || 0, claimed: c.claimed || 0, closed: c.closed || 0 };
    await redis.multi().hset(K.stats, counts).expire(K.stats, 60).exec();
  }
  const [pending] = await query("SELECT COUNT(*) AS n FROM claim WHERE status = 'PENDING'");
  const byCategory = await query('SELECT * FROM v_recovery_by_category ORDER BY recovery_pct DESC');
  const byLocation = await query(
    `SELECT l.name AS location, COUNT(*) AS reports FROM item_report r
     JOIN location l ON l.location_id = r.location_id GROUP BY l.name HAVING COUNT(*) >= 1
     ORDER BY reports DESC LIMIT 5`);
  const raw = await redis.zrevrange(K.finders, 0, 4, 'WITHSCORES');
  const finders = [];
  for (let i = 0; i < raw.length; i += 2) finders.push({ name: raw[i], returned: Number(raw[i + 1]) });

  return NextResponse.json({ counts, cached, pendingClaims: pending.n, byCategory, byLocation, finders });
}
