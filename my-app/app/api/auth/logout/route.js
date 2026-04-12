// app/api/auth/logout/route.js
import { NextResponse } from 'next/server';
import { removeTokenCookie } from '../../../utils/auth'; // Import the utility to remove the token from cookies

export async function GET() {
  // Remove the token cookie to log out the user
  const response = NextResponse.json({ message: 'Cookie deleted' });

  response.cookies.set('token', '', {
    path: '/',
    expires: new Date(0), // Expire immediately
  });

  return response;

  // Send a success response
  return NextResponse.json({ message: 'Logged out successfully' });
}