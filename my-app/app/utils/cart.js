// utils/cart.js
import * as cookie from 'cookie';
import { NextResponse } from 'next/server';

export const setCartCookie = (cart, res) => {
  const cookieOptions = {
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  };

  const cookieString = cookie.serialize('cart', JSON.stringify(cart), cookieOptions);
  res.headers.set('Set-Cookie', cookieString);
};

export const getCartCookie = (req) => {
  try {
    if (!req.cookies) {
      return [];
    }

    const cartCookie = req.cookies.get('cart');
    if (!cartCookie) {
      return [];
    }

    const cartData = JSON.parse(cartCookie.value);
    return Array.isArray(cartData) ? cartData : [];
  } catch (error) {
    console.error('Error parsing cart cookie:', error);
    return [];
  }
};