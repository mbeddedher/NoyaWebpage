import { NextResponse } from 'next/server';
import { connectToDatabase } from '~/lib/db';

// GET /api/admin/analytics/activity-events?visitor_id=... OR ?user_id=...
export async function GET(request) {
  const client = await connectToDatabase();
  try {
    const { searchParams } = new URL(request.url);
    const visitorId = searchParams.get('visitor_id');
    const userIdRaw = searchParams.get('user_id');
    const userId = userIdRaw != null ? parseInt(userIdRaw, 10) : NaN;

    if (!visitorId && (isNaN(userId) || userId < 1)) {
      return NextResponse.json({ error: 'visitor_id or user_id is required' }, { status: 400 });
    }

    const result = visitorId
      ? await client.query(
          `
          SELECT
            pe.created_at,
            pe.event_type,
            COALESCE(NULLIF(TRIM(pe.source), ''), '(none)') AS source,
            pe.display_id,
            COALESCE(pd.name, CONCAT('ID ', pe.display_id)) AS product_name
          FROM product_events pe
          LEFT JOIN product_display pd ON pd.id = pe.display_id
          WHERE pe.visitor_id = $1
          ORDER BY pe.created_at DESC
          LIMIT 200
          `,
          [visitorId]
        )
      : await client.query(
          `
          SELECT
            pe.created_at,
            pe.event_type,
            COALESCE(NULLIF(TRIM(pe.source), ''), '(none)') AS source,
            pe.display_id,
            COALESCE(pd.name, CONCAT('ID ', pe.display_id)) AS product_name
          FROM product_events pe
          LEFT JOIN product_display pd ON pd.id = pe.display_id
          WHERE pe.user_id = $1
          ORDER BY pe.created_at DESC
          LIMIT 200
          `,
          [userId]
        );

    return NextResponse.json({ rows: result.rows });
  } catch (e) {
    console.error('Activity events API error:', e);
    return NextResponse.json({ error: 'Failed to load activity events' }, { status: 500 });
  } finally {
    client.release();
  }
}

