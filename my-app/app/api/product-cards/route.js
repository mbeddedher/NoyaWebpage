import {
  parseProductCardSearchParams,
  queryProductCards,
} from '~/lib/productCards';

export async function GET(request) {
  try {
    const filters = parseProductCardSearchParams(request);
    const rows = await queryProductCards(filters);
    return new Response(JSON.stringify(rows), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching cart products:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to fetch cart products',
        details: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
