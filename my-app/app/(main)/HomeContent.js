'use client';

import "../styles/MainPage.css";
import Hero from '../components/Hero';
import FourItems from '../components/FourItems';
import { ProductsShowcase } from '../components/ProductsShowcase';

export default function HomeContent({ initialProducts = [] }) {
  return (
    <div id="main-page">
      <ProductsShowcase title="Öne Çıkan Ürünler" products={initialProducts} />
      <Hero />
      <FourItems />
    </div>
  );
}
