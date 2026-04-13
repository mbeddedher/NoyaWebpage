import HomeContent from './HomeContent';
import { isVercelUsingUnreachableDatabase } from '~/lib/db';
import { queryProductCards } from '~/lib/productCards';

export const revalidate = 60;

export default async function Home() {
  let products = [];

  if (isVercelUsingUnreachableDatabase()) {
    console.warn(
      '[homepage] Skipping product query: DATABASE_URL targets localhost on Vercel. Set a cloud Postgres DATABASE_URL in Vercel → Settings → Environment Variables.'
    );
  } else {
    try {
      products = await queryProductCards({
        categories: [],
        minPrice: null,
        maxPrice: null,
        brands: [],
        sizes: [],
      });
    } catch (e) {
      console.error('Failed to load products for homepage:', e);
    }
  }

  return <HomeContent initialProducts={products} />;
}
