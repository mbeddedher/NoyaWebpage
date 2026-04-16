'use client';

import "../styles/MainPage.css";
import Hero from '../components/Hero';
import FourItems from '../components/FourItems';
import MainPageQuickStrip from '../components/MainPageQuickStrip';
import { ProductsShowcase } from '../components/ProductsShowcase';
import MainPageShorts from '../components/MainPageShorts';

export default function HomeContent({ initialProducts = [] }) {
  return (
    <div id="main-page">
      <MainPageQuickStrip />
      <ProductsShowcase title="Öne Çıkan Ürünler" products={initialProducts} />
      <Hero />
      <MainPageShorts title="Shorts" />
    </div>
  );
}
