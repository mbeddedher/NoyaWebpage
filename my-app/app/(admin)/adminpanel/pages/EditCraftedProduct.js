'use client';
import { useState, useEffect } from 'react';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';
import { ProductDetails, ProductStock, ProductPricing, PackageOptions } from './AddProduct';
import CraftedProductPricing from '../components/CraftedProductPricing';
import { ComponentsSection } from './AddCraftedProduct';

export default function EditCraftedProduct({ productId }) {
  const { closeTab, activeTabId, getTabFormData, saveTabFormData } = useAdminTabs();
  const [currentSection, setCurrentSection] = useState('details');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get saved form data or use initial state
  const formData = activeTabId ? getTabFormData(activeTabId) : {
    productData: null,
    currentSection: 'details'
  };

  const [productData, setProductData] = useState(formData.productData);

  // Fetch product data when component mounts
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/crafted-products/${productId}`);
        if (!response.ok) throw new Error('Failed to fetch product');
        const data = await response.json();
        console.log("DATA:",data)
        // Format the data to match the expected structure
        const formattedData = {
          ...data,
          name: data.name || '',
          sku: data.sku || '',
          brand: data.brand || '',
          category_id: data.category_id || '',
          supplier_id: data.supplier_id || '',
          description: data.description || '',
          dimensions: data.dimensions || '',
          is_active: data.is_active ?? true,
          stock: {
            quantity: data.stock?.quantity || 0,
            min_quantity: data.stock?.min_quantity || 0,
            max_quantity: data.stock?.max_quantity || 0,
            location: data.stock?.location || '',
            unit: data.stock?.unit || 'piece',
            stock_status: data.stock?.stock_status || 'limited',
            arrival_type: data.stock?.arrival_type || 'unknown',
            arrival_interval: data.stock?.arrival_type === 'interval' || data.stock?.arrival_type === 'monthly' ? data.stock?.arrival_date : null,
            arrival_day: data.stock?.arrival_type === 'weekly' ? data.stock?.arrival_date : null,
            arrival_date: data.stock?.arrival_type === 'date' ? data.stock?.arrival_date : null
          },
          pricing: {
            mode: data.pricing?.mode || 'manual',
            currency: data.pricing?.currency || 'USD',
            cost: data.pricing?.cost || 0,
            total_price: data.pricing?.total_price || 0,
            tax_rate: data.pricing?.tax_rate || 0,
            profit: data.pricing?.profit || 0,
            vat: data.pricing?.vat || 0,
            discount: data.pricing?.discount || 0,
            has_difference: data.pricing?.has_difference || false,
            difference_type: data.pricing?.difference_type || '',
            difference_value: data.pricing?.difference_value || '',
            is_multi: data.pricing?.is_multi || false,
            multi_currency_prices: data.pricing?.multi_currency_prices || {}
          },
          components: data.components || [],
          package_options: data.package_options || []
        };
        console.log("Formatted Data:",formattedData.pricing)

        setProductData(formattedData);
        if (activeTabId) {
          saveTabFormData(activeTabId, {
            productData: formattedData,
            currentSection
          });
        }
      } catch (err) {
        console.error('Error fetching product:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (!formData.productData) {
      fetchProduct();
    } else {
      setLoading(false);
    }
  }, [productId, activeTabId]);

  // Save form data whenever it changes
  useEffect(() => {
    if (activeTabId && !loading && productData) {
      saveTabFormData(activeTabId, {
        productData,
        currentSection
      });
    }
  }, [productData, currentSection, activeTabId, loading]);

  const sections = {
    details: {
      title: 'Product Details',
      component: productData && <ProductDetails data={productData} onChange={setProductData} />
    },
    components: {
      title: 'Components',
      component: productData && <ComponentsSection data={productData} onChange={setProductData} />
    },
    stock: {
      title: 'Stock Information',
      component: productData && <ProductStock data={productData} onChange={setProductData} />
    },
    pricing: {
      title: 'Pricing',
      component: productData && <CraftedProductPricing data={productData} onChange={setProductData} />
    },
    packages: {
      title: 'Package Options',
      component: productData && <PackageOptions data={productData} onChange={setProductData} />
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    try {
      setLoading(true);

      // Validate required fields
      if (!productData.name || !productData.sku || !productData.category_id || !productData.components?.length) {
        alert('Please fill in all required fields and add at least one component');
        return;
      }

      // Format data for API
      const apiData = {
        name: productData.name,
        sku: productData.sku,
        brand: productData.brand,
        category_id: productData.category_id,
        supplier_id: productData.supplier_id,
        description: productData.description || '',
        specifications: productData.specifications || '',
        is_active: productData.is_active,
        
        // Stock details
        quantity: productData.stock?.quantity || 0,
        unit: productData.stock?.unit || 'piece',
        min_stock: productData.stock?.min_quantity || 0,
        stock_status: productData.stock?.stock_status || 'limited',
        arrival_type: productData.stock?.arrival_type || null,
        arrival_interval: productData.stock?.arrival_interval || null,
        arrival_day: productData.stock?.arrival_day || null,
        arrival_date: productData.stock?.arrival_date || null,
        
        // Price details  
        pricing_mode: productData.pricing?.mode || 'manual',
        currency: productData.pricing?.currency || 'USD',
        cost: parseFloat(productData.pricing?.cost || 0),
        price: parseFloat(productData.pricing?.total_price || 0),
        tax_rate: parseFloat(productData.pricing?.tax_rate || 0),
        profit: parseFloat(productData.pricing?.profit || 0),
        vat: parseFloat(productData.pricing?.vat || 0),
        discount: parseFloat(productData.pricing?.discount || 0),
        has_difference: productData.pricing?.has_difference || false,
        difference_type: productData.pricing?.has_difference ? (productData.pricing?.difference_type || 'discount') : null,
        difference_value: productData.pricing?.has_difference ? parseFloat(productData.pricing?.difference_value || 0) : null,
        is_multi_currency: productData.pricing?.is_multi || false,
        multi_currency_prices: productData.pricing?.multi_currency_prices || {},
        
        // Components
        components: productData.components.map(comp => ({
          product_id: comp.product_id,
          quantity: parseInt(comp.quantity) || 1,
          converted_currency: comp.converted_currency
        })),
        
        // Package options
        package_options: (productData.package_options || []).map(option => ({
          name: option.name || '',
          count: parseInt(option.count) || 1,
          discount: parseFloat(option.discount || 0),
          status: option.status || 'active',
          stock_status: option.stock_status || 'divide'
        }))
      };

      const response = await fetch(`/api/crafted-products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update crafted product');
      }

      alert('Crafted product updated successfully!');
      closeTab(`edit-crafted-product-${productId}`);
    } catch (error) {
      console.error('Error updating crafted product:', error);
      alert('Failed to update crafted product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (!productData) {
    return <div>No product data found</div>;
  }

  return (
    <AddContentLayout
      title={`Edit Crafted Product: ${productData.name}`}
      onSubmit={handleSubmit}
      isLoading={loading}
      submitButtonText="Update Crafted Product"
      onCancel={() => closeTab(`edit-crafted-product-${productId}`)}
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