import { connectToDatabase } from '~/lib/db';

export async function POST(request) {
  const client = await connectToDatabase();

  try {
    const data = await request.json();

    // Validate for duplicate components
    const componentIds = data.components.map(comp => comp.product_id);
    const uniqueComponentIds = new Set(componentIds);
    if (componentIds.length !== uniqueComponentIds.size) {
      return new Response(
        JSON.stringify({ 
          error: 'Duplicate components are not allowed. Please adjust quantities instead.' 
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Start transaction
    await client.query('BEGIN');

    // 1. Insert into products table
    const productResult = await client.query(
      `INSERT INTO products (
        name, sku, brand, category_id, supplier_id, dimensions, is_crafted
      ) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        data.name,
        data.sku,
        data.brand,
        data.category_id,
        data.supplier_id,
        data.dimensions,
        true // is_crafted
      ]
    );
    const productId = productResult.rows[0].id;

    // 2. Insert component relationships into crafted_products table
    for (const component of data.components) {
      await client.query(
        `INSERT INTO crafted_products (
          parent_product_id, component_product_id, quantity, converted_currency
        ) VALUES ($1, $2, $3, $4)`,
        [productId, component.product_id, component.quantity, component.converted_currency]
      );
    }

    // 3. Insert into linked_prices table
    if (data.pricing_mode !== 'manual') {
      for (const component of data.components) {
        await client.query(
          `INSERT INTO linked_prices (
            parent_product_id, component_product_id, currency
          ) VALUES ($1, $2, $3)`,
          [productId, component.product_id,  component.converted_currency]
        );
      }
    }

    // 4. Insert into prices table
    // Use the pre-calculated values from frontend
    const priceResult = await client.query(
      `INSERT INTO prices (
        product_id, cost, price, currency, is_multi,
        has_difference, difference_type, difference_value,
        vat, profit, discount, link_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        productId,
        data.cost,
        data.price,
        data.currency,
        data.is_multi_currency,
        data.has_difference || false,
        data.difference_type,
        data.difference_value,
        data.vat || 0,
        data.profit || 0,
        data.discount || 0,
        data.pricing_mode
      ]
    );

    // 5. Insert multi-currency prices if they exist
    if (data.is_multi_currency && data.multi_currency_prices) {
      for (const [currency, values] of Object.entries(data.multi_currency_prices)) {
        await client.query(
          `INSERT INTO multi_currency_prices (
            product_id, currency, price
          ) VALUES ($1, $2, $3)`,
          [
            productId,
            currency,
            values.price || 0
          ]
        );
      }
    }

    // 6. Insert stock settings
    await client.query(
      `INSERT INTO stocks (
        product_id, stock_status, quantity, unit, min_stock,
        package_quantity, is_linked, is_component,
        arrival_type, arrival_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        productId,
        data.stock_status || 'unlimited',
        data.quantity || 0,
        data.unit || 'piece',
        data.min_stock || null,
        data.package_quantity || 1,
        true,
        false,
        data.arrival_type || 'unknown',
        data.arrival_type === 'date' ? data.arrival_date :
        data.arrival_type === 'weeky' ? data.arrival_day :
        (data.arrival_type === 'monthly' || data.arrival_type === 'interval') ? data.arrival_interval :
        null
      ]
    );
    // Set components stock is_component flag
    if (data.components && data.components.length > 0) {
      for (const component of data.components) {
        await client.query(
          `UPDATE stocks 
           SET is_component = true
           WHERE product_id = $1`,
          [component.product_id]
        );
      }
    }

    // 7. Insert package options if any
    if (data.package_options && data.package_options.length > 0) {
      for (const option of data.package_options) {
        await client.query(
          `INSERT INTO package_options (
            product_id, name, count, discount, status, stock_status
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            productId,
            option.name,
            option.count,
            option.discount,
            option.status,
            option.stock_status
          ]
        );
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    return new Response(
      JSON.stringify({ 
        message: 'Crafted product created successfully',
        productId 
      }),
      { 
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating crafted product:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create crafted product',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } finally {
    client.release();
  }
}

export async function GET(request) {
  const url = new URL(request.url);
  const searchQuery = url.searchParams.get('search');
  const sortField = url.searchParams.get('sort');
  const sortDirection = url.searchParams.get('direction');

  try {
    const client = await connectToDatabase();
    let query = `
      SELECT 
        p.*,
        (SELECT json_build_object(
          'link_type', lp.link_type,
          'currency', lp.currency
         ) FROM linked_prices lp
         WHERE parent_product_id = p.id 
         LIMIT 1) as price_link_info,
        (SELECT json_build_object(
          'difference_type', pd.differece_type,
          'difference', pd.difference
         )
         FROM price_diffs pd
         WHERE pd.product_id = p.id
         LIMIT 1) as price_difference,
        json_agg(
          json_build_object(
            'component_id', cp.component_product_id,
            'quantity', cp.quantity,
            'component_name', cp2.name,
            'component_sku', cp2.sku,
            'stock_unit', s.unit,
            'stock_quantity', s.quantity,
            'price', pr.price,
            'currency', pr.currency
          )
        ) as components
      FROM products p
      JOIN crafted_products cp ON p.id = cp.parent_product_id
      JOIN products cp2 ON cp.component_product_id = cp2.id
      JOIN stocks s ON s.product_id = cp2.id
      JOIN prices pr ON pr.product_id = cp2.id
      WHERE p.is_crafted = true
    `;
    const params = [];

    // Add search condition if search parameter exists
    if (searchQuery) {
      query += ' AND p.name ILIKE $1';
      params.push(`%${searchQuery}%`);
    }

    // Group by parent product
    query += ' GROUP BY p.id';

    // Add sorting if sort parameters exist
    if (sortField && sortDirection) {
      query += ` ORDER BY ${sortField} ${sortDirection.toUpperCase()}`;
    }

    // Add a reasonable limit
    query += ' LIMIT 100';

    const result = await client.query(query, params);
    client.release();

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error querying the database:', error);
    return new Response(
      JSON.stringify({ error: `Failed to fetch crafted products: ${error.message}` }),
      { status: 500 }
    );
  }
} 