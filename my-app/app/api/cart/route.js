// app/api/cart/route.js
import { connectToDatabase } from '~/lib/db';
import { setCartCookie, getCartCookie } from '../../utils/cart';
import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    const { productId, quantity } = await req.json();
    if (!productId || !quantity) {
      return NextResponse.json({ error: 'Product ID and quantity are required' }, { status: 400 });
    }

    const cart = getCartCookie(req) || [];
    const existingItemIndex = cart.findIndex(item => item.productId === productId);

    if (existingItemIndex !== -1) {
      cart[existingItemIndex].quantity += quantity;
    } else {
      cart.push({ productId, quantity });
    }

    const response = NextResponse.json({ cart });
    setCartCookie(cart, response);
    return response;
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json({ error: 'Failed to add item to cart' }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const cart = getCartCookie(req);
    if (!cart || cart.length === 0) {
      return NextResponse.json({ cart: [] });
    }

    const client = await connectToDatabase();
    try {
      // Get product IDs from cart
      const productIds = cart.map(item => item.productId);

      // Query to get product details including variant information
      const query = `
        SELECT 
          p.id,
          p.name,
          p.sku,
          pr.price,
          pr.currency,
          pv.size as variant_size,
          pd.name as display_name
        FROM products p
        LEFT JOIN prices pr ON p.id = pr.product_id
        LEFT JOIN product_variants pv ON p.id = pv.product_id
        LEFT JOIN product_display pd ON pv.display_id = pd.id
        WHERE p.id = ANY($1)
      `;

      const result = await client.query(query, [productIds]);
      
      // Map cart items with product details
      const cartWithDetails = cart.map(item => {
        const product = result.rows.find(p => p.id === item.productId);
        if (!product) return null;

        return {
          productId: item.productId,
          quantity: item.quantity,
          name: product.name,
          price: product.price,
          currency: product.currency,
          sku: product.sku,
          variantId: product.variant_size ? `${product.display_name}-${product.variant_size}` : 'default',
          variantName: product.variant_size ? `${product.display_name} - ${product.variant_size}` : 'Standard',
          image: '/placeholder.jpg' // You can add actual image path here
        };
      }).filter(Boolean);

      return NextResponse.json({ cart: cartWithDetails });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error retrieving cart:', error);
    return NextResponse.json({ error: 'Failed to retrieve cart' }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const { productId, quantity } = await req.json();
    if (!productId || quantity < 0) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    const cart = getCartCookie(req) || [];
    const existingItemIndex = cart.findIndex(item => item.productId === productId);

    if (existingItemIndex === -1) {
      return NextResponse.json({ error: 'Item not found in cart' }, { status: 404 });
    }

    if (quantity === 0) {
      cart.splice(existingItemIndex, 1);
    } else {
      cart[existingItemIndex].quantity = quantity;
    }

    const response = NextResponse.json({ cart });
    setCartCookie(cart, response);
    return response;
  } catch (error) {
    console.error('Error updating cart:', error);
    return NextResponse.json({ error: 'Failed to update cart' }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const { productId } = await req.json();
    if (!productId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    const cart = getCartCookie(req) || [];
    const updatedCart = cart.filter(item => item.productId !== productId);

    const response = NextResponse.json({ cart: updatedCart });
    setCartCookie(updatedCart, response);
    return response;
  } catch (error) {
    console.error('Error removing item from cart:', error);
    return NextResponse.json({ error: 'Failed to remove item from cart' }, { status: 500 });
  }
}
