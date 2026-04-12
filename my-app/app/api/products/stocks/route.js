import { connectToDatabase } from '~/lib/db';

export async function GET() {
  let client;
  let isReleased = false;

  const releaseClient = async () => {
    if (client && !isReleased) {
      try {
        await client.release();
        isReleased = true;
      } catch (releaseError) {
        console.error('Error releasing database client:', releaseError);
        // Don't throw here as we don't want to mask the original error
      }
    }
  };

  try {
    client = await connectToDatabase();
    
    const query = `
      SELECT 
        product_id,
        quantity,
        unit,
        stock_status
      FROM stocks
    `;

    const result = await client.query(query);
    await releaseClient();

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in stocks route:', error);
    await releaseClient();

    // Determine the appropriate error message and status code
    let statusCode = 500;
    let errorMessage = 'Internal server error';

    if (error.message.includes('connection')) {
      errorMessage = 'Database connection error';
    } else if (error.message.includes('relation') || error.message.includes('column')) {
      statusCode = 400;
      errorMessage = 'Invalid database query';
    }

    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: error.message
      }),
      { status: statusCode }
    );
  }
} 