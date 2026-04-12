'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import '../styles/SearchBar.css'

export default function SearchBar() {
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const searchContainerRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowRecommendations(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length === 0) {
      setProducts([]);
      setCategories([]);
      return;
    }

    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        // Fetch product displays
        const displaysRes = await fetch(`/api/product-displays?search=${encodeURIComponent(query)}`);
        const displaysData = await displaysRes.json();
        setProducts(displaysData.slice(0, 5)); // Limit to 5 products

        // Fetch categories
        const categoriesRes = await fetch(`/api/web-categories?query=${encodeURIComponent(query)}`);
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData.slice(0, 3)); // Limit to 3 categories

      } catch (error) {
        console.error('Search error:', error);
        setProducts([]);
        setCategories([]);
      }
      setLoading(false);
    };

    const debounceTimer = setTimeout(() => {
      fetchRecommendations();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [query]);

  const handleProductClick = (productId) => {
    router.push(`/products/${productId}`);
    setShowRecommendations(false);
    setQuery('');
  };

  const handleCategoryClick = (categoryId) => {
    router.push(`/category/${categoryId}`);
    setShowRecommendations(false);
    setQuery('');
  };

  const handleSearch = () => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query)}`);
      setShowRecommendations(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div id='searchbar-container' ref={searchContainerRef}>
      <div className="search-input-wrapper">
        <input
          id='searchbar'
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowRecommendations(true);
          }}
          onKeyPress={handleKeyPress}
          onFocus={() => setShowRecommendations(true)}
          placeholder="Aradığınız ürünü giriniz"
        />
        <button id="search-button" onClick={handleSearch}>
          <Image src="/search.svg" alt="Search Button" width={22} height={22} />
        </button>
      </div>

      {showRecommendations && (query.length > 0) && (
        <div className="recommendations-dropdown">
          {loading ? (
            <div className="loading">Aranıyor...</div>
          ) : (
            <>
              {categories.length > 0 && (
                <div className="recommendation-section">
                  <h4>Kategoriler</h4>
                  {categories.map((category) => (
                    <div
                      key={category.id}
                      className="recommendation-item category-item"
                      onClick={() => handleCategoryClick(category.id)}
                    >
                      {category.name}
                    </div>
                  ))}
                </div>
              )}
              
              {products.length > 0 && (
                <div className="recommendation-section">
                  <h4>Ürünler</h4>
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className="recommendation-item product-item"
                      onClick={() => handleProductClick(product.id)}
                    >
                      <div className="product-info">
                        <span className="product-name">{product.name}</span>
                        {product.brand && (
                          <span className="product-brand">{product.brand}</span>
                        )}
                      </div>
                      {product.variants && product.variants[0] && product.variants[0].prices && (
                        <span className="product-price">
                          {product.variants[0].prices[0].price} {product.variants[0].prices[0].currency}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {categories.length === 0 && products.length === 0 && (
                <div className="no-results">Sonuç bulunamadı</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}



/*{loading ? (
  <div>Loading...</div>
) : (
  <ul>
    {products.length > 0 ? (
      products.map((product) => (
        <li
          key={product.id}
          onClick={() => handleProductClick(product.id)}
          style={{ cursor: 'pointer' }}
        >
          {product.name}
        </li>
      ))
    ) : (
      <li>No products found</li>
    )}
  </ul>
)}*/