import { connectToDatabase } from '~/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { setTokenCookie, getTokenCookie } from "~/app/utils/auth";
import { NextResponse } from 'next/server';

export async function PUT(req) {
  const { email, password, visitor_id } = await req.json();
  console.log("Email: ",email)
  try {
    const client = await connectToDatabase()
    const res = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (res.rows.length === 0) {
      console.log('User not found')
      client.release();
      return new Response('User not found', { status: 404 });
    }

    const user = res.rows[0];
    console.log("User: ",user)
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      console.log("Invalid Pw")
      client.release();
      return new Response('Invalid password', { status: 400 });
    }

    // Link anonymous events (visitor_id) to this user after successful login
    const vid = typeof visitor_id === 'string' && visitor_id.trim() ? visitor_id.trim() : null;
    if (vid) {
      try {
        await client.query(
          `UPDATE product_events
           SET user_id = $1
           WHERE user_id IS NULL AND visitor_id = $2`,
          [user.id, vid]
        );
      } catch (e) {
        console.error('Failed to link product_events visitor_id to user_id:', e);
        // non-fatal; login should still succeed
      }
    }
    
    const token = jwt.sign({ userId: user.id, role:user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
    console.log("Token",token)
    const response = new Response(JSON.stringify({ token, userId: user.id }), { status: 200 });
    console.log("Response",response)
    setTokenCookie(response,token)
    client.release();
    return response
  } catch (error) {
    console.log("Error:",error)
    return NextResponse.json({message:'Error logging in'},{status: 500});
  }
}

export async function GET(req) {
  
  try {
    // Get the cart from the cookie
    const token = getTokenCookie(req); // Call the helper function to extract cart from cookies
    console.log("Token:",token)
    // Return the cart (or an empty array if not found)
    if(token.userId && token.role) {
      return NextResponse.json({message:'Access Granted'},{status: 200});
    }
     else {
      return NextResponse.json({ error: 'Failed to retrieve cart' }, { status: 500 });
     }
  } catch (error) {
    // Return an error response if something goes wrong
    return NextResponse.json({ error: 'Failed to retrieve cart' }, { status: 500 });
  }


}