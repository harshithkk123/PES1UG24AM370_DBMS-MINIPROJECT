import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { guard, fail } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(_req, { params }) {
  const { error } = await guard(['Staff', 'Admin']);
  if (error) return error;
  const r = await query("UPDATE claim SET status = 'REJECTED' WHERE claim_id = ? AND status = 'PENDING'", [Number(params.id)]);
  if (!r.affectedRows) return fail('Claim not found or not pending', 404);
  return NextResponse.json({ ok: true });
}
