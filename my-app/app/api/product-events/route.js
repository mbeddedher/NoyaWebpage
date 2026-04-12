import { NextResponse } from 'next/server';
import { connectToDatabase } from '~/lib/db';

const VALID_EVENT_TYPES = [
  'impression',
  'click',
  'view',
  'add_to_cart',
  'purchase',
  // card-level interactions (stronger than impression, weaker than click/view)
  'gallery_interact',
  'size_select',
];

export async function POST(request) {
  let client;

  try {
    const body = await request.json();
    const { display_id, event_type, session_id, visitor_id, user_id, source } = body;

    const displayId = display_id != null ? parseInt(display_id, 10) : NaN;
    if (isNaN(displayId) || displayId < 1) {
      return NextResponse.json(
        { error: 'display_id is required and must be a positive integer' },
        { status: 400 }
      );
    }

    if (!event_type || !VALID_EVENT_TYPES.includes(event_type)) {
      return NextResponse.json(
        { error: `event_type must be one of: ${VALID_EVENT_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    const sessionId = typeof session_id === 'string' ? session_id : null;
    const visitorId = typeof visitor_id === 'string' ? visitor_id : null;
    const userId = user_id != null ? parseInt(user_id, 10) : null;
    const sourceStr = typeof source === 'string' && source.trim() ? source.trim() : null;

    client = await connectToDatabase();

    const safeUserId = isNaN(userId) ? null : userId;

    try {
      // New schema (with visitor_id)
      await client.query(
        `INSERT INTO product_events (display_id, event_type, session_id, visitor_id, user_id, source)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [displayId, event_type, sessionId, visitorId, safeUserId, sourceStr]
      );
    } catch (err) {
      // Backward compatibility: DB without visitor_id column
      if (err?.code === '42703' && String(err?.message || '').includes('visitor_id')) {
        await client.query(
          `INSERT INTO product_events (display_id, event_type, session_id, user_id, source)
           VALUES ($1, $2, $3, $4, $5)`,
          [displayId, event_type, sessionId, safeUserId, sourceStr]
        );
      } else {
        throw err;
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Product events API error:', error);
    return NextResponse.json(
      { error: 'Failed to record product event' },
      { status: 500 }
    );
  } finally {
    if (client) client.release();
  }
}
