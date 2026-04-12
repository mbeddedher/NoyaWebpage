import { NextResponse } from 'next/server';
import { verifyToken } from '../../../utils/auth';
import { query } from '~/lib/db';

export async function GET(request) {
  try {
    // Get token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];

    // Verify token and get user ID
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user data from database
    const userQuery = 'SELECT id, first_name, last_name, email, phone_number FROM users WHERE id = $1';
    const userResult = await query(userQuery, [decoded.userId]);
    
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user addresses
    const addressQuery = 'SELECT * FROM user_addresses WHERE user_id = $1';
    const addressResult = await query(addressQuery, [decoded.userId]);

    return NextResponse.json({
      user: userResult.rows[0],
      addresses: addressResult.rows
    });

  } catch (error) {
    console.error('Error in profile route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 