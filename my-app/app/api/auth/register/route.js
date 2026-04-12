// app/api/auth/register/route.js
import bcrypt from 'bcryptjs';
import { connectToDatabase } from '~/lib/db';

export async function POST(req) {
  const { email, password, name, surname } = await req.json();
  console.log("Email:",email)
  try {
    // Check if the email already exists in the database
    const client = await connectToDatabase();
    const existingUser = await client.query('SELECT * FROM users WHERE email = $1', [email]);

    if (existingUser.rows.length > 0) {
      // User with this email already exists
      console.log("Email Already Exist")
      return new Response(JSON.stringify({ error: 'Email already exists' }), { status: 400 });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    await client.query('INSERT INTO users (email, password_hash, first_name, last_name) VALUES ($1, $2, $3, $4)', [email, hashedPassword, name, surname]);
    client.release();

    return new Response(JSON.stringify({ message: 'User registered successfully' }), { status: 201 });
  } catch (error) {
    console.log("Error",error)
    return new Response(JSON.stringify({ error: 'User registration failed' }), { status: 500 });
  }
}
