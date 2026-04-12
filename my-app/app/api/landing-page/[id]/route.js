import { NextResponse } from 'next/server';
import { connectToDatabase } from '~/lib/db';

export async function GET(request, { params }) {
  let client;
  let isReleased = false;

  const releaseClient = async () => {
    if (client && !isReleased) {
      try {
        await client.release();
        isReleased = true;
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
      }
    }
  };

  try {
    const id = params.id;
    client = await connectToDatabase();

    // Query to get product details with images, variants, and category path
    const query = `
      WITH RECURSIVE category_tree AS (
        SELECT 
          c.id,
          c.name,
          c.parent_id,
          ARRAY[c.id]::integer[] as path_ids,
          ARRAY[c.name]::varchar[] as path_names
        FROM web_categories c
        WHERE c.id = (
          SELECT category_id 
          FROM product_display 
          WHERE id = $1
        )
        
        UNION ALL
        
        SELECT 
          c.id,
          c.name,
          c.parent_id,
          array_append(ct.path_ids, c.id),
          array_append(ct.path_names, c.name)
        FROM web_categories c
        INNER JOIN category_tree ct ON c.id = ct.parent_id
      )
      SELECT 
        pd.*,
        (SELECT json_agg(
          json_build_object(
            'id', i.id,
            'url', CASE 
              WHEN i.url LIKE '/images/%' OR i.url LIKE 'images/%' THEN i.url
              ELSE '/images/' || REGEXP_REPLACE(i.url, '^/?(images/)*', '')
            END,
            'is_primary', i.is_primary,
            'display_type', i.display_type,
            'alt_text', i.alt_text,
            'order_index', i.order_index
          ) ORDER BY i.order_index
        )
        FROM images i 
        WHERE i.display_id = pd.id
          AND COALESCE(i.hide, FALSE) = FALSE) as images,
        (SELECT json_agg(
          json_build_object(
            'id', v.id,
            'product_id', v.product_id,
            'size', v.size,
            'status', v.status,
            'order_index', v.order_index,
            'price', json_build_object(
              'amount', COALESCE(p.price, 0),
              'currency', COALESCE(p.currency, 'TRY')
            )
          ) ORDER BY v.order_index
        )
        FROM product_variants v 
        LEFT JOIN prices p ON v.product_id = p.product_id
        WHERE v.display_id = pd.id) as variants,
        (SELECT ARRAY_AGG(name ORDER BY array_position(path_ids, id)) FROM category_tree) as category_path,
        (SELECT ARRAY_AGG(id ORDER BY array_position(path_ids, id)) FROM category_tree) as category_path_ids
      FROM product_display pd
      WHERE pd.id = $1`;

    const result = await client.query(query, [id]);

    if (result.rows.length === 0) {
      await releaseClient();
      return NextResponse.json(
        { error: 'Product not found' },
        { status: 404 }
      );
    }

    const product = result.rows[0];

    // Process the data
    const response = {
      ...product,
      images: product.images || [],
      variants: product.variants || [],
      category_path: product.category_path || [],
      category_path_ids: product.category_path_ids || [],
      rating: product.rating || 0,
      review_count: product.review_count || 0
    };

    await releaseClient();
    return NextResponse.json(response);

  } catch (error) {
    console.error('Database error:', error);
    await releaseClient();

    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error.message
      },
      { status: 500 }
    );
  }
}
