import { connectToDatabase } from '~/lib/db';

export async function GET(request, { params }) {
  const { id } = params;

  try {
    const client = await connectToDatabase();
    const result = await client.query(
      'SELECT id, name, contact_name, phone, email, address, city, country, postal_code, website FROM suppliers WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      client.release();
      return new Response(
        JSON.stringify({ error: 'Supplier not found' }),
        { status: 404 }
      );
    }

    client.release();
    return new Response(
      JSON.stringify(result.rows[0]),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching supplier:', error);
    return new Response(
      JSON.stringify({ error: `Failed to fetch supplier: ${error.message}` }),
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;

  try {
    const client = await connectToDatabase();

    // Start a transaction
    await client.query('BEGIN');

    try {
      // Delete the supplier
      const result = await client.query(
        'DELETE FROM suppliers WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        client.release();
        return new Response(
          JSON.stringify({ error: 'Supplier not found' }),
          { status: 404 }
        );
      }

      // Commit the transaction
      await client.query('COMMIT');
      client.release();

      return new Response(
        JSON.stringify({
          message: 'Supplier deleted successfully',
          supplier: result.rows[0]
        }),
        { status: 200 }
      );
    } catch (error) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting supplier:', error);
    return new Response(
      JSON.stringify({ error: `Failed to delete supplier: ${error.message}` }),
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  
  try {
    const data = await request.json();
    const client = await connectToDatabase();

    // Validate required fields
    if (!data.name) {
      client.release();
      return new Response(
        JSON.stringify({ error: 'Supplier name is required' }),
        { status: 400 }
      );
    }

    // Start a transaction
    await client.query('BEGIN');

    try {
      // Update the supplier
      const result = await client.query(
        `UPDATE suppliers 
         SET name = $1, contact_name = $2, phone = $3, email = $4,
             address = $5, city = $6, country = $7, postal_code = $8, website = $9
         WHERE id = $10
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
          data.website || null,
          id
        ]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        client.release();
        return new Response(
          JSON.stringify({ error: 'Supplier not found' }),
          { status: 404 }
        );
      }

      // Commit the transaction
      await client.query('COMMIT');
      client.release();

      return new Response(
        JSON.stringify(result.rows[0]),
        { status: 200 }
      );
    } catch (error) {
      // Rollback in case of error
      await client.query('ROLLBACK');
      client.release();
      throw error;
    }
  } catch (error) {
    console.error('Error updating supplier:', error);
    return new Response(
      JSON.stringify({ error: `Failed to update supplier: ${error.message}` }),
      { status: 500 }
    );
  }
} 