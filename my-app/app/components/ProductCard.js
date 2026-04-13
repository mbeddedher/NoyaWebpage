'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import OptimizedImage from './OptimizedImage';
import { trackProductEvent } from '../lib/productEvents';
import { useUser } from '../context/UserContext';
import '../styles/ProductCard.css';
import { publicImageUrl } from '~/lib/imageUrls';

const noImageSrc = '/no-image.svg';

function toImageSrc(url) {
  if (!url) return noImageSrc;
  return publicImageUrl(url) || noImageSrc;
}

export const ProductCard = ({ product, source }) => {
  const { userId } = useUser();
  const [selectedSize, setSelectedSize] = useState(product.default_size || product.size_array?.[0]);
  const currentPriceIndex = product.size_array?.indexOf(selectedSize) || 0;
  const currentPrice = product.price_array?.[currentPriceIndex] || product.min_price;
  const cardRef = useRef(null);
  const impressionSent = useRef(false);

  const [galleryImages, setGalleryImages] = useState([]);
  const [hoverImageIndex, setHoverImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const galleryFetched = useRef(false);
  const hoverArmedRef = useRef(false);
  const hoverArmTimerRef = useRef(null);
  const galleryInteractSentRef = useRef(false);
  const sizeSelectSentRef = useRef(false);
  const galleryChangeCountRef = useRef(0);
  const lastGalleryIdxRef = useRef(null);
  const distinctSizesRef = useRef(new Set());

  const fetchGallery = useCallback(async () => {
    if (galleryFetched.current) return;
    galleryFetched.current = true;
    try {
      const res = await fetch(`/api/product-displays/${product.product_id}/images`);
      if (!res.ok) return;
      const data = await res.json();
      const list = data.images || [];
      setGalleryImages(list);
      const primaryIdx = list.findIndex((img) => img.is_primary);
      setHoverImageIndex(primaryIdx >= 0 ? primaryIdx : 0);
    } catch {
      galleryFetched.current = false;
    }
  }, [product.product_id]);

  useEffect(() => {
    if (impressionSent.current || !cardRef.current || !source) return;
    const el = cardRef.current;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !impressionSent.current) {
          impressionSent.current = true;
          trackProductEvent(product.product_id, 'impression', { source, userId });
        }
      },
      { threshold: 0.25, rootMargin: '50px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product.product_id, source, userId]);

  useEffect(() => {
    // reset intent flags when product changes
    galleryInteractSentRef.current = false;
    sizeSelectSentRef.current = false;
    galleryChangeCountRef.current = 0;
    lastGalleryIdxRef.current = null;
    distinctSizesRef.current = new Set();
  }, [product.product_id]);

  const primarySrc = toImageSrc(product.primary_image_url);
  const displaySrc =
    isHovered && galleryImages.length > 0 && galleryImages[hoverImageIndex]?.thumb_url
      ? toImageSrc(galleryImages[hoverImageIndex].thumb_url)
      : primarySrc;

  return (
    <div
      className="product-card"
      ref={cardRef}
      onMouseEnter={() => {
        setIsHovered(true);
        fetchGallery();
        hoverArmedRef.current = false;
        galleryInteractSentRef.current = false;
        galleryChangeCountRef.current = 0;
        lastGalleryIdxRef.current = hoverImageIndex;
        if (hoverArmTimerRef.current) clearTimeout(hoverArmTimerRef.current);
        // arm after a short delay so mouse pass-through doesn't count as interaction
        hoverArmTimerRef.current = setTimeout(() => {
          hoverArmedRef.current = true;
        }, 350);
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        hoverArmedRef.current = false;
        if (hoverArmTimerRef.current) clearTimeout(hoverArmTimerRef.current);
        hoverArmTimerRef.current = null;
      }}
    >
      <Link
        href={`/products/${product.product_id}`}
        className="product-image-link"
        onClick={() => source && trackProductEvent(product.product_id, 'click', { source, userId })}
      >
        <div className="product-image">
          <OptimizedImage
            src={displaySrc}
            alt={product.product_name}
            fill
            fallback={noImageSrc}
            className="product-thumbnail"
            sizes="(max-width: 640px) 50vw, (max-width: 1200px) 33vw, 25vw"
            style={{ objectFit: 'contain', objectPosition: 'center' }}
          />
          {isHovered && galleryImages.length > 1 && (
            <>
              <div
                className="product-image-slices"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onMouseMove={(e) => {
                  const el = e.currentTarget;
                  const x = e.nativeEvent.offsetX;
                  const w = el.offsetWidth;
                  const n = galleryImages.length;
                  const idx = Math.min(Math.floor((x / w) * n), n - 1);
                  setHoverImageIndex(idx);

                  // Stronger rule: only record after user actually changes images at least twice
                  // (scrubbing / a single accidental move shouldn't count).
                  if (!hoverArmedRef.current || galleryInteractSentRef.current) return;
                  if (lastGalleryIdxRef.current == null) {
                    lastGalleryIdxRef.current = idx;
                    return;
                  }
                  if (idx !== lastGalleryIdxRef.current) {
                    galleryChangeCountRef.current += 1;
                    lastGalleryIdxRef.current = idx;
                  }
                  if (galleryChangeCountRef.current >= 2) {
                    galleryInteractSentRef.current = true;
                    trackProductEvent(product.product_id, 'gallery_interact', { source, userId });
                  }
                }}
              />
              <div
                className="product-card-dots"
                onClick={(e) => e.preventDefault()}
              >
                {galleryImages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`product-card-dot ${hoverImageIndex === idx ? 'active' : ''}`}
                    aria-label={`Image ${idx + 1}`}
                    onMouseEnter={() => setHoverImageIndex(idx)}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setHoverImageIndex(idx);
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </Link>
      
      <div className="product-info">
        <div className="product-header">
          <Link 
            href={`/products/${product.product_id}`}
            className="product-name-link"
            onClick={() => source && trackProductEvent(product.product_id, 'click', { source, userId })}
          >
            <h3 className="product-name">{product.product_name}</h3>
          </Link>
          <div className="product-price">
            <span className="price">{currentPrice} TL</span>
          </div>
        </div>

        {product.has_variants && (
          <div className="size-selector">
            {product.size_array?.map((size, index) => (
              <button
                key={size}
                className={`size-button ${selectedSize === size ? 'selected' : ''}`}
                onClick={(e) => {
                  e.preventDefault(); // Prevent link navigation
                  setSelectedSize(size);

                  // Stronger rule: record only after user selects 2 distinct sizes (intentful comparison).
                  // Still only 1 event per card-view.
                  if (sizeSelectSentRef.current) return;
                  distinctSizesRef.current.add(size);
                  if (distinctSizesRef.current.size >= 2) {
                    sizeSelectSentRef.current = true;
                    trackProductEvent(product.product_id, 'size_select', { source, userId });
                  }
                }}
              >
                {size}
              </button>
            ))}
          </div>
        )}
      </div>

      
    </div>
  );
};