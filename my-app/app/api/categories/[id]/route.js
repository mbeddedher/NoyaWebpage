import { connectToDatabase } from '~/lib/db';

export async function DELETE(request, { params }) {
  const { id } = params;

  try {
    const client = await connectToDatabase();

    // Start a transaction
    await client.query('BEGIN');

    try {
      // Check if any products use this category (prevents FK constraint error:
      // products.category_id is NOT NULL but FK uses ON DELETE SET NULL)
      const productsCheck = await client.query(
        'SELECT COUNT(*) as count FROM products WHERE category_id = $1',
        [id]
      );

      if (parseInt(productsCheck.rows[0]?.count || 0, 10) > 0) {
        await client.query('ROLLBACK');
        client.release();
        const productCount = productsCheck.rows[0].count;
        return new Response(
          JSON.stringify({
            error: `Cannot delete category because ${productCount} product(s) are assigned to it. Please reassign these products to another category first.`
          }),
          { status: 400 }
        );
      }

      // Delete the category
      const result = await client.query(
        'DELETE FROM categories WHERE id = $1 RETURNING *',
        [id]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        client.release();
        return new Response(
          JSON.stringify({ error: 'Category not found' }),
          { status: 404 }
        );
      }

      // Commit the transaction
      await client.query('COMMIT');
      client.release();

      return new Response(
        JSON.stringify({
          message: 'Category deleted successfully',
          category: result.rows[0]
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
    console.error('Error deleting category:', error);
    return new Response(
      JSON.stringify({ error: `Failed to delete category: ${error.message}` }),
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  const { id } = params;

  try {
    const client = await connectToDatabase();
    const result = await client.query(
      'SELECT * FROM categories WHERE id = $1',
      [id]
    );
    client.release();

    if (result.rowCount === 0) {
      return new Response(
        JSON.stringify({ error: 'Category not found' }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ rows: result.rows }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching category:', error);
    return new Response(
      JSON.stringify({ error: `Failed to fetch category: ${error.message}` }),
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  const { id } = params;
  const data = await request.json();

  try {
    const client = await connectToDatabase();
    
    // Start a transaction
    await client.query('BEGIN');

    try {
      // Update the category
      const result = await client.query(
        'UPDATE categories SET name = $1, parent_id = $2 WHERE id = $3 RETURNING *',
        [data.name, data.parent_id, id]
      );

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        client.release();
        return new Response(
          JSON.stringify({ error: 'Category not found' }),
          { status: 404 }
        );
      }

      // Commit the transaction
      await client.query('COMMIT');
      client.release();

      return new Response(
        JSON.stringify({
          message: 'Category updated successfully',
          category: result.rows[0]
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
    console.error('Error updating category:', error);
    return new Response(
      JSON.stringify({ error: `Failed to update category: ${error.message}` }),
      { status: 500 }
    );
  }
} 