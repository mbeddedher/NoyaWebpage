import { NextResponse } from 'next/server';
import { connectToDatabase } from '~/lib/db';
import {
  generateImageVersionsWithFallback,
  deleteImageVersions,
} from '../../../../lib/imageProcessor';
import { publicImageUrl } from '~/lib/imageUrls';

// GET a single product display
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
    const { searchParams } = new URL(request.url);
    let response = {};
    client = await connectToDatabase();
    let query = '';
    if(searchParams.get('state') === 'edit') {
      query = `
            SELECT 
              pd.*,
              wc.name as category_name,
              (SELECT json_agg(
                json_build_object(
                  'id', i.id,
                  'original_url', i.original_url,
                  'thumb_url', i.thumb_url,
                  'medium_url', i.medium_url,
                  'large_url', i.large_url,
                  'is_primary', i.is_primary,
                  'in_thumb', COALESCE(i.in_thumb, TRUE),
                  'hide', COALESCE(i.hide, FALSE),
                  'display_type', i.display_type,
                  'alt_text', i.alt_text,
                  'order_index', i.order_index,
                  'file_size', i.file_size,
                  'resolution', i.resolution,
                  'format', i.format
                ) ORDER BY i.order_index
              )
              FROM images i 
              WHERE i.display_id = $1) as images,
              (SELECT json_agg(
                json_build_object(
                  'id', v.id,
                  'product_id', v.product_id,
                  'size', v.size,
                  'status', v.status,
                  'order_index', v.order_index,
                  'has_package_options', v.has_package_options,
                  'price_info', (
                    SELECT json_build_object(
                      'price', p.price,
                      'currency', p.currency,
                      'is_multi', p.is_multi,
                      'multi_currency_prices', (
                        SELECT COALESCE(json_agg(
                          json_build_object(
                            'id', pd.id,
                            'currency', pd.currency,
                            'price', pd.price
                          )
                        ), '[]'::json)
                        FROM multi_currency_prices pd
                        WHERE pd.product_id = v.product_id
                      )
                    )
                    FROM prices p
                    WHERE p.product_id = v.product_id
                  ),
                  'package_options', (
                    SELECT COALESCE(json_agg(po.* ORDER BY po.order_index), '[]'::json)
                    FROM (
                      SELECT 
                        id,
                        name,
                        count,
                        discount,
                        status,
                        stock_status,
                        order_index
                      FROM package_options
                      WHERE product_id = v.product_id
                      ORDER BY order_index
                    ) po
                  )
                ) ORDER BY v.order_index
              )
              FROM product_variants v 
              WHERE v.display_id = $1) as variants
            FROM product_display pd
            LEFT JOIN web_categories wc ON pd.category_id = wc.id
            WHERE pd.id = $1`;  
    } else {
      query = `
        SELECT plv.*
        FROM product_landing_view plv
        WHERE plv.product_id = $1`;
    }
    const result = await client.query(query, [id]);
    if (result.rows.length === 0) {
      await releaseClient();
      return NextResponse.json(
        { error: 'Product display not found' },
        { status: 404 }
      );
    }

    const product = result.rows[0];

    if(searchParams.get('state') !== 'edit') {
      response = product;
    } else {
      response = {
        id: product.id,
        name: product.name,
        description: product.description || { content: '', summary: [] },
        brand: product.brand,
        category_id: product.category_id,
        category_name: product.category_name,
        status: product.status,
        keywords: product.keywords || [],
        variants: product.variants || [],
        default_size: product.default_size || '',
        has_variants: product.has_variants,
        min_price: product.min_price,
        max_price: product.max_price,
        price_array: product.price_array,
        images: (product.images || []).map(image => ({
          ...image,
          original_url: publicImageUrl(image.original_url),
          thumb_url: image.thumb_url ? publicImageUrl(image.thumb_url) : null,
          medium_url: image.medium_url ? publicImageUrl(image.medium_url) : null,
          large_url: image.large_url ? publicImageUrl(image.large_url) : null,
          is_primary: image.is_primary || false,
          in_thumb: image.in_thumb ?? true,
          hide: image.hide ?? false,
          display_type: image.display_type || 'gallery',
          alt_text: image.alt_text || '',
          file_size: image.file_size || 0,
          resolution: image.resolution || '',
          format: image.format || ''
        })),
      };
    } 

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

