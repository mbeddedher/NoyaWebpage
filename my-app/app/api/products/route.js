import { connectToDatabase } from '~/lib/db';
import { NextResponse } from 'next/server';
import prisma from '../../../lib/prisma';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const status = searchParams.get('status') || '';
    const sortBy = searchParams.get('sortBy') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';
    
    const offset = (page - 1) * limit;
    
    const client = await connectToDatabase();
    
    // Build the WHERE clause based on filters
    const whereConditions = [];
    const params = [];
    let paramCount = 1;
    
    if (search) {
      whereConditions.push(`(p.name ILIKE $${paramCount} OR p.sku ILIKE $${paramCount} OR p.brand ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }
    
    if (category) {
      whereConditions.push(`p.category_id = $${paramCount}`);
      params.push(category);
      paramCount++;
    }
    
    if (status === 'active') {
      whereConditions.push('p.is_active = true');
    } else if (status === 'inactive') {
      whereConditions.push('p.is_active = false');
    }
    
    const whereClause = whereConditions.length > 0 
      ? 'WHERE ' + whereConditions.join(' AND ')
      : '';

    // Count total records for pagination
    const countQuery = `
      SELECT COUNT(*) 
      FROM "products" p
      ${whereClause}
    `;
    
    const countResult = await client.query(countQuery, params);
    const totalItems = parseInt(countResult.rows[0].count);
    
    // Main query with all necessary joins
    const query = `
      SELECT 
        p.id,
        p.sku,
        p.name,
        p.brand,
        p.is_active,
        p.is_onsite,
        p.is_crafted,
        p.dimensions,
        p.created_at,
        p.updated_at,
        c.id as category_id,
        c.name as category_name,
        s.id as supplier_id,
        s.name as supplier_name,
        COALESCE(st.quantity, 0) as stock_quantity,
        st.stock_status,
        st.unit,
        st.min_stock,
        st.package_quantity,
        st.arrival_type,
        st.arrival_date,
        pr.price,
        pr.currency,
        pr.cost,
        pr.vat,
        pr.profit,
        pr.discount,
        pr.supplier_discount,
        CASE 
          WHEN cp.parent_product_id IS NOT NULL THEN true 
          ELSE false 
        END as has_components
      FROM "products" p
      LEFT JOIN "categories" c ON p.category_id = c.id
      LEFT JOIN "suppliers" s ON p.supplier_id = s.id
      LEFT JOIN "stocks" st ON p.id = st.product_id
      LEFT JOIN "prices" pr ON p.id = pr.product_id
      LEFT JOIN "crafted_products" cp ON p.id = cp.parent_product_id
      ${whereClause}
      GROUP BY 
        p.id, 
        c.id, 
        c.name, 
        s.id, 
        s.name, 
        st.id, 
        pr.id, 
        cp.parent_product_id
      ORDER BY p.${sortBy} ${sortOrder}
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;
    
    params.push(limit, offset);
    
    const result = await client.query(query, params);
    client.release();

    return new Response(
      JSON.stringify({
        products: result.rows,
        total: totalItems,
        page,
        limit
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Error fetching products:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch products' }),
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    console.log('Received product data:', data);
    

    if(data.arrival_type === 'interval' || data.arrival_type === 'monthly') {
      data.arrival_date = String(data.arrival_interval)
    }else if(data.arrival_type === "weeky") {
      data.arrival_date = data.arrival_day
    }



    const client = await connectToDatabase();

    // Start a transaction
    await client.query('BEGIN');

    try {
      // 1. Insert the product
      const productResult = await client.query(
        `INSERT INTO products (
          sku, name, brand, dimensions, category_id, supplier_id,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id`,
        [
          data.sku,
          data.name,
          data.brand,
          data.dimensions || null,
          data.category_id,
          data.supplier_id,
          data.is_active !== undefined ? data.is_active : true
        ]
      );

      const productId = productResult.rows[0].id;
      console.log('Product created with ID:', productId);

      // 2. Insert stock entry
      await client.query(
        `INSERT INTO stocks (
          product_id, quantity, unit,
          min_stock, stock_status, arrival_type,
          arrival_date, package_quantity,
          is_linked, is_component
        ) VALUES (
          $1, $2, $3::unit_type,
          $4, $5::stock_status_type, $6::stock_arrival_interval_type,
          $7, $8, $9, $10
        )`,
        [
          productId,
          data.quantity || 0,
          data.unit,
          data.min_stock || null,
          data.stock_type || 'limited',
          data.arrival_type || null,
          data.arrival_date || null,
          data.package_quantity || 1,
          false,
          false
        ]
      );
      console.log('Stock entry created');

      // 3. Insert price entry
      await client.query(
        `INSERT INTO prices (
          product_id, price, currency,
          cost, supplier_discount, vat, profit, discount,
          is_linked, is_component
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          productId,
          data.price || 0,
          data.currency,
          data.cost,
          data.supplier_discount || 0,
          data.vat,
          data.profit,
          data.discount || 0,
          false,
          false
        ]
      );
      console.log('Price entry created');

      // 4. Insert package options if any
      if (data.package_options && data.package_options.length > 0) {
        for (const option of data.package_options) {
          await client.query(
            `INSERT INTO package_options (
              product_id, name, count, discount, status, stock_status
            ) VALUES ($1, $2, $3, $4, $5::package_option_status_type, $6::package_option_stock_status_type)`,
            [
              productId,
              option.name,
              option.count,
              option.discount || 0,
              option.status || 'active',
              option.stock_status || 'divide'
            ]
          );
        }
        console.log('Package options created');
      }

      // Commit the transaction
      await client.query('COMMIT');
      client.release();

      return new Response(
        JSON.stringify({
          id: productId,
          message: 'Product and related data created successfully'
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      client.release();
      console.error('Database error:', error);
      throw new Error(`Database operation failed: ${error.message}`);
    }
  } catch (error) {
    console.error('Error creating product:', error);
    return new Response(
      JSON.stringify({ 
        error: `Failed to create product: ${error.message}`,
        details: error.stack
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const productId = pathParts[pathParts.length - 1];
    
    const client = await connectToDatabase();
    await client.query('BEGIN');

    try {
      // Delete related records first
      await client.query('DELETE FROM prices WHERE product_id = $1', [productId]);
      await client.query('DELETE FROM stocks WHERE product_id = $1', [productId]);
      
      // Delete the product
      const result = await client.query(
        'DELETE FROM products WHERE id = $1 RETURNING id',
        [productId]
      );

      await client.query('COMMIT');
      client.release();

      if (result.rowCount === 0) {
        return new Response(
          JSON.stringify({ error: 'Product not found' }),
          { status: 404 }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Product deleted successfully' }),
        { status: 200 }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting product:', error);
    return new Response(
      JSON.stringify({ error: `Failed to delete product: ${error.message}` }),
      { status: 500 }
    );
  }
}

export async function PATCH(request) {
  try {
    const data = await request.json();
    
    if (!data.ids || !Array.isArray(data.ids) || data.ids.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No product IDs provided' }),
        { status: 400 }
      );
    }

    const client = await connectToDatabase();
    await client.query('BEGIN');

    try {
      if (data.action === 'delete') {
        // Delete related records first
        await client.query(
          'DELETE FROM prices WHERE product_id = ANY($1::int[])',
          [data.ids]
        );
        await client.query(
          'DELETE FROM stocks WHERE product_id = ANY($1::int[])',
          [data.ids]
        );
        
        // Delete the products
        const result = await client.query(
          'DELETE FROM products WHERE id = ANY($1::int[])',
          [data.ids]
        );

        await client.query('COMMIT');
        client.release();

        return new Response(
          JSON.stringify({
            message: `${result.rowCount} products deleted successfully`
          }),
          { status: 200 }
        );
      } else if (data.action === 'activate' || data.action === 'deactivate') {
        const result = await client.query(
          'UPDATE products SET is_active = $1 WHERE id = ANY($2::int[])',
          [data.action === 'activate', data.ids]
        );

        await client.query('COMMIT');
        client.release();

        return new Response(
          JSON.stringify({
            message: `${result.rowCount} products updated successfully`
          }),
          { status: 200 }
        );
      }

      await client.query('COMMIT');
      client.release();
      
      return new Response(
        JSON.stringify({ error: 'Invalid action specified' }),
        { status: 400 }
      );
    } catch (error) {
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Error processing bulk action:', error);
    return new Response(
      JSON.stringify({ error: `Failed to process bulk action: ${error.message}` }),
      { status: 500 }
    );
  }
}

export async function searchProducts(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    if (!query) {
      return NextResponse.json([]);
    }

    const products = await prisma.product.findMany({
      where: {
        OR: [
          {
            name: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            description: {
              contains: query,
              mode: 'insensitive',
            },
          },
          {
            brand: {
              contains: query,
              mode: 'insensitive',
            },
          },
        ],
      },
      select: {
        id: true,
        name: true,
        price: true,
        imageUrl: true,
      },
      take: 10,
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error('Products search error:', error);
    return NextResponse.json({ error: 'Ürün araması sırasında bir hata oluştu' }, { status: 500 });
  }
}