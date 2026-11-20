import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const [categories, locations] = await Promise.all([
    query('SELECT category_id, name FROM category ORDER BY name'),
    query('SELECT location_id, name FROM location ORDER BY name'),
  ]);
  return NextResponse.json({ categories, locations });
}
