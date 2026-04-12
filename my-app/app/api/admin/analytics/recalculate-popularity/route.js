import { NextResponse } from 'next/server';
import { connectToDatabase } from '~/lib/db';

function assertCronAuth(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return; // allow if not configured (dev)
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${secret}`) {
    throw new Error('Unauthorized');
  }
}

// POST /api/admin/analytics/recalculate-popularity
// Recalculates product_display.popularity_score based on product_events:
// - 30d base + extra weight for last 7d
// - per-event weights
// - source multipliers to reduce homepage/showcase inflation
export async function POST(request) {
  const client = await connectToDatabase();
  try {
    assertCronAuth(request);
    const result = await client.query(`SELECT recalculate_popularity_score() AS updated`);
    return NextResponse.json({ ok: true, updated: result.rows?.[0]?.updated ?? null });
  } catch (e) {
    if (String(e?.message || '').includes('Unauthorized')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Recalculate popularity error:', e);
    return NextResponse.json({ ok: false, error: 'Failed to recalculate popularity' }, { status: 500 });
  } finally {
    client.release();
  }
}

// Vercel Cron calls GET by default
export async function GET(request) {
  return POST(request);
}

