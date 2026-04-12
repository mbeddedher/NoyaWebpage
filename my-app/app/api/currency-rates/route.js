import { connectToDatabase } from '~/lib/db';

export async function GET() {
  const client = await connectToDatabase();

  try {
    // First check if we have any rates at all
    const checkResult = await client.query(
      `SELECT EXISTS (
        SELECT 1 FROM currency_rates LIMIT 1
      )`
    );

    if (!checkResult.rows[0].exists) {
      console.error('No currency rates found in the database');
      return Response.json({ error: 'No currency rates available' }, { status: 404 });
    }

    // Try to get today's rates
    let result = await client.query(
      `SELECT 
        from_currency || '_' || to_currency as rate_key,
        rate,
        date
      FROM currency_rates
      WHERE date = CURRENT_DATE`
    );

    // If no rates found for today, get the most recent rates
    if (result.rows.length === 0) {
      // Get the most recent date first
      const dateResult = await client.query(
        `SELECT MAX(date) as latest_date FROM currency_rates`
      );
      
      const latestDate = dateResult.rows[0].latest_date;
      console.log('Using rates from:', latestDate);

      result = await client.query(
        `SELECT 
          from_currency || '_' || to_currency as rate_key,
          rate,
          date
        FROM currency_rates
        WHERE date = $1`,
        [latestDate]
      );
    }

    if (result.rows.length === 0) {
      console.error('No currency rates found for any date');
      return Response.json({ error: 'No currency rates available' }, { status: 404 });
    }

    // Convert to a more usable format
    const rates = {};
    const date = result.rows[0].date; // All rows will have the same date
    result.rows.forEach(row => {
      rates[row.rate_key] = row.rate;
    });
    console.log( "rates", rates);
    return Response.json({
      rates,
      date: date.toISOString().split('T')[0],
      message: date.toISOString().split('T')[0] !== new Date().toISOString().split('T')[0] 
        ? `Using latest available rates from ${date.toISOString().split('T')[0]}`
        : undefined
    });

  } catch (error) {
    console.error('Error fetching currency rates:', error);
    return Response.json({ 
      error: 'Failed to fetch currency rates',
      details: error.message
    }, { status: 500 });
  } finally {
    client.release();
  }
} 