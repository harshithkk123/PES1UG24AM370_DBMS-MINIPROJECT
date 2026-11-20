import { NextResponse } from 'next/server';
import { query, db } from '@/lib/db';
import { redis, K } from '@/lib/redis';
import { guard, fail, dbError } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/reports?q=&type=&status=&category=   (search + filters)
export async function GET(req) {
  const { error } = await guard();
  if (error) return error;
  const sp = new URL(req.url).searchParams;
  const q = (sp.get('q') || '').trim();
  const where = [];
  const params = [];

  if (q.length >= 3) {                                   // full-text search (InnoDB min token size is 3)
    where.push('MATCH(r.title, r.description) AGAINST (? IN NATURAL LANGUAGE MODE)');
    params.push(q);
  } else if (q.length > 0) {
    where.push('(r.title LIKE ? OR r.description LIKE ?)');
    params.push(`%${q}%`, `%${q}%`);
  }
  if (['LOST', 'FOUND'].includes(sp.get('type'))) { where.push('r.type = ?'); params.push(sp.get('type')); }
  if (['OPEN', 'CLAIMED', 'CLOSED'].includes(sp.get('status'))) { where.push('r.status = ?'); params.push(sp.get('status')); }
  if (Number(sp.get('category'))) { where.push('r.category_id = ?'); params.push(Number(sp.get('category'))); }

  const rows = await query(
    `SELECT r.report_id, r.type, r.title, r.status, r.report_date,
            c.name AS category, l.name AS location, u.name AS reporter
     FROM item_report r
     JOIN category c     ON c.category_id = r.category_id
     JOIN location l     ON l.location_id = r.location_id
     JOIN user_account u ON u.user_id     = r.reported_by
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY r.report_date DESC, r.report_id DESC LIMIT 100`, params);
  return NextResponse.json({ reports: rows });
}

// POST: create a LOST/FOUND report, then compute match suggestions
export async function POST(req) {
  const { user, error } = await guard();
  if (error) return error;
  const b = await req.json().catch(() => ({}));
  if (!['LOST', 'FOUND'].includes(b.type)) return fail('Type must be LOST or FOUND');
  if (!b.title || b.title.trim().length < 3) return fail('Title must be at least 3 characters');
  if (!b.description || b.description.trim().length < 5) return fail('Please describe the item (min 5 characters)');
  if (!Number(b.category_id) || !Number(b.location_id)) return fail('Choose a category and a location');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(b.report_date || '')) return fail('Choose a valid date');

  try {
    const [res] = await db.query(
      `INSERT INTO item_report (reported_by, category_id, location_id, type, title, description, report_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [user.id, Number(b.category_id), Number(b.location_id), b.type, b.title.trim(), b.description.trim(), b.report_date]);
    const id = res.insertId;
    await db.query('CALL suggest_matches(?)', [id]);

    // Redis: recent-reports feed (List, newest first, keep 20) + invalidate cached stats
    await redis.multi()
      .lpush(K.feed, JSON.stringify({ id, type: b.type, title: b.title.trim(), by: user.name }))
      .ltrim(K.feed, 0, 19)
      .del(K.stats)
      .exec();
    return NextResponse.json({ id }, { status: 201 });
  } catch (e) {
    return dbError(e);
  }
}
