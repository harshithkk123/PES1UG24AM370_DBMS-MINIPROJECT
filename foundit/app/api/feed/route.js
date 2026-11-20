import { NextResponse } from 'next/server';
import { redis, K } from '@/lib/redis';
import { guard } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await guard();
  if (error) return error;
  const items = (await redis.lrange(K.feed, 0, 9)).map((s) => JSON.parse(s));
  return NextResponse.json({ feed: items });
}
