import { connectToDatabase } from '~/lib/db';

export async function GET(request) {
  try {
    const client = await connectToDatabase();
    const result = await client.query(
      'SELECT id, name, contact_name, phone, email, address, city, country, postal_code, website FROM suppliers ORDER BY name'
    );
    client.release();

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching suppliers:', error);
    return new Response(
      JSON.stringify({ error: `Failed to fetch suppliers: ${error.message}` }),
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
        JSON.stringify({ error: 'Supplier name is required' }),
        { status: 400 }
      );
    }

    // Start a transaction
    await client.query('BEGIN');

    try {
      // Insert the supplier
      const result = await client.query(
        `INSERT INTO suppliers (
          name, contact_name, phone, email, 
          address, city, country, postal_code, website
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id, name, contact_name, phone, email, address, city, country, postal_code, website`,
        [
          data.name,
          data.contact_name || null,
          data.phone || null,
          data.email || null,
          data.address || null,
          data.city || null,
          data.country || null,
          data.postal_code || null,
          data.website || null
        ]
      );

      // Commit the transaction
      await client.query('COMMIT');
      client.release();

      return new Response(
        JSON.stringify({
          message: 'Supplier created successfully',
          supplier: result.rows[0]
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
    console.error('Error creating supplier:', error);
    return new Response(
      JSON.stringify({ error: `Failed to create supplier: ${error.message}` }),
      { status: 500 }
    );
  }
} 