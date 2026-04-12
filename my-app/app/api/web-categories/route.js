import { connectToDatabase } from '~/lib/db';
import { NextResponse } from 'next/server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');

    const client = await connectToDatabase();
    
    let queryText = `
      SELECT id, name, description, parent_id 
      FROM web_categories 
      WHERE 1=1
    `;
    const params = [];

    if (query) {
      queryText += ` AND (name ILIKE $1 OR description ILIKE $1)`;
      params.push(`%${query}%`);
    }

    queryText += ` ORDER BY name`;

    const result = await client.query(queryText, params);
    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Web categories error:', error);
    return NextResponse.json(
      { error: 'Web kategorileri yüklenirken bir hata oluştu' }, 
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
      return NextResponse.json(
        { error: 'Category name is required' },
        { status: 400 }
      );
    }

    // Start a transaction
    await client.query('BEGIN');

    try {
      // Insert the category
      const result = await client.query(
        `INSERT INTO web_categories (
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

      return NextResponse.json({
        message: 'Web category created successfully',
        category: result.rows[0]
      }, { status: 201 });
    } catch (error) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Error creating web category:', error);
    return NextResponse.json(
      { error: `Failed to create web category: ${error.message}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const client = await connectToDatabase();
  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  try {
    // First check if category has children
    const childrenCheck = await client.query(
      'SELECT COUNT(*) FROM web_categories WHERE parent_id = $1',
      [id]
    );

    if (childrenCheck.rows[0].count > 0) {
      throw new Error('Cannot delete category with child categories');
    }

    const result = await client.query(
      'DELETE FROM web_categories WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return new Response(
        JSON.stringify({ error: 'Category not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    client.release();

    return new Response(
      JSON.stringify({ message: 'Category deleted successfully' }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error deleting web category:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 