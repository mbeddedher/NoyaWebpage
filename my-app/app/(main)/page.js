import HomeContent from './HomeContent';
import { isVercelUsingUnreachableDatabase } from '~/lib/db';
import { queryProductCards } from '~/lib/productCards';
import { query } from '~/lib/db';

export const revalidate = 60;

export default async function Home() {
  let products = [];
  let quickCategories = [];

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

    try {
      const result = await query(
        `SELECT id, name, parent_id
         FROM web_categories
         WHERE parent_id IS NULL
         ORDER BY name
         LIMIT 10`,
        []
      );
      quickCategories = result.rows || [];
    } catch (e) {
      console.error('Failed to load quick categories for homepage:', e);
    }
  }

  return <HomeContent initialProducts={products} quickCategories={quickCategories} />;
}
