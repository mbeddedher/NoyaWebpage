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

// POST /api/admin/analytics/rollup-product-events
// Creates/updates product_event_daily rollups from product_events (last 31 days).
export async function POST(request) {
  const client = await connectToDatabase();
  try {
    assertCronAuth(request);

    await client.query('BEGIN');

    const upsert = await client.query(`SELECT rollup_product_events() AS upserted`);

    await client.query('COMMIT');
    return NextResponse.json({ ok: true, upserted: upsert.rows?.[0]?.upserted ?? null });
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    if (String(e?.message || '').includes('Unauthorized')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Rollup product events error:', e);
    return NextResponse.json({ ok: false, error: 'Failed to roll up product events' }, { status: 500 });
  } finally {
    client.release();
  }
}

// Vercel Cron calls GET by default
export async function GET(request) {
  return POST(request);
}

