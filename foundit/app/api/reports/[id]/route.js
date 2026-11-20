import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { guard, fail } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { user, error } = await guard();
  if (error) return error;
  const id = Number(params.id);

  const [report] = await query(
    `SELECT r.*, c.name AS category, l.name AS location, u.name AS reporter
     FROM item_report r
     JOIN category c ON c.category_id = r.category_id
     JOIN location l ON l.location_id = r.location_id
     JOIN user_account u ON u.user_id = r.reported_by
     WHERE r.report_id = ?`, [id]);
  if (!report) return fail('Report not found', 404);

  const matches = await query(
    `SELECT m.score, o.report_id, o.title, o.type, o.status
     FROM match_suggestion m
     JOIN item_report o ON o.report_id = IF(m.lost_report_id = ?, m.found_report_id, m.lost_report_id)
     WHERE m.lost_report_id = ? OR m.found_report_id = ?
     ORDER BY m.score DESC LIMIT 5`, [id, id, id]);

  const history = await query('SELECT old_status, new_status, changed_at FROM report_log WHERE report_id = ? ORDER BY log_id', [id]);
  const myClaim = (await query('SELECT claim_id, status FROM claim WHERE report_id = ? AND claimant_id = ?', [id, user.id]))[0] || null;
  return NextResponse.json({ report, matches, history, myClaim });
}
