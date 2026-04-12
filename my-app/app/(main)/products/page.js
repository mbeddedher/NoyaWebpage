'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import '../../styles/products.css';

// Helper function to build category tree
const buildCategoryTree = (categories) => {
  if (!Array.isArray(categories) || categories.length === 0) return [];
  const categoryMap = {};
  const rootCategories = [];

  // First, create a map of all categories
  categories.forEach(category => {
    categoryMap[category.id] = {
      ...category,
      children: []
    };
  });

  // Then, build the tree structure
  categories.forEach(category => {
    if (category.parent_id) {
      const parent = categoryMap[category.parent_id];
      if (parent) {
        parent.children.push(categoryMap[category.id]);
      }
    } else {
      rootCategories.push(categoryMap[category.id]);
    }
  });

  return rootCategories;
};

// Helper function to get all subcategory IDs
const getAllSubcategoryIds = (category) => {
  let ids = [category.id];
  if (category.children) {
    category.children.forEach(child => {
      ids = [...ids, ...getAllSubcategoryIds(child)];
    });
  }
  return ids;
};

// Recursive category component
const CategoryItem = ({ category, selectedCategories, onCategoryChange, level = 0 }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = category.children && category.children.length > 0;

  return (
    <div className="category-item" style={{ marginLeft: `${level * 16}px` }}>
      <div className="category-header">
        {hasChildren && (
          <button 
            className={`expand-button ${isExpanded ? 'expanded' : ''}`}
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? '−' : '+'}
          </button>
        )}
        <label className="filter-option">
          <input
            type="checkbox"
            checked={selectedCategories.includes(category.id)}
            onChange={() => onCategoryChange(category)}
          />
          {category.name}
        </label>
      </div>
      
      {hasChildren && isExpanded && (
        <div className="subcategories">
          {category.children.map(child => (
            <CategoryItem
              key={child.id}
              category={child}
              selectedCategories={selectedCategories}
              onCategoryChange={onCategoryChange}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>  
  );
};

// ProductCard Component
import { ProductCard } from '../../components/ProductCard';

const ProductsPageContent = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    category: [],
    priceRange: { min: '', max: '' },
    sizes: [],
    brands: []
  });
  const [categories, setCategories] = useState([]);
  const [categoryTree, setCategoryTree] = useState([]);
  const [brands, setBrands] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const debounceRef = useRef(null);
  const searchParams = useSearchParams();

  // Function to fetch products with filters
  const fetchProducts = async (currentFilters) => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      
      if (currentFilters.category.length > 0) {
        params.set('categories', currentFilters.category.join(','));
      }
      
      if (currentFilters.priceRange.min) {
        params.set('minPrice', currentFilters.priceRange.min);
      }
      
      if (currentFilters.priceRange.max) {
        params.set('maxPrice', currentFilters.priceRange.max);
      }
      
      if (currentFilters.brands.length > 0) {
        params.set('brands', currentFilters.brands.join(','));
      }
      
      if (currentFilters.sizes.length > 0) {
        params.set('sizes', currentFilters.sizes.join(','));
      }

      // Fetch products with filters
      const productsRes = await fetch(`/api/product-cards?${params.toString()}`);
      if (!productsRes.ok) throw new Error('Failed to fetch products');
      const productsData = await productsRes.json();
      console.log('Products data:', productsData);
      setProducts(Array.isArray(productsData) ? productsData : []);
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        // Parse category IDs from URL (e.g. ?categories=1,2,3)
        const categoriesParam = searchParams.get('categories');
        const initialCategoryIds = categoriesParam
          ? categoriesParam.split(',').map(id => parseInt(id, 10)).filter(n => !isNaN(n))
          : [];

        if (initialCategoryIds.length > 0) {
          setFilters(prev => ({
            ...prev,
            category: initialCategoryIds
          }));
        }

        // Fetch categories
        const categoriesRes = await fetch('/api/web-categories');
        if (!categoriesRes.ok) throw new Error('Failed to fetch categories');
        const categoriesData = await categoriesRes.json();
        setCategories(categoriesData);
        setCategoryTree(buildCategoryTree(categoriesData));

        // Initial products fetch (with URL-based categories if any)
        const initialFilters = initialCategoryIds.length > 0
          ? { category: initialCategoryIds, priceRange: { min: '', max: '' }, brands: [], sizes: [] }
          : { category: [], priceRange: { min: '', max: '' }, brands: [], sizes: [] };
        await fetchProducts(initialFilters);
      } catch (err) {
        console.error('Error fetching initial data:', err);
        setError('Failed to load initial data');
      }
    };

    fetchInitialData();
  }, []);

  // Debounced filter effect
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      fetchProducts(filters);
    }, 500);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [filters]);

  // Extract unique brands and sizes after products update
  useEffect(() => {
    const uniqueBrands = [...new Set(products.map(p => p.brand).filter(Boolean))];
    setBrands(uniqueBrands);

    const uniqueSizes = [...new Set(products.flatMap(p => 
      p.size_array || []
    ).filter(Boolean))];
    setAvailableSizes(uniqueSizes);
  }, [products]);

  // Filter handlers
  const handleCategoryChange = (category) => {
    setFilters(prev => {
      const isSelected = prev.category.includes(category.id);
      let newCategories;
      
      if (isSelected) {
        // Remove the category and all its subcategories
        const allSubIds = getAllSubcategoryIds(category);
        newCategories = prev.category.filter(id => !allSubIds.includes(id));
      } else {
        // Add the category and all its subcategories
        const allSubIds = getAllSubcategoryIds(category);
        newCategories = [...new Set([...prev.category, ...allSubIds])];
      }
      
      return {
        ...prev,
        category: newCategories
      };
    });
  };

  const handlePriceChange = (type, value) => {
    setFilters(prev => ({
      ...prev,
      priceRange: { ...prev.priceRange, [type]: value }
    }));
  };

  const handleBrandChange = (brand) => {
    setFilters(prev => ({
      ...prev,
      brands: prev.brands.includes(brand)
        ? prev.brands.filter(b => b !== brand)
        : [...prev.brands, brand]
    }));
  };

  const handleSizeChange = (size) => {
    setFilters(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }));
  };

  if (loading && products.length === 0) {
    return <div className="loading">Loading products...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div className="products-page">
      {/* Filters Sidebar */}
      <aside className="filters-sidebar">
        <h2>Filters</h2>
        
        {/* Category Filter */}
        <div className="filter-section">
          <h3>Categories</h3>
          <div className="filter-options hierarchical">
            {categoryTree.map(category => (
              <CategoryItem
                key={category.id}
                category={category}
                selectedCategories={filters.category}
                onCategoryChange={handleCategoryChange}
              />
            ))}
          </div>
        </div>

        {/* Price Range Filter */}
        <div className="filter-section">
          <h3>Price Range</h3>
          <div className="price-range">
            <input
              type="number"
              placeholder="Min"
              value={filters.priceRange.min}
              onChange={(e) => handlePriceChange('min', e.target.value)}
            />
            <span>-</span>
            <input
              type="number"
              placeholder="Max"
              value={filters.priceRange.max}
              onChange={(e) => handlePriceChange('max', e.target.value)}
            />
          </div>
        </div>

        {/* Brand Filter */}
        <div className="filter-section">
          <h3>Brands</h3>
          <div className="filter-options">
            {brands.map(brand => (
              <label key={brand} className="filter-option">
                <input
                  type="checkbox"
                  checked={filters.brands.includes(brand)}
                  onChange={() => handleBrandChange(brand)}
                />
                {brand}
              </label>
            ))}
          </div>
        </div>

        {/* Size Filter */}
        <div className="filter-section">
          <h3>Sizes</h3>
          <div className="filter-options">
            {availableSizes.map(size => (
              <label key={size} className="filter-option">
                <input
                  type="checkbox"
                  checked={filters.sizes.includes(size)}
                  onChange={() => handleSizeChange(size)}
                />
                {size}
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* Products Grid */}
      <main className="products-grid">
        {loading && <div className="loading-overlay">Updating products...</div>}
        {products.length === 0 ? (
          <div className="no-products">No products found matching your criteria</div>
        ) : (
          products.map(product => (
            <ProductCard key={product.product_id} product={product} source="category" />
          ))
        )}
      </main>
    </div>
  );
};

const ProductsPage = () => (
  <Suspense fallback={<div className="loading">Loading products...</div>}>
    <ProductsPageContent />
  </Suspense>
);

export default ProductsPage;