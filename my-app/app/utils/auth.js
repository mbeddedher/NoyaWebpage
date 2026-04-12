// utils/auth.js
import * as cookie from 'cookie';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Helper to set a token cookie
export const setTokenCookie = (res, token) => {
  const cookieOptions = {
    path: '/', 
    sameSite: 'Lax',
    httpOnly: false,  // Allow client-side access for consistency
    maxAge: 24 * 60 * 60, // 24 hours in seconds (matching JWT expiry)
    secure: process.env.NODE_ENV === 'production', // Only secure in production
  };

  const cookieString = cookie.serialize('token', token, cookieOptions);
  res.headers.set('Set-Cookie', cookieString);
};

// Helper to get a token from cookies
export const getTokenCookie = (req) => {
  try {
    // Get the token from cookies
    const token = req.cookies.get('token') ? req.cookies.get('token').value : null;

    if (!token) {
      return null; // No token found
    }

    // Verify the token using JWT
    const verifiedToken = jwt.verify(token, process.env.JWT_SECRET);
    return verifiedToken; // Return the decoded token if valid
  } catch (error) {
    console.error('Error verifying token:', error.message);
    return null; // Return null if token verification fails
  }
};

// Helper to remove the token cookie (used for logout)
export const removeTokenCookie = (res) => {
  res.setHeader(
    'Set-Cookie',
    cookie.serialize('token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: -1, // Set to expire immediately
      path: '/',
    })
  );
};

// Helper to verify a JWT token
export const verifyToken = async (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
};
