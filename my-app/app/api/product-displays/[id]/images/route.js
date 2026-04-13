import { connectToDatabase } from '~/lib/db';
import { publicImageUrl } from '~/lib/imageUrls';

/**
 * GET /api/product-displays/[id]/images
 * Returns only image thumb URLs for card hover gallery. Lightweight.
 */
export async function GET(request, { params }) {
  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing display id' }), { status: 400 });
  }

  const client = await connectToDatabase();
  try {
    const result = await client.query(
      `SELECT thumb_url, original_url, is_primary, order_index
       FROM images
       WHERE display_id = $1
         AND COALESCE(hide, FALSE) = FALSE
         AND COALESCE(in_thumb, TRUE) = TRUE
       ORDER BY is_primary DESC, order_index, id`,
      [id]
    );

    const images = (result.rows || []).map((row) => ({
      thumb_url: row.thumb_url ? publicImageUrl(row.thumb_url) : null,
      original_url: row.original_url ? publicImageUrl(row.original_url) : null,
      is_primary: row.is_primary || false,
    }));

    return new Response(JSON.stringify({ images }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error fetching product images:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch images', details: err.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    client.release();
  }
}
