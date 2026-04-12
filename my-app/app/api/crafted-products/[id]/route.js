import { connectToDatabase } from '~/lib/db';

export async function GET(request, { params }) {
  const client = await connectToDatabase();
  const productId = params.id;

  try {
    // Start a transaction
    await client.query('BEGIN');

    // 1. Get base product information
    const productResult = await client.query(
      `SELECT 
        p.*,
        pr.cost,
        pr.price,
        pr.currency,
        pr.is_linked,
        pr.is_multi,
        pr.has_difference,
        pr.difference_type,
        pr.difference_value,
        pr.vat,
        pr.profit,
        pr.discount,
        pr.link_type,
        s.*
      FROM products p
      LEFT JOIN prices pr ON p.id = pr.product_id
      LEFT JOIN stocks s ON p.id = s.product_id
      WHERE p.id = $1 AND p.is_crafted = true`,
      [productId]
    );

    if (productResult.rows.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Crafted product not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const product = productResult.rows[0];
    console.log("Database values:", {
      link_type: product.link_type,
      is_linked: product.is_linked
    });

    // 2. Get components with their details
    const componentsResult = await client.query(
      `SELECT 
        cp.component_product_id,
        cp.quantity,
        cp.converted_currency,
        p.name,
        p.sku,
        pr.cost,
        pr.price,
        pr.currency,
        pr.vat,
        pr.profit,
        pr.discount,
        s.unit
      FROM crafted_products cp
      JOIN products p ON cp.component_product_id = p.id
      LEFT JOIN prices pr ON p.id = pr.product_id
      LEFT JOIN stocks s ON p.id = s.product_id
      WHERE cp.parent_product_id = $1`,
      [productId]
    );

    // 3. Get multi-currency prices if they exist
    const multiCurrencyResult = await client.query(
      `SELECT currency, price
       FROM multi_currency_prices
       WHERE product_id = $1`,
      [productId]
    );

    // 4. Get package options
    const packageResult = await client.query(
      `SELECT name, count, discount, status, stock_status
       FROM package_options
       WHERE product_id = $1`,
      [productId]
    );

    // Format the response data
    const formattedData = {
      ...product,
      components: componentsResult.rows.map(comp => ({
        product_id: comp.component_product_id,
        name: comp.name,
        quantity: comp.quantity,
        unit: comp.unit || 'piece',
        cost: parseFloat(comp.cost) || 0,
        price: parseFloat(comp.price) || 0,
        currency: comp.currency,
        vat: parseFloat(comp.vat) || 0,
        profit: parseFloat(comp.profit) || 0,
        discount: parseFloat(comp.discount) || 0,
        converted_currency: comp.converted_currency
      })),
      pricing: {
        mode: product.link_type || 'manual',
        is_linked: ['cost', 'price'].includes(product.link_type),
        cost: parseFloat(product.cost) || 0,
        total_price: parseFloat(product.price) || 0,
        currency: product.currency || 'USD',
        is_multi: product.is_multi || false,
        has_difference: product.has_difference || false,
        difference_type: product.difference_type || null,
        difference_value: parseFloat(product.difference_value) || 0,
        vat: parseFloat(product.vat) || 0,
        profit: parseFloat(product.profit) || 0,
        discount: parseFloat(product.discount) || 0,
        multi_currency_prices: multiCurrencyResult.rows.reduce((acc, row) => {
          acc[row.currency] = {
            price: parseFloat(row.price) || 0,
            currency: row.currency
          };
          return acc;
        }, {})
      },
      stock: {
        quantity: parseInt(product.quantity) || 0,
        min_quantity: parseInt(product.min_stock) || 0,
        unit: product.unit || 'piece',
        stock_status: product.stock_status || 'limited',
        arrival_date: product.arrival_date || null,
        arrival_type: product.arrival_type || null
      },
      package_options: packageResult.rows.map(opt => ({
        name: opt.name,
        count: parseInt(opt.count) || 1,
        discount: parseFloat(opt.discount) || 0,
        status: opt.status || 'active',
        stock_status: opt.stock_status || 'divide'
      }))
    };

    await client.query('COMMIT');

    return new Response(
      JSON.stringify(formattedData),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error fetching crafted product:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch crafted product',
        details: error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  } finally {
    client.release();
  }
}

export async function PUT(request, { params }) {
  const client = await connectToDatabase();
  const productId = params.id;

  try {
    const data = await request.json();
    console.log("Data:", data)

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

    // 1. Update products table
    await client.query(
      `UPDATE products 
       SET name = $1, sku = $2, brand = $3, category_id = $4, 
           supplier_id = $5, dimensions = $6
       WHERE id = $7`,
      [
        data.name,
        data.sku,
        data.brand,
        data.category_id,
        data.supplier_id,
        data.dimensions,
        productId
      ]
    );

    // 2. Update component relationships
    // First, delete existing components
    await client.query(
      'DELETE FROM crafted_products WHERE parent_product_id = $1',
      [productId]
    );
    
    // Then insert new components
    for (const component of data.components) {
      await client.query(
        `INSERT INTO crafted_products (
          parent_product_id, component_product_id, quantity, converted_currency
        ) VALUES ($1, $2, $3, $4)`,
        [productId, component.product_id, component.quantity, component.converted_currency]
      );
    }

    // 3. Update linked_prices
    await client.query(
      'DELETE FROM linked_prices WHERE parent_product_id = $1',
      [productId]
    );

    if (data.pricing_mode !== 'manual') {
      for (const component of data.components) {
        await client.query(
          `INSERT INTO linked_prices (
            parent_product_id, component_product_id, currency
          ) VALUES ($1, $2, $3)`,
          [productId, component.product_id, component.converted_currency]
        );
      }
    }
    console.log("Is Linked: ",['cost', 'price'].includes(data.pricing_mode))
    // 4. Update prices
    await client.query(
      `UPDATE prices 
       SET cost = $1, price = $2, currency = $3,
           is_multi = $4, has_difference = $5, difference_type = $6,
           difference_value = $7, vat = $8, profit = $9, discount = $10,
           link_type = $11
       WHERE product_id = $12`,
      [
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
        data.pricing_mode,
        productId
      ]
    );
    if(data.pricing_mode !== 'manual') {
      await client.query(
        'UPDATE prices SET is_linked = true WHERE product_id = $1',
        [productId]
      );
    }

    // 5. Update multi-currency prices
    await client.query(
      'DELETE FROM multi_currency_prices WHERE product_id = $1',
      [productId]
    );

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

    // 6. Update stock settings
    await client.query(
      `UPDATE stocks 
       SET stock_status = $1, quantity = $2, unit = $3, min_stock = $4,
           package_quantity = $5, is_linked = $6, is_component = $7,
           arrival_type = $8, arrival_date = $9
       WHERE product_id = $10`,
      [
        data.stock_status || 'unlimited',
        data.quantity || 0,
        data.unit || 'piece',
        data.min_stock || null,
        data.package_quantity || 1,
        true,
        false,
        data.arrival_type || 'unknown',
        data.arrival_type === 'date' ? data.arrival_date :
        data.arrival_type === 'weekly' ? data.arrival_day :
        (data.arrival_type === 'monthly' || data.arrival_type === 'interval') ? data.arrival_interval :
        null,
        productId
      ]
    );

    // Update components stock is_component flag
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

    // 7. Update package options
    await client.query(
      'DELETE FROM package_options WHERE product_id = $1',
      [productId]
    );

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
        message: 'Crafted product updated successfully',
        productId 
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating crafted product:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to update crafted product',
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