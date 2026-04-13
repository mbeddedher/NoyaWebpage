import { connectToDatabase } from '~/lib/db';
import { generateImageVersionsWithFallback } from '../../../lib/imageProcessor';

export async function GET(request) {
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
    client = await connectToDatabase();
    const { searchParams } = new URL(request.url);
    
    let query = `
      SELECT pd.*, 
             wc.name as category_name,
             (SELECT COUNT(*) FROM product_variants WHERE display_id = pd.id) as variant_count,
             (SELECT COUNT(*) FROM images WHERE display_id = pd.id) as image_count
      FROM product_display pd
      LEFT JOIN web_categories wc ON pd.category_id = wc.id
    `;
    
    const params = [];
    let paramIndex = 1;

    // Handle search
    const search = searchParams.get('search');
    if (search) {
      query += ` WHERE pd.name ILIKE $${paramIndex} 
                 OR pd.description::text ILIKE $${paramIndex}
                 OR pd.brand ILIKE $${paramIndex}
                 OR pd.keywords @> ARRAY[$${paramIndex}]
                 OR pd.size_array @> ARRAY[$${paramIndex}]`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Handle sorting
    const sort = searchParams.get('sort');
    const direction = searchParams.get('direction')?.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
    if (sort) {
      const allowedSortFields = ['id', 'name', 'status', 'ranking', 'has_variants', 'popularity_score', 'created_at'];
      if (allowedSortFields.includes(sort)) {
        query += ` ORDER BY pd.${sort} ${direction}`;
      }
    } else {
      // Default sorting
      query += ' ORDER BY pd.created_at DESC';
    }

    const result = await client.query(query, params);
    await releaseClient();
    
    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching product displays:', error);
    await releaseClient();

    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch product displays',
        details: error.message
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Create a new product display
export async function POST(request) {
  const client = await connectToDatabase();
  
  try {
    const data = await request.json();
    console.log('Received product display data:', {
      ...data,
      images: data.images?.map(img => ({
        url: img.url || img.original_url,
        is_primary: img.is_primary
      }))
    });

    const { name, description, category_id, status, keywords, variants, images, brand, min_price, max_price, price_array, size_array, default_size, has_variants} = data;

    // Validate and format description as JSONB
    let formattedDescription;
    try {
      // If description is a string, wrap it in a content object
      if (typeof description === 'string') {
        formattedDescription = { content: description };
      } 
      // If it's already an object, use it as is
      else if (typeof description === 'object' && description !== null) {
        formattedDescription = description;
      }
      // Default to empty object if no description
      else {
        formattedDescription = { content: '' };
      }
    } catch (error) {
      throw new Error('Description must be a valid JSON object with a content field. Example: {"content": "Your description here"}');
    }

    // Convert keywords to array if it's a string
    const keywordsArray = keywords ? keywords.split(',').map(k => k.trim()) : [];

    // Unique sizes from variants (source of truth for card filters + display)
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


    //Calculate min and max price from price_info by calculating currency and multi_currency_prices
  



 



    // Start transaction
    await client.query('BEGIN');

    try {
      // Insert product display
      const displayResult = await client.query(
        `INSERT INTO product_display 
         (name, description, category_id, status, keywords, brand, min_price, max_price, price_array, size_array, default_size, has_variants)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id`,
        [
          name,
          description,
          category_id,
          status || 'active',
          Array.isArray(keywords) ? keywords : keywords?.split(',').map(k => k.trim()),
          brand || '',
          min_price,
          max_price,
          price_array,
          resolvedSizeArray,
          default_size,
          resolvedHasVariants
        ]
      );

      const displayId = displayResult.rows[0].id;

      // 2. Insert variants and their package options
      if (variants && variants.length > 0) {
        for (let i = 0; i < variants.length; i++) {
          const variant = variants[i];
          const variantResult = await client.query(
            `INSERT INTO product_variants 
             (display_id, product_id, size, status, order_index)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [
              displayId, 
              variant.product_id,
              variant.size || '',
              variant.status || 'active',
              i
            ]
          );

          // Update package options state and order for this variant
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

      // 3. Insert images with generated versions
      if (images && images.length > 0) {
        for (const image of images) {
          let versions;
          try {
            versions = await generateImageVersionsWithFallback(image);
          } catch (e) {
            console.warn('Image processing failed, inserting URL-only image row:', e?.message);
            const orig = image?.original_url || image?.url || '';
            versions = {
              original_url: orig,
              thumb_url: image?.cart_url || image?.thumb_url || orig || null,
              medium_url: image?.medium_url || null,
              large_url: image?.large_url || null,
            };
          }
          // IMPORTANT: If the client provides a cropped thumb URL (from /api/upload's `cart_url`),
          // prefer it over regenerated thumb (which would be center-cropped again).
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
              displayId,
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
      client.release();

      return new Response(
        JSON.stringify({
          message: 'Product display created successfully',
          id: displayId
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' }
        }
      );

    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }

  } catch (error) {
    console.error('Error creating product display:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to create product display' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle bulk actions
export async function PATCH(request) {
  const client = await connectToDatabase();
  
  try {
    const { action, ids } = await request.json();
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No IDs provided for bulk action' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    let query;
    switch (action) {
      case 'delete':
        query = 'DELETE FROM product_display WHERE id = ANY($1)';
        break;
      case 'activate':
        query = "UPDATE product_display SET status = 'active' WHERE id = ANY($1)";
        break;
      case 'deactivate':
        query = "UPDATE product_display SET status = 'diactive' WHERE id = ANY($1)";
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Invalid bulk action' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          }
        );
    }

    await client.query(query, [ids]);
    
    return new Response(
      JSON.stringify({ message: 'Bulk action completed successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error performing bulk action:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to perform bulk action' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Handle single item deletion
export async function DELETE(request) {
  const client = await connectToDatabase();
  const id = request.url.split('/').pop();
  
  try {
    await client.query('DELETE FROM product_display WHERE id = $1', [id]);
    
    return new Response(
      JSON.stringify({ message: 'Product display deleted successfully' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error deleting product display:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to delete product display' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 