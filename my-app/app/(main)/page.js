import HomeContent from './HomeContent';
import { queryProductCards } from '~/lib/productCards';

export const revalidate = 60;

export default async function Home() {
  let products = [];
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

  return <HomeContent initialProducts={products} />;
}