// PUT update a product display
export async function PUT(request, { params }) {
  const client = await connectToDatabase();
  const id = params.id;
  
  try {

    const data = await request.json();
    console.log('Received data:', data);
    const { name, description, category_id, status, keywords, variants, images, brand, min_price, max_price, price_array, size_array, default_size, has_variants } = data;

    // Validate and format description as JSONB
    let formattedDescription;
    try {
      if (typeof description === 'string') {
        formattedDescription = { content: description };
      } else if (typeof description === 'object' && description !== null) {
        formattedDescription = description;
      } else {
        formattedDescription = { content: '' };
      }
    } catch (error) {
      throw new Error('Description must be a valid JSON object with a content field');
    }

    // Convert keywords to array if it's a string
    const keywordsArray = Array.isArray(keywords) 
      ? keywords 
      : (typeof keywords === 'string' ? keywords.split(',').map(k => k.trim()) : []);

    const sizeArrayFromVariants = Array.isArray(variants)
      ? [...new Set(variants.map((v) => (v?.size || '').trim()).filter(Boolean))]
      : [];
    const resolvedSizeArray =
      sizeArrayFromVariants.length > 0
        ? sizeArrayFromVariants
        : Array.isArray(size_array) && size_array.length
          ? size_array
          : [];
    const resolvedHasVariants = resolvedSizeArray.length > 1;

    // Start transaction
    await client.query('BEGIN');

    try {
      // 1. Update product display
      await client.query(
        `UPDATE product_display 
         SET name = $1, description = $2, category_id = $3, 
             status = $4, keywords = $5, brand = $6, size_array = $7,
             min_price = $8, max_price = $9, price_array = $10, has_variants = $11,
             default_size = $12, updated_at = CURRENT_TIMESTAMP
         WHERE id = $13`,
        [
          name, 
          description,
          category_id, 
          status || 'active',
          Array.isArray(keywords) ? keywords : keywords?.split(',').map(k => k.trim()),
          brand || '', 
          resolvedSizeArray,
          min_price,
          max_price,
          price_array,
          resolvedHasVariants,
          default_size,
          id
        ]
      );

      // 2. Handle variants
      if (variants) {
        await client.query('DELETE FROM product_variants WHERE display_id = $1', [id]);

        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];
          const variantResult = await client.query(
            `INSERT INTO product_variants 
             (display_id, product_id, size, status, order_index)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              id,
              variant.product_id,
              variant.size || '',
              variant.status || 'active',
              i
            ]
          );

          if (variant.package_options && variant.package_options.length > 0) {
            for (let j = 0; j < variant.package_options.length; j++) {
              const option = variant.package_options[j];
              await client.query(
                `UPDATE package_options 
                 SET status = $1, order_index = $2
                 WHERE product_id = $3 AND id = $4`,
                [option.status || 'active', j, variant.product_id, option.id]
              );
            }
          }
        }
      }

      // 3. Delete old images and their generated versions (skip blobs still referenced in this save — otherwise fetch 404 on re-insert)
      const oldImages = await client.query(
        'SELECT original_url, thumb_url, medium_url, large_url FROM images WHERE display_id = $1',
        [id]
      );
      const reusedOriginalUrls = new Set();
      for (const img of images || []) {
        const o = String(img?.original_url || '').trim();
        const u = String(img?.url || '').trim();
        if (o) reusedOriginalUrls.add(o);
        if (u) reusedOriginalUrls.add(u);
      }
      for (const row of oldImages.rows) {
        const orig = String(row.original_url || '').trim();
        if (orig && reusedOriginalUrls.has(orig)) {
          continue;
        }
        await deleteImageVersions(row);
      }
      await client.query('DELETE FROM images WHERE display_id = $1', [id]);

      // 4. Insert new images with generated versions
      if (images && images.length > 0) {
        for (const image of images) {
          const versions = await generateImageVersionsWithFallback(image);
          // If the client already generated a cropped thumb (cart_url), don't overwrite it by regenerating.
          const preferredThumbUrl = image?.cart_url || image?.thumb_url || null;
          if (preferredThumbUrl) {
            versions.thumb_url = preferredThumbUrl;
          }

          const validDisplayTypes = ['gallery', 'thumbnail', 'zoomed'];
          const displayType = validDisplayTypes.includes(image.display_type) 
            ? image.display_type 
            : 'gallery';

          const hide = !!image.hide;
          const inThumb = !!image.in_thumb && !hide;
          const isPrimary = !!image.is_primary && inThumb;

          await client.query(
            `INSERT INTO images (
              display_id, original_url, thumb_url, medium_url, large_url,
              is_primary, display_type, alt_text, order_index,
              file_size, resolution, format,
              in_thumb, hide
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
            [
              id,
              versions.original_url,
              versions.thumb_url,
              versions.medium_url,
              versions.large_url,
              isPrimary,
              displayType,
              image.alt_text || '',
              image.order_index,
              image.file_size,
              image.resolution,
              image.format,
              inThumb,
              hide
            ]
          );
        }
      }

      // Commit transaction
      await client.query('COMMIT');

      // Fetch updated data
      const result = await client.query(
        `SELECT pd.*, 
                wc.name as category_name,
                (SELECT json_agg(v.*) FROM product_variants v WHERE v.display_id = pd.id) as variants,
                (SELECT json_agg(i.*) FROM images i WHERE i.display_id = pd.id) as images
         FROM product_display pd
         LEFT JOIN web_categories wc ON pd.category_id = wc.id
         WHERE pd.id = $1`,
        [id]
      );

      return new Response(
        JSON.stringify({
          message: 'Product display updated successfully',
          data: result.rows[0]
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('Error updating product display:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to update product display' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } finally {
    client.release();
  }
}

// DELETE a product display
export async function DELETE(request, { params }) {
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
    const id = await params.id;
    client = await connectToDatabase();

    await client.query('BEGIN');

    try {
      const variantResult = await client.query(
        'SELECT product_id FROM product_variants WHERE display_id = $1',
        [id]
      );
      
      const productIds = variantResult.rows.map(row => row.product_id);

      if (productIds.length > 0) {
        await client.query(
          'DELETE FROM package_options WHERE product_id = ANY($1)',
          [productIds]
        );
      }

      await client.query(
        'DELETE FROM product_variants WHERE display_id = $1',
        [id]
      );

      // Delete generated image files before removing DB rows
      const imageRows = await client.query(
        'SELECT original_url, thumb_url, medium_url, large_url FROM images WHERE display_id = $1',
        [id]
      );
      for (const row of imageRows.rows) {
        await deleteImageVersions(row);
      }

      await client.query(
        'DELETE FROM images WHERE display_id = $1',
        [id]
      );

      const result = await client.query(
        'DELETE FROM product_display WHERE id = $1',
        [id]
      );

      if (result.rowCount === 0) {
        throw new Error('Product display not found');
      }

      await client.query('COMMIT');
      await releaseClient();

      return NextResponse.json({ message: 'Product display deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Database error:', error);
    await releaseClient();

    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error.message.includes('connection')) {
      errorMessage = 'Database connection error';
    } else if (error.message.includes('relation') || error.message.includes('column')) {
      statusCode = 400;
      errorMessage = 'Invalid database query';
    } else if (error.message === 'Product display not found') {
      statusCode = 404;
      errorMessage = error.message;
    }

    return NextResponse.json(
      { 
        error: errorMessage,
        details: error.message
      },
      { status: statusCode }
    );
  }
}
