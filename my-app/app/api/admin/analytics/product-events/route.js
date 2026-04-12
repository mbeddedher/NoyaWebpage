import { NextResponse } from 'next/server';
import { connectToDatabase } from '~/lib/db';

// GET /api/admin/analytics/product-events?days=7|30|90
export async function GET(request) {
  const client = await connectToDatabase();
  try {
    const { searchParams } = new URL(request.url);
    const daysRaw = Number(searchParams.get('days') || 30);
    const days = Number.isFinite(daysRaw) && daysRaw > 0 && daysRaw <= 365 ? Math.floor(daysRaw) : 30;

    const events = await client.query(
      `
      SELECT
        pe.display_id,
        COALESCE(pd.name, CONCAT('ID ', pe.display_id)) AS product_name,
        COALESCE(pd.popularity_score, 0)::float AS popularity_score,
        COUNT(*) FILTER (WHERE pe.event_type = 'impression')::int AS impressions,
        COUNT(*) FILTER (WHERE pe.event_type = 'click')::int AS clicks,
        COUNT(*) FILTER (WHERE pe.event_type = 'view')::int AS views,
        COUNT(*) FILTER (WHERE pe.event_type = 'add_to_cart')::int AS add_to_cart,
        COUNT(*) FILTER (WHERE pe.event_type = 'purchase')::int AS purchases
      FROM product_events pe
      LEFT JOIN product_display pd ON pd.id = pe.display_id
      WHERE pe.created_at >= NOW() - ($1::text || ' days')::interval
      GROUP BY pe.display_id, pd.name, pd.popularity_score
      ORDER BY (COUNT(*) FILTER (WHERE pe.event_type = 'click')) DESC,
               (COUNT(*) FILTER (WHERE pe.event_type = 'view')) DESC,
               (COUNT(*) FILTER (WHERE pe.event_type = 'impression')) DESC
      LIMIT 200
      `,
      [String(days)]
    );

    const sources = await client.query(
      `
      SELECT
        COALESCE(NULLIF(TRIM(source), ''), '(none)') AS source,
        COUNT(*)::int AS count
      FROM product_events
      WHERE created_at >= NOW() - ($1::text || ' days')::interval
      GROUP BY 1
      ORDER BY count DESC
      LIMIT 50
      `,
      [String(days)]
    );

    return NextResponse.json({
      days,
      top_products: events.rows,
      top_sources: sources.rows,
    });
  } catch (e) {
    console.error('Analytics API error:', e);
    return NextResponse.json({ error: 'Failed to load analytics' }, { status: 500 });
  } finally {
    client.release();
  }
}

