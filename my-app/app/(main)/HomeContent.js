'use client';

import "../styles/MainPage.css";
import Link from 'next/link';
import Hero from '../components/Hero';
import FourItems from '../components/FourItems';
import { ProductsShowcase } from '../components/ProductsShowcase';

export default function HomeContent({ initialProducts = [], quickCategories = [] }) {
  return (
    <div id="main-page">
      {Array.isArray(quickCategories) && quickCategories.length > 0 && (
        <section className="quick-categories" aria-label="Quick categories">
          <div className="quick-categories__row">
            {quickCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/products?categories=${encodeURIComponent(cat.id)}`}
                className="quick-categories__tile"
              >
                <span className="quick-categories__name">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      <ProductsShowcase title="Öne Çıkan Ürünler" products={initialProducts} />
      <Hero />
      <FourItems />
    </div>
  );
}
