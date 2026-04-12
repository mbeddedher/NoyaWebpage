import { NextResponse } from 'next/server';
import { query } from '~/lib/db';
import bcrypt from 'bcryptjs';

// GET /api/users - Get all users
export async function GET() {
  try {
    const result = await query(
      `SELECT id, first_name, last_name, email, is_active, role, created_at, updated_at 
       FROM users 
       ORDER BY created_at DESC`
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// POST /api/users - Create a new user
export async function POST(request) {
  try {
    const { first_name, last_name, email, password, role } = await request.json();

    // Hash the password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const result = await query(
      `INSERT INTO users (first_name, last_name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, first_name, last_name, email, is_active, role, created_at`,
      [first_name, last_name, email, password_hash, role]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Database Error:', error);
    if (error.code === '23505') { // Unique violation error code
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    );
  }
}

// DELETE /api/users - Delete multiple users
export async function DELETE(request) {
  try {
    const { ids } = await request.json();
    
    await query(
      `DELETE FROM users WHERE id = ANY($1)`,
      [ids]
    );

    return NextResponse.json({ message: 'Users deleted successfully' });
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete users' },
      { status: 500 }
    );
  }
} 