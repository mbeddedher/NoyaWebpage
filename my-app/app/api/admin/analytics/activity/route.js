import { NextResponse } from 'next/server';
import { connectToDatabase } from '~/lib/db';

// GET /api/admin/analytics/activity?kind=visitors|users&days=30
export async function GET(request) {
  const client = await connectToDatabase();
  try {
    const { searchParams } = new URL(request.url);
    const kind = (searchParams.get('kind') || 'visitors').toLowerCase();
    const daysRaw = Number(searchParams.get('days') || 30);
    const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? Math.floor(daysRaw) : 30;

    if (kind !== 'visitors' && kind !== 'users') {
      return NextResponse.json({ error: 'kind must be visitors or users' }, { status: 400 });
    }

    if (kind === 'visitors') {
      const result = await client.query(
        `
        SELECT
          COALESCE(NULLIF(TRIM(visitor_id), ''), '(none)') AS visitor_id,
          COUNT(*)::int AS events,
          COUNT(*) FILTER (WHERE event_type = 'view')::int AS views,
          COUNT(*) FILTER (WHERE event_type = 'click')::int AS clicks,
          MAX(created_at) AS last_activity
        FROM product_events
        WHERE created_at >= NOW() - ($1::text || ' days')::interval
        GROUP BY 1
        ORDER BY events DESC
        LIMIT 200
        `,
        [String(days)]
      );

      return NextResponse.json({ days, kind, rows: result.rows });
    }

    const result = await client.query(
      `
      SELECT
        user_id,
        COUNT(*)::int AS events,
        COUNT(*) FILTER (WHERE event_type = 'view')::int AS views,
        COUNT(*) FILTER (WHERE event_type = 'click')::int AS clicks,
        MAX(created_at) AS last_activity
      FROM product_events
      WHERE user_id IS NOT NULL
        AND created_at >= NOW() - ($1::text || ' days')::interval
      GROUP BY user_id
      ORDER BY events DESC
      LIMIT 200
      `,
      [String(days)]
    );

    return NextResponse.json({ days, kind, rows: result.rows });
  } catch (e) {
    console.error('Activity analytics API error:', e);
    return NextResponse.json({ error: 'Failed to load activity analytics' }, { status: 500 });
  } finally {
    client.release();
  }
}

