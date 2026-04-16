import { NextResponse } from 'next/server';
import { connectToDatabase } from '~/lib/db';

/**
 * GET ?search=&limit=
 * Minimal fields for blog admin: pick product_display.id for related products.
 */
export async function GET(request) {
  let client;
  let released = false;
  const release = async () => {
    if (client && !released) {
      try {
        await client.release();
        released = true;
      } catch (e) {
        console.error('release client:', e);
      }
    }
  };

  try {
    const { searchParams } = new URL(request.url);
    const raw = String(searchParams.get('search') ?? '').trim();
    const limitRaw = Number(searchParams.get('limit'));
    const limit = Math.min(80, Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 25));

    client = await connectToDatabase();

    const safe = raw.replace(/[%_\\]/g, ' ').trim();
    if (raw && !safe && !/^\d+$/.test(raw)) {
      await release();
      return NextResponse.json({ products: [] });
    }

    if (!raw) {
      const { rows } = await client.query(
        `SELECT pd.id, pd.name, pd.brand, pd.status, wc.name AS category_name
         FROM product_display pd
         LEFT JOIN web_categories wc ON pd.category_id = wc.id
         ORDER BY pd.created_at DESC
         LIMIT $1`,
        [limit]
      );
      await release();
      return NextResponse.json({ products: rows });
    }

    const pattern = `%${safe}%`;
    const idNum = /^\d+$/.test(raw) ? Number(raw) : null;

    let sql;
    let params;
    if (idNum != null && Number.isFinite(idNum) && idNum > 0) {
      sql = `SELECT pd.id, pd.name, pd.brand, pd.status, wc.name AS category_name
             FROM product_display pd
             LEFT JOIN web_categories wc ON pd.category_id = wc.id
             WHERE pd.id = $1 OR pd.name ILIKE $2 OR pd.brand ILIKE $2
             ORDER BY CASE WHEN pd.id = $1 THEN 0 ELSE 1 END, pd.name ASC NULLS LAST
             LIMIT $3`;
      params = [idNum, pattern, limit];
    } else {
      sql = `SELECT pd.id, pd.name, pd.brand, pd.status, wc.name AS category_name
             FROM product_display pd
             LEFT JOIN web_categories wc ON pd.category_id = wc.id
             WHERE pd.name ILIKE $1 OR pd.brand ILIKE $1
             ORDER BY pd.name ASC NULLS LAST
             LIMIT $2`;
      params = [pattern, limit];
    }

    const { rows } = await client.query(sql, params);
    await release();
    return NextResponse.json({ products: rows });
  } catch (error) {
    console.error('admin blog product-displays GET:', error);
    await release();
    return NextResponse.json(
      { error: error?.message || 'Failed to load products' },
      { status: 500 }
    );
  }
}
