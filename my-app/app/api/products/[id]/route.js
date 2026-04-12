import { NextResponse } from 'next/server';
import { query } from '~/lib/db';

// GET a single product with all its details
export async function GET(request, context) {
  try {
    const { id } = await context.params;

    // Get basic product info with category and supplier names
    const productResult = await query(
      `SELECT p.*, c.name as category_name, s.name as supplier_name 
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       LEFT JOIN suppliers s ON p.supplier_id = s.id
       WHERE p.id = $1`,
      [id]
    );

    if (!productResult.rows || productResult.rows.length === 0) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      );
    }

    const product = productResult.rows[0];
  

    // Get stock details
    const stockResult = await query(
      'SELECT * FROM stocks WHERE product_id = $1',
      [id]
    );
    const stockDetails = stockResult.rows[0] || {};
    
    // Format arrival_date if it exists
    /*if (stockDetails.arrival_type === "date") {
      try {
        const date = new Date(stockDetails.arrival_date);
        if (!isNaN(date.getTime())) {
          stockDetails.arrival_date = date.toISOString().split('T')[0];
        } else {
          stockDetails.arrival_date = null;
        }
      } catch (error) {
        console.warn('Invalid date format:', error);
        stockDetails.arrival_date = null;
      }
    }*/
   stockDetails.arrival_day = null;
   stockDetails.arrival_interval = null;
    if(stockDetails.arrival_type === 'interval') {
      console.log("Arrival Date when it is interval:", stockDetails.arrival_date)
      stockDetails.arrival_interval = parseInt(stockDetails.arrival_date);
    }else if(stockDetails.arrival_type === "weeky") {
      stockDetails.arrival_day = stockDetails.arrival_date;
    }
    
    console.log("Stock Details:", stockDetails)
    product.stock = stockDetails;

    // Get price details
    const priceResult = await query(
      'SELECT * FROM prices WHERE product_id = $1',
      [id]
    );
    product.pricing = priceResult.rows[0] || {};

    // Get package options
    const packageResult = await query(
      'SELECT * FROM package_options WHERE product_id = $1 ORDER BY order_index',
      [id]
    );
    product.package_options = packageResult.rows || [];

    return NextResponse.json({ rows: [product] });
  } catch (error) {
    console.error('Error fetching product:', error);
    return NextResponse.json(
      { message: 'Error fetching product' },
      { status: 500 }
    );
  }
}

// PUT (update) a product
export async function PUT(request, context) {
  try {
    const { id } = await context.params;
    const body = await request.json();

    // Update basic product info
    await query(
      `UPDATE products 
       SET name = $1, sku = $2, brand = $3, dimensions = $4, 
           category_id = $5, supplier_id = $6, is_active = $7
       WHERE id = $8`,
      [
        body.name,
        body.sku,
        body.brand,
        body.dimensions,
        body.category_id,
        body.supplier_id,
        body.is_active,
        id
      ]
    );
    let arrival_interval = body.arrival_day;

    if(body.arrival_type === 'date') {
      arrival_interval = body.arrival_date;
    }else if(body.arrival_type === 'interval' || body.arrival_type === 'monthly'){
      arrival_interval = String(body.arrival_interval);
    }

    console.log("Arrival Interval",arrival_interval)
    // Update stock details
    await query(
      `UPDATE stocks 
       SET quantity = $1, 
           unit = $2::unit_type, 
           min_stock = $3, 
           stock_status = $4::stock_status_type,
           arrival_type = $5::stock_arrival_interval_type,
           arrival_date = $6
       WHERE product_id = $7`,
      [
        body.quantity,
        body.unit,
        body.min_stock,
        body.stock_status,
        body.arrival_type,
        arrival_interval,
        id
      ]
    );

    // If no stock record exists, create one
    const stockResult = await query(
      'SELECT * FROM stocks WHERE product_id = $1',
      [id]
    );
    
    if (stockResult.rows.length === 0) {
      await query(
        `INSERT INTO stocks 
         (product_id, quantity, unit, min_stock, stock_status, arrival_type, arrival_date)
         VALUES ($1, $2, $3::unit_type, $4, $5::stock_status_type, $6::stock_arrival_interval_type, $7)`,
        [
          id,
          body.quantity,
          body.unit,
          body.min_stock,
          body.stock_status,
          body.arrival_type,
          arrival_interval
        ]
      );
    }

    // Update price details
    await query(
      `UPDATE prices 
       SET price = $1, 
           currency = $2, 
           cost = $3, 
           vat = $4, 
           discount = $5
       WHERE product_id = $6`,
      [
        body.price,
        body.currency,
        body.cost,
        body.vat,
        body.discount,
        id
      ]
    );

    // If no price record exists, create one
    const priceResult = await query(
      'SELECT * FROM prices WHERE product_id = $1',
      [id]
    );
    
    if (priceResult.rows.length === 0) {
      await query(
        `INSERT INTO prices 
         (product_id, price, currency, cost, vat, discount)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          id,
          body.price,
          body.currency,
          body.cost,
          body.vat,
          body.discount
        ]
      );
    }

    // Delete existing package options
    await query(
      'DELETE FROM package_options WHERE product_id = $1',
      [id]
    );

    // Insert new package options if any
    if (body.package_options && body.package_options.length > 0) {
      for (const option of body.package_options) {
        await query(
          `INSERT INTO package_options 
           (product_id, name, count, discount, status, stock_status)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            option.name,
            option.count,
            option.discount,
            option.status,
            option.stock_status
          ]
        );
      }
    }

    // Fetch updated product data
    const updatedProduct = await query(
      `SELECT p.*, 
              s.quantity, s.unit, s.min_stock, s.stock_status,
              pr.price, pr.currency, pr.cost, pr.vat, pr.discount
       FROM products p
       LEFT JOIN stocks s ON p.id = s.product_id
       LEFT JOIN prices pr ON p.id = pr.product_id
       WHERE p.id = $1`,
      [id]
    );

    return NextResponse.json({
      message: 'Product updated successfully',
      product: updatedProduct.rows[0]
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { 
        message: 'Error updating product',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

// DELETE a product
export async function DELETE(request, context) {
  try {
    const { id } = await context.params;

    // Delete related records first (not needed due to ON DELETE CASCADE)
    // The foreign key constraints with ON DELETE CASCADE will handle this automatically

    // Delete the product
    const result = await query(
      'DELETE FROM products WHERE id = $1 RETURNING *',
      [id]
    );

    if (!result.rows || result.rows.length === 0) {
      return new NextResponse(
        JSON.stringify({ message: 'Product not found' }),
        { status: 404 }
      );
    }

    return new NextResponse(
      JSON.stringify({ message: 'Product deleted successfully' })
    );
  } catch (error) {
    console.error('Error deleting product:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Error deleting product' }),
      { status: 500 }
    );
  }
}
