'use client';
import { useState, useEffect, useRef } from 'react';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';
import { 
  ProductDetails,
  ProductStock,
  ProductPricing,
  PackageOptions
} from './AddProduct';

export default function EditProduct({ productId }) {
  const { closeTab, activeTabId, getTabFormData, saveTabFormData } = useAdminTabs();
  const [currentSection, setCurrentSection] = useState('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get saved form data or use null
  const formData = activeTabId ? getTabFormData(activeTabId) : null;

  const [productData, setProductData] = useState(formData?.productData || null);
  const [originalData, setOriginalData] = useState(formData?.originalData || null);

  // Fetch product data and handle initial setup
  useEffect(() => {
    // Restore saved section if available
    if (formData?.currentSection) {
      setCurrentSection(formData.currentSection);
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/products/${productId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch product');
        }
        const { rows } = await response.json();
        if (!rows || rows.length === 0) {
          throw new Error('Product not found');
        }
        const data = rows[0];
        
        // Map API data to component structure
        const mappedData = {
          name: data.name,
          sku: data.sku,
          brand: data.brand,
          category_id: data.category_id,
          supplier_id: data.supplier_id,
          description: data.description || '',
          specifications: data.specifications || '',
          dimensions: data.dimensions || '',
          is_active: data.is_active,
          
          // Map stock data to nested structure
          stock: {
            quantity: data.stock?.quantity || 0,
            unit: data.stock?.unit,
            min_quantity: data.stock?.min_stock || 0,
            stock_status: data.stock?.stock_status || 'limited',
            arrival_type: data.stock?.arrival_type || 'unknown',
            arrival_interval: data.stock?.arrival_interval || null,
            arrival_day: data.stock?.arrival_day || null,
            arrival_date: data.stock?.arrival_date || null
          },
          
          // Map pricing data to nested structure
          pricing: {
            cost: data.pricing?.cost || 0,
            price: data.pricing?.price || 0,
            vat: data.pricing?.vat || 0,
            profit: data.pricing?.profit || 0,
            discount: data.pricing?.discount || 0,
            supplier_discount: data.pricing?.supplier_discount || 0,
            currency: data.pricing?.currency || 'USD'
          },
          
          package_options: data.package_options || []
        };

        console.log('Mapped data:', mappedData); // Debug log
        setProductData(mappedData);
        setOriginalData(mappedData);
      } catch (error) {
        console.error('Error fetching product:', error);
        alert('Failed to fetch product data');
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    // Fetch data if we don't have saved state or if it's a new product ID
    if (!productData || !originalData) {
      fetchData();
    } else {
      setLoading(false);
    }
    // Intentionally tied to productId only: avoids refetch loops from formData/productData edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  // Save form data whenever it changes
  useEffect(() => {
    if (activeTabId && !loading && productData) {
      saveTabFormData(activeTabId, {
        productData,
        originalData,
        currentSection
      });
    }
  }, [productData, originalData, currentSection, loading, activeTabId, saveTabFormData]);

  const sections = {
    details: {
      title: 'Product Details',
      component: <ProductDetails data={productData} onChange={setProductData} />
    },
    stock: {
      title: 'Stock Information',
      component: <ProductStock data={productData} onChange={setProductData} />
    },
    pricing: {
      title: 'Pricing',
      component: <ProductPricing data={productData} onChange={setProductData} />
    },
    packages: {
      title: 'Package Options',
      component: <PackageOptions data={productData} onChange={setProductData} />
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Validate required fields
      if (!productData.name || !productData.sku || !productData.brand || 
          !productData.category_id || !productData.supplier_id || !productData.stock?.unit) {
        alert('Please fill in all required fields');
        return;
      }

      // Format data for API - flatten the structure
      const apiData = {
        // Basic product info
        name: productData.name,
        sku: productData.sku,
        brand: productData.brand,
        category_id: productData.category_id,
        supplier_id: productData.supplier_id,
        description: productData.description || '',
        specifications: productData.specifications || '',
        dimensions: productData.dimensions || '',
        is_active: productData.is_active,
        
        // Stock details - flattened
        quantity: productData.stock?.quantity || 0,
        unit: productData.stock?.unit,
        min_stock: productData.stock?.min_quantity || null,
        stock_type: productData.stock?.stock_status || 'limited',
        arrival_type: productData.stock?.arrival_type || null,
        arrival_interval: productData.stock?.arrival_interval || null,
        arrival_day: productData.stock?.arrival_day || null,
        arrival_date: productData.stock?.arrival_date || null,
        package_quantity: 1,
        
        // Price details - will be handled by prices table
        cost: productData.pricing?.cost || 0,
        price: productData.pricing?.price || 0,
        vat: productData.pricing?.vat || 0,
        profit: productData.pricing?.profit || 0,
        discount: productData.pricing?.discount || 0,
        supplier_discount: productData.pricing?.supplier_discount || 0,
        currency: productData.pricing?.currency || 'USD',
        
        // Package options
        package_options: (productData.package_options || []).map(option => ({
          name: option.name || '',
          count: option.count || 1,
          discount: option.discount || 0,
          status: option.status || 'active',
          stock_status: option.stock_status || 'divide'
        }))
      };

      console.log('Submitting product data:', apiData); // Debug log

      const response = await fetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update product');
      }

      const updatedData = await response.json();
      setOriginalData(updatedData);
      alert('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const hasChanges = JSON.stringify(productData) !== JSON.stringify(originalData);
    if (!hasChanges || window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
      closeTab(`edit-product-${productId}`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <AddContentLayout
      title="Edit Product"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitButtonText="Save Changes"
    >
      <div className="form-navigation">
        {Object.entries(sections).map(([key, section]) => (
          <button
            key={key}
            className={`nav-button ${currentSection === key ? 'active' : ''}`}
            onClick={() => setCurrentSection(key)}
            type="button"
          >
            {section.title}
          </button>
        ))}
      </div>

      <div className="form-content">
        {sections[currentSection].component}
      </div>
    </AddContentLayout>
  );
} 