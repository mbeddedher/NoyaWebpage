import { connectToDatabase } from '~/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const client = await connectToDatabase();
    
    let queryText;
    let params = [];

    if (query) {
      // If search query is provided, search with limit
      queryText = `
        SELECT id, name, description, parent_id 
        FROM categories 
        WHERE name ILIKE $1 
        OR description ILIKE $1 
        ORDER BY name 
        LIMIT 3
      `;
      params = [`%${query}%`];
    } else {
      // If no search query, return all categories
      queryText = `
        SELECT id, name, description, parent_id 
        FROM categories 
        ORDER BY name
      `;
    }
    
    const result = await client.query(queryText, params);
    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Categories search error:', error);
    return NextResponse.json(
      { error: 'Error occurred while fetching categories' }, 
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const client = await connectToDatabase();

    // Validate required fields
    if (!data.name) {
      return new Response(
        JSON.stringify({ error: 'Category name is required' }),
        { status: 400 }
      );
    }

    // Start a transaction
    await client.query('BEGIN');

    try {
      // Insert the category
      const result = await client.query(
        `INSERT INTO categories (
          name, description, parent_id
        ) VALUES ($1, $2, $3)
        RETURNING id, name, description, parent_id, created_at`,
        [
          data.name,
          data.description || null,
          data.parent_id || null
        ]
      );

      // Commit the transaction
      await client.query('COMMIT');
      client.release();

      return new Response(
        JSON.stringify({
          message: 'Category created successfully',
          category: result.rows[0]
        }),
        {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Error creating category:', error);
    return new Response(
      JSON.stringify({ error: `Failed to create category: ${error.message}` }),
      { status: 500 }
    );
  }
}
