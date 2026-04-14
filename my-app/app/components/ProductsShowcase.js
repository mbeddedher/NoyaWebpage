'use client';

import React, { useRef, useState, useEffect } from 'react';
import { ProductCard } from './ProductCard';
import '../styles/ProductsShowcase.css';

const CARD_WIDTH = 220;
const GAP = 20;
const STEP = 2;

export const ProductsShowcase = ({ products = [], title = '' }) => {
  const trackRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = () => {
    const el = trackRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [products]);

  const scroll = (direction) => {
    const el = trackRef.current;
    if (!el) return;
    const moveBy = (CARD_WIDTH + GAP) * STEP;
    el.scrollBy({ left: direction === 'left' ? -moveBy : moveBy, behavior: 'smooth' });
  };

  if (!products?.length) return null;

  return (
    <section className="products-showcase">
      <div className="products-showcase-header">
        {title && <h2 className="products-showcase-title">{title}</h2>}
      </div>
      <div className="products-showcase-scroller">
        {canScrollLeft && (
          <button
            type="button"
            className="products-showcase-btn products-showcase-btn-prev products-showcase-btn-overlay"
            onClick={() => scroll('left')}
            aria-label="Önceki ürünler"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
          </button>
        )}

        {canScrollRight && (
          <button
            type="button"
            className="products-showcase-btn products-showcase-btn-next products-showcase-btn-overlay"
            onClick={() => scroll('right')}
            aria-label="Sonraki ürünler"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
          </button>
        )}

        <div className="products-showcase-viewport" ref={trackRef}>
          <div className="products-showcase-track">
            {products.map((product) => (
              <div key={product.product_id} className="products-showcase-card-wrap">
              <ProductCard
                key={product.product_id}
                // TEMP: force ranking to show the design in this showcase
                product={{ ...product, ranking: 3 }}
                source="home"
                enableHoverGallery={false}
              />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

