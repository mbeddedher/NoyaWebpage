import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

export const config = {
  matcher: ['/adminpanel/:path*', '/account/:path*']
};

export async function middleware(req) {
  const getToken = async (req) => {
    try {
      const token = req.cookies.get('token') ? req.cookies.get('token').value : null;
      if (!token) {
        return null;
      }
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const { payload } = await jwtVerify(token, secret);
      return payload;
    } catch (error) {
      console.error('Error verifying token:', error.message);
      return null;
    }
  };

  const token = await getToken(req);
  const pathname = req.nextUrl.pathname;

  // Handle protected routes
  if (pathname.startsWith('/adminpanel')) {
    console.log("Token:",token)
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
    if (token.role !== 'admin') {
      return NextResponse.redirect(new URL('/403', req.url));
    }
  }

  if (pathname.startsWith('/account')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', req.url));
    }
  }

  return NextResponse.next();
}