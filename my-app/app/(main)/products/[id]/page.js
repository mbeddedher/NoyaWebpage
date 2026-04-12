'use client';

import React from "react";
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useCart } from '../../../context/CartContext';
import { useUser } from '../../../context/UserContext';
import { trackProductEvent } from '../../../lib/productEvents';

import '../../../styles/product.css'
import Link from 'next/link';
import { useStyleRegistry } from "styled-jsx";

// Move ImageNavigator outside of ProductPage
const ImageNavigator = React.memo(({ images }) => {
  const [selectedImage, setSelectedImage] = useState(0);

  // Find the primary image index
  useEffect(() => {
    const primaryIndex = images.findIndex(img => img.is_primary);
    if (primaryIndex !== -1) {
      setSelectedImage(primaryIndex);
    }
  }, [images]);

  if (!images || images.length === 0) {
    return (
      <div className="image-navigator">
        <div className="main-image">
          <img src="/no-image.svg" alt="No image available" />
        </div>
      </div>
    );
  }

  return (
    <div className="image-navigator">
      <div className="main-image">
        <img
          src={images[selectedImage]?.url || '/no-image.svg'}
          alt={images[selectedImage]?.alt_text || 'Product image'}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = '/no-image.svg';
          }}
        />
      </div>
      <div className="thumbnail-strip">
        {images.map((image, index) => (
          <div
            key={`${image.id}-${index}`}
            className={`thumbnail ${selectedImage === index ? 'selected' : ''}`}
            onClick={() => setSelectedImage(index)}
          >
            <img
              src={image.url || '/no-image.svg'}
              alt={image.alt_text || `Product thumbnail ${index + 1}`}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/no-image.svg';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
});

const ProductPage = () => {
  const [activeTab, setActiveTab] = useState("details");
  const packetSizes = ["packet (50 adet)","box (500 adet)"]
  const { id } = useParams();  // Unwrap `params` using `useParams()`
  const [product, setProduct] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const { refreshCartCount } = useCart();
  const { userId } = useUser();
  const [category,setCategory] = useState(["Manşon","PPRC","TESİSAT"])
  const [stars,setStars] = useState(4)
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const renderContent = () => {
    switch (activeTab) {
      case "details":
        return (
          <div className="product-details">
            {product?.description && (
              <div className="product-description">
                <div className="description-content">
                  <h3>Ürün Açıklaması</h3>
                  <div className="description-text">
                    {product.description.description || ''}
                  </div>
                  {product.description.summary && (
                    <ul className="summary-points">
                      {product.description.summary.map((point, index) => (
                        <li key={`summary-${index}`}>{point}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      case "comments":
        return <p>Here are the customer comments...</p>;
      case "returns":
        return <p>Here is the payment and return policy...</p>;
      default:
        return null;
    }
  };


  const CategoryNavigation = ({ categories, categoryIds }) => {
    if (!categories || !categoryIds || categories.length === 0 || categoryIds.length === 0) {
      return null;
    }

    return (
      <div className="category-navigation">
        {categories.map((category, index) => (
          <React.Fragment key={categoryIds[index]}>
            {/* Category Link */}
            <Link 
              href={`/products?categories=${categoryIds[index]}`} 
              className="category-button"
            >
              {category}
            </Link>
            
            {/* Display an arrow if it's not the last item */}
            {index < categories.length - 1 && <img className="arrow-icon" src="/category_arrow.svg" alt=">" />}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const PipeSizeSelector = ({ onSelect }) => {
    const [selectedSize, setSelectedSize] = useState('');
  
    const pipeSizes = ['1/2', '3/4', '1', '1.5', '2'];
  
    const handleChange = (event) => {
      const size = event.target.value;
      setSelectedSize(size);
      onSelect(size); // Pass the selected size to the parent if needed
    };
  
    return (
      <div>
        <h3>Ölçü Seç</h3>
        {/* Dropdown Selector */}
        <select className="size-selection" value={selectedSize} onChange={handleChange}>
          <option value="" disabled>
            Choose size
          </option>
          {pipeSizes.map((size) => (
            <option key={size} value={size}>  
              {size} inch
            </option>
          ))}
        </select>
      </div>
    );
  }

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/landing-page/${id}`);
        if (!res.ok) {
          throw new Error(`Error fetching product: ${res.status}`);
        }
        const data = await res.json();
        
        console.log('Raw API response:', data);
        console.log('Product images:', data.images);
        
        // Parse description if it's a JSON string
        if (data.description) {
          if (typeof data.description === 'string') {
            try {
              data.description = JSON.parse(data.description);
            } catch (e) {
              // If parsing fails, treat it as a simple string description
              data.description = { description: data.description };
            }
          }
        }
        
        setProduct(data);

        if (data.id) {
          trackProductEvent(data.id, 'view', { userId });
        }

        if (data.variants && data.variants.length > 0) {
          const defaultVariant = data.variants.find(v => v.size === data.default_size) || data.variants[0];
          setSelectedVariant(defaultVariant);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to fetch product details');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProduct();
    }
  }, [id]);

  const handleQuantityChange = (increment) => {
    setQuantity(prev => Math.max(1, prev + increment));
  };

  const handleVariantChange = (variant) => {
    setSelectedVariant(variant);
  };

  const addToCart = async () => {
    if (!selectedVariant) {
      alert('Please select a product option');
      return;
    }

    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          variantId: selectedVariant.id,
          quantity: quantity,
        }),
        credentials: 'include',
      });
      
      if (response.ok) {
        if (product.id) trackProductEvent(product.id, 'add_to_cart', { userId });
        refreshCartCount();
        alert('Product added to cart successfully!');
      } else {
        throw new Error('Failed to add to cart');
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      alert('Failed to add product to cart');
    }
  };

  if (loading) {
    return <div className="loading">Loading product details...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!product) {
    return <div className="error">Product not found</div>;
  }

  return (
    <div className="product-page">
      <CategoryNavigation 
        categories={product.category_path} 
        categoryIds={product.category_path_ids} 
      />
      <div className="product-main">
        <div className="header-container">
          <h1 className="product-header">{product.name}</h1>
          {product.brand && <h2 className="brand">{product.brand}</h2>}
          <div className="product-rating">
            <div className="stars">
              {[...Array(5)].map((_, index) => (
                <img
                  key={`star-${index}`}
                  className="star"
                  src={index < (product.rating || 0) ? "/star-filled.svg" : "/star.svg"}
                  alt={`Star ${index + 1}`}
                />
              ))}
            </div>
            {product.review_count > 0 && (
              <span className="comment-count">{product.review_count} Değerlendirme</span>
            )}
          </div>
        </div>

        <ImageNavigator images={product.images || []} />
        
        <div className="product-overview">
          {selectedVariant?.price && (
            <div className="price-wrapper">
              <div className="price-text">
                <p className="price">
                  {selectedVariant.price.amount}
                </p>
                <img className="tl" src="/tl.svg" alt="TL" />
              </div>
              <span className="kdv">KDV Dahil</span>
            </div>
          )}

          {product?.description?.summary && (
            <div className="product-summary">
              <ul className="summary-points">
                {product.description.summary.map((point, index) => (
                  <li key={`overview-${index}`}>{point}</li>
                ))}
              </ul>
            </div>
          )}

          {product.variants && product.variants.length > 0 && (
            <div className="variant-selector">
              <h3>Ürün Seçenekleri</h3>
              <select
                value={selectedVariant?.id || ''}
                onChange={(e) => {
                  const variant = product.variants.find(v => v.id === parseInt(e.target.value));
                  handleVariantChange(variant);
                }}
              >
                {product.variants.map((variant, index) => (
                  <option key={variant.id || `variant-${index}`} value={variant.id || ''}>
                    {variant.size || variant.name || 'Seçenek ' + (index + 1)}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="quantity-div">
            <button className="minus" onClick={() => handleQuantityChange(-1)}>-</button>
            <div className="quantity-wrapper">
              <span className="quantity">{quantity}</span>
            </div>
            <button className="plus" onClick={() => handleQuantityChange(1)}>+</button>
          </div>

          <div className="buttons">
            <button className="buy-now" onClick={addToCart}>Hemen Al</button>
            <button className="add-to-cart" onClick={addToCart}>Sepete Ekle</button>
          </div>
        </div>
      </div>

      <div className="tabs-wrapper">
        <div className="tabs-navigation">
          <button
            className={activeTab === "details" ? "active" : ""}
            onClick={() => setActiveTab("details")}
          >
            Ürün Detayları
          </button>
          <button
            className={activeTab === "comments" ? "active" : ""}
            onClick={() => setActiveTab("comments")}
          >
            Yorumlar
          </button>
          <button
            className={activeTab === "returns" ? "active" : ""}
            onClick={() => setActiveTab("returns")}
          >
            Ödeme ve İade
          </button>
        </div>

        <div className="tab-content">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default ProductPage;
