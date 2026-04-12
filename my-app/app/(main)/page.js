import HomeContent from './HomeContent';

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export default async function Home() {
  let products = [];
  try {
    const res = await fetch(`${getBaseUrl()}/api/product-cards`, {
      next: { revalidate: 60 },
    });
    const data = await res.json();
    products = Array.isArray(data) ? data : data.products || [];
  } catch (e) {
    console.error('Failed to fetch products for homepage:', e);
  }

  return <HomeContent initialProducts={products} />;
}
