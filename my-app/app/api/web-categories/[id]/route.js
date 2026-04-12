import { NextResponse } from 'next/server';
import { query, connectToDatabase } from '~/lib/db';

// GET a single web category
export async function GET(request, { params }) {
  try {
    const { id } = params;
    
    const result = await query(
      'SELECT * FROM web_categories WHERE id = $1',
      [id]
    );

    if (!result.rows || result.rows.length === 0) {
      return new NextResponse(
        JSON.stringify({ message: 'Category not found' }),
        { status: 404 }
      );
    }

    return new NextResponse(JSON.stringify(result.rows[0]));
  } catch (error) {
    console.error('Error fetching web category:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Error fetching web category' }),
      { status: 500 }
    );
  }
}

// PUT (update) a web category
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description, parent_id } = body;

    // Check if category exists
    const existingCategory = await query(
      'SELECT * FROM web_categories WHERE id = $1',
      [id]
    );

    if (!existingCategory.rows || existingCategory.rows.length === 0) {
      return new NextResponse(
        JSON.stringify({ message: 'Category not found' }),
        { status: 404 }
      );
    }

    // Update category
    await query(
      `UPDATE web_categories 
       SET name = $1, description = $2, parent_id = $3
       WHERE id = $4`,
      [name, description, parent_id, id]
    );

    // Get updated category
    const updatedCategory = await query(
      'SELECT * FROM web_categories WHERE id = $1',
      [id]
    );

    return new NextResponse(JSON.stringify(updatedCategory.rows[0]));
  } catch (error) {
    console.error('Error updating web category:', error);
    return new NextResponse(
      JSON.stringify({ message: 'Error updating web category' }),
      { status: 500 }
    );
  }
}

// DELETE a web category
export async function DELETE(request, { params }) {
  const client = await connectToDatabase();
  
  try {
    const { id } = params;
    
    // Start transaction
    await client.query('BEGIN');

    // Check if category exists
    const existingCategory = await client.query(
      'SELECT * FROM web_categories WHERE id = $1',
      [id]
    );

    if (!existingCategory.rows || existingCategory.rows.length === 0) {
      await client.query('ROLLBACK');
      return new NextResponse(
        JSON.stringify({ message: 'Category not found' }),
        { status: 404 }
      );
    }

    // Check if category is used in product_display
    const productDisplays = await client.query(
      'SELECT id FROM product_display WHERE category_id = $1',
      [id]
    );

    if (productDisplays.rows.length > 0) {
      await client.query('ROLLBACK');
      return new NextResponse(
        JSON.stringify({ 
          message: 'Cannot delete category because it is being used by product displays. Please remove or reassign these product displays first.',
          detail: `This category is used by ${productDisplays.rows.length} product display(s).`
        }),
        { status: 400 }
      );
    }

    // First, get all child categories
    const childCategories = await client.query(
      'SELECT id FROM web_categories WHERE parent_id = $1',
      [id]
    );

    // Check if any child categories are used in product_display
    if (childCategories.rows.length > 0) {
      const childIds = childCategories.rows.map(row => row.id);
      const childProductDisplays = await client.query(
        'SELECT id, category_id FROM product_display WHERE category_id = ANY($1)',
        [childIds]
      );

      if (childProductDisplays.rows.length > 0) {
        await client.query('ROLLBACK');
        return new NextResponse(
          JSON.stringify({ 
            message: 'Cannot delete category because some of its subcategories are being used by product displays. Please remove or reassign these product displays first.',
            detail: `${childProductDisplays.rows.length} product display(s) are using subcategories.`
          }),
          { status: 400 }
        );
      }

      // Delete all child categories if they're not being used
      await client.query(
        'DELETE FROM web_categories WHERE parent_id = $1',
        [id]
      );
    }

    // Now delete the category itself
    const deleteResult = await client.query(
      'DELETE FROM web_categories WHERE id = $1 RETURNING *',
      [id]
    );

    if (deleteResult.rows.length === 0) {
      await client.query('ROLLBACK');
      throw new Error('Failed to delete category');
    }

    // Commit transaction
    await client.query('COMMIT');

    return new NextResponse(
      JSON.stringify({ 
        message: 'Category deleted successfully',
        deletedCategory: deleteResult.rows[0]
      })
    );
  } catch (error) {
    // Rollback transaction on error
    await client.query('ROLLBACK');
    
    console.error('Detailed delete error:', {
      message: error.message,
      stack: error.stack,
      detail: error.detail
    });

    return new NextResponse(
      JSON.stringify({ 
        message: 'Error deleting web category',
        error: error.message,
        detail: error.detail || 'No additional details available'
      }),
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 