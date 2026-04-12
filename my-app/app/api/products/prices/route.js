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
        p.product_id,
        p.price,
        p.discount,
        p.currency,
        p.is_multi,
        CASE 
          WHEN p.is_multi THEN (
            SELECT json_agg(
              json_build_object(
                'currency', mcp.currency,
                'price', mcp.price
              )
            )
            FROM multi_currency_prices mcp
            WHERE mcp.product_id = p.product_id
          )
          ELSE NULL
        END as multi_currency_prices,
        (
          SELECT json_object_agg(
            cr.to_currency, cr.rate
          )
          FROM currency_rates cr 
          WHERE cr.from_currency = p.currency 
          AND cr.date = CURRENT_DATE
        ) as exchange_rates
      FROM prices p
    `;

    const result = await client.query(query);
    await releaseClient();

    return new Response(JSON.stringify(result.rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in prices route:', error);
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