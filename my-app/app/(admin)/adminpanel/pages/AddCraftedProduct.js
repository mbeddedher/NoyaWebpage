'use client';
import { useState, useEffect } from 'react';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';
import { ProductDetails, ProductStock, ProductPricing, PackageOptions } from './AddProduct';
import CraftedProductPricing from '../components/CraftedProductPricing';

// Component for managing crafted product components
export function ComponentsSection({ data, onChange }) {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currencyRates, setCurrencyRates] = useState({});
  const [selectedCurrencies, setSelectedCurrencies] = useState({});

  useEffect(() => {
    fetchProducts();
    fetchCurrencyRates();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      // The API returns { products: [...], total: number, page: number, limit: number }
      setProducts(data.products || []);
      console.log('Fetched products with prices:', data.products);
    } catch (error) {
      console.error('Error fetching products:', error);
      setProducts([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencyRates = async () => {
    try {
      const response = await fetch('/api/currency-rates');
      if (!response.ok) throw new Error('Failed to fetch currency rates');
      const data = await response.json();
      console.log('Fetched currency rates:', data);
      setCurrencyRates(data.rates || {});
    } catch (error) {
      console.error('Error fetching currency rates:', error);
    }
  };

  const convertCurrency = (amount, fromCurrency, toCurrency) => {
    if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return amount;
    
    const rateKey = `${fromCurrency}_${toCurrency}`;
    console.log('Looking for rate:', rateKey);
    console.log('Available rates:', currencyRates);
    
    // Try to get direct rate
    let rate = currencyRates[rateKey];
    
    if (!rate) {
      console.error(`No conversion rate found for ${rateKey}`);
      return amount;
    }
    
    const convertedAmount = amount * parseFloat(rate);
    console.log(`Converting ${amount} ${fromCurrency} to ${toCurrency}:`, convertedAmount);
    return convertedAmount;
  };

  const handleCurrencyChange = (index, newCurrency) => {
    const updatedComponents = [...(data.components || [])];
    const component = updatedComponents[index];
    const originalCurrency = component.converted_currency;

    if (!newCurrency) {
      newCurrency = component.currency;

    // Reset to original curren
    }
      

      // Convert cost and price to new currency
      const convertedCost = convertCurrency(component.cost, originalCurrency, newCurrency);
      const convertedPrice = convertCurrency(component.price, originalCurrency, newCurrency);

      updatedComponents[index] = {
        ...component,
        converted_currency: newCurrency,
        cost: parseFloat(convertedCost.toFixed(2)),
        price: parseFloat(convertedPrice.toFixed(2))
      };


    onChange({
      ...data,
      components: updatedComponents
    });
  };

  const addComponent = () => {
    if (!selectedProduct) return;
    
    const product = products.find(p => p.id === parseInt(selectedProduct));
    if (!product) return;

    const newComponent = {
      product_id: product.id,
      name: product.name,
      quantity: 1,
      unit: product.unit || 'piece',
      cost: parseFloat(product.cost) || 0,
      price: parseFloat(product.price) || 0,
      currency: product.currency || 'TRY',
      vat: parseFloat(product.vat) || 0,
      profit: parseFloat(product.profit) || 0,
      discount: parseFloat(product.discount) || 0,
      converted_currency: product.currency || 'TRY'
    };
    console.log('Adding new component:', newComponent);

    onChange({
      ...data,
      components: [...(data.components || []), newComponent]
    });
    setSelectedProduct('');
  };

  const updateComponent = (index, field, value) => {
    const updatedComponents = [...(data.components || [])];
    updatedComponents[index] = {
      ...updatedComponents[index],
      [field]: value
    };

    onChange({
      ...data,
      components: updatedComponents
    });
  };

  const removeComponent = (index) => {
    const updatedComponents = (data.components || []).filter((_, i) => i !== index);
    onChange({
      ...data,
      components: updatedComponents
    });
  };

  const formatNumber = (num) => {
    const value = parseFloat(num);
    return isNaN(value) ? '0.00' : value.toFixed(2);
  };

  // Add new function to get individual price
  const getIndividualPrice = (component) => {
    return parseFloat(component.price) || 0;
  };

  // Add new function to get total price
  const getTotalPrice = (component) => {
    const price = getIndividualPrice(component);
    const quantity = parseInt(component.quantity) || 1;
    return price * quantity;
  };

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <div className="form-section">
      <h4>Components</h4>
      <div className="add-component">
        <select
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
        >
          <option value="">Select Product</option>
          {products.map(product => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <button type="button" onClick={addComponent} disabled={!selectedProduct}>
          Add Component
        </button>
      </div>

      {(data.components || []).map((component, index) => (
        <div key={index} className="component-item">
          <div className="component-header">
            <h5>{component.name}</h5>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => removeComponent(index)}
            >
              Remove
            </button>
          </div>
          <div className="component-details">
            <div className="detail-row">
              <div className="detail-group">
                <div className="detail-header">Quantity:</div>
                <input
                  type="number"
                  min="1"
                  value={component.quantity}
                  onChange={(e) => updateComponent(index, 'quantity', parseInt(e.target.value))}
                />
              </div>
              <div className="detail-group">
                <div className="detail-header">Unit:</div>
                <div className="detail-value">{component.unit}</div>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-group">
                <div className="detail-header">Currency:</div>
                <div className="detail-value currency-value">{component.currency}</div>
                <div className="convert-to">
                  <label>Convert to:</label>
                  <select
                    value={component.converted_currency || ''}
                    onChange={(e) => handleCurrencyChange(index, e.target.value)}
                    className="currency-select"
                  >
                    <option value="">Original</option>
                    {['USD', 'EUR', 'TRY']
                      .filter(curr => curr !== component.currency)
                      .map(curr => {
                        const rateKey = `${component.currency}_${curr}`;
                        const rate = currencyRates[rateKey] || (currencyRates[`${curr}_${component.currency}`] ? 1 / parseFloat(currencyRates[`${curr}_${component.currency}`]) : null);
                        return (
                          <option key={curr} value={curr}>
                            {curr} {rate ? `(Rate: ${parseFloat(rate).toFixed(4)})` : ''}
                          </option>
                        );
                      })
                    }
                  </select>
                </div>
                {selectedCurrencies[index] && (
                  <div className="conversion-rate">
                    Rate: {(() => {
                      const rateKey = `${component.currency}_${selectedCurrencies[index]}`;
                      const rate = currencyRates[rateKey] || (currencyRates[`${selectedCurrencies[index]}_${component.currency}`] ? 1 / parseFloat(currencyRates[`${selectedCurrencies[index]}_${component.currency}`]) : 0);
                      return parseFloat(rate).toFixed(4);
                    })()}
                  </div>
                )}
              </div>
              <div className="detail-group">
                <div className="detail-header">Cost:</div>
                <div className="detail-value">{formatNumber(component.cost)}</div>
              </div>
            </div>
            <div className="detail-row">
              <div className="detail-group">
                <div className="detail-header">Price (per unit):</div>
                <div className="detail-value">{formatNumber(getIndividualPrice(component))}</div>
              </div>
              <div className="detail-group">
                <div className="detail-header">Total Price:</div>
                <div className="detail-value">{formatNumber(getTotalPrice(component))}</div>
              </div>
            </div>
          </div>
          <style jsx>{`
            .component-item {
              margin-bottom: 1rem;
              padding: 1rem;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: #f8f9fa;
            }
            .component-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 1rem;
              padding-bottom: 0.5rem;
              border-bottom: 1px solid #ddd;
            }
            .component-header h5 {
              margin: 0;
              font-size: 1.1rem;
              color: #2c3e50;
            }
            .component-details {
              display: flex;
              flex-direction: column;
              gap: 1rem;
            }
            .detail-row {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 1rem;
            }
            .detail-group {
              flex: 1;
              display: flex;
              align-items: center;
              gap: 0.5rem;
            }
            .detail-header {
              font-size: 0.875rem;
              color: #666;
              min-width: 70px;
              font-weight: bold;
            }
            .detail-value {
              font-size: 0.875rem;
              color: #495057;
              font-weight: 500;
              background: #fff;
              padding: 0.5rem;
              border-radius: 4px;
              border: 1px solid #ddd;
              min-width: 80px;
              display: inline-block;
            }
            .currency-value {
              text-transform: uppercase;
              font-weight: bold;
              color: #2c3e50;
              background: #e9ecef;
            }
            .detail-group input {
              width: 80px;
              padding: 0.5rem;
              border: 1px solid #ddd;
              border-radius: 4px;
            }
            .currency-select {
              padding: 0.5rem;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: #fff;
              min-width: 100px;
            }
            .conversion-rate {
              font-size: 0.8rem;
              color: #666;
              margin-top: 0.25rem;
            }
            .convert-to {
              display: flex;
              align-items: center;
              gap: 0.5rem;
              margin-left: 1rem;
            }
            .convert-to label {
              font-size: 0.8rem;
              color: #666;
            }
            .currency-select {
              padding: 0.25rem;
              border: 1px solid #ddd;
              border-radius: 4px;
              background: #fff;
              min-width: 80px;
              font-size: 0.875rem;
            }
            .conversion-rate {
              font-size: 0.8rem;
              color: #666;
              margin-left: 0.5rem;
            }
            .currency-value {
              text-transform: uppercase;
              font-weight: bold;
              background: #e9ecef;
            }
          `}</style>
        </div>
      ))}
    </div>
  );
}

export default function AddCraftedProduct() {
  const { closeTab, activeTabId, getTabFormData, saveTabFormData } = useAdminTabs();
  const [currentSection, setCurrentSection] = useState('details');
  const [loading, setLoading] = useState(false);
  const initialFormState = {
    name: '',
    sku: '',
    brand: '',
    category_id: '',
    supplier_id: '',
    description: '',
    dimensions: '',
    is_active: true,
    stock: {
      quantity: 0,
      min_quantity: 0,
      max_quantity: 0,
      unit: 'piece',
      stock_status: 'limited',
      arrival_type: 'unknown',
      arrival_date: null,
      arrival_interval: null,
      arrival_day: null

      
    },
    pricing: {
      cost: 0,
      price: 0,
      discount_price: 0,
      tax_rate: 0,
      currency: 'USD'
    },
    components: [],
    package_options: []
  };

  // Get saved form data or use initial state
  const formData = activeTabId ? getTabFormData(activeTabId) : {
    productData: initialFormState,
    currentSection: 'details'
  };

  const [productData, setProductData] = useState(formData.productData || initialFormState);
  
  // Restore saved section if available
  useEffect(() => {
    if (formData.currentSection) {
      setCurrentSection(formData.currentSection);
    }
  }, []);

  // Save form data whenever it changes
  useEffect(() => {
    if (activeTabId && !loading) {
      saveTabFormData(activeTabId, {
        productData,
        currentSection
      });
    }
  }, [productData, currentSection, activeTabId, loading]);

  const sections = {
    details: {
      title: 'Product Details',
      component: <ProductDetails data={productData} onChange={setProductData} />
    },
    components: {
      title: 'Components',
      component: <ComponentsSection data={productData} onChange={setProductData} />
    },
    stock: {
      title: 'Stock Information',
      component: <ProductStock data={productData} onChange={setProductData} />
    },
    pricing: {
      title: 'Pricing',
      component: <CraftedProductPricing data={productData} onChange={setProductData} />
    },
    packages: {
      title: 'Package Options',
      component: <PackageOptions data={productData} onChange={setProductData} />
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    try {
      setLoading(true);

      // Validate required fields
      if (!productData.name || !productData.sku || !productData.brand || 
          !productData.category_id || !productData.components?.length) {
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
        dimensions: productData.dimensions || '',
        is_active: productData.is_active,
        
        // Stock details
        quantity: productData.stock?.quantity || 0,
        unit: productData.stock?.unit,
        min_stock: productData.stock?.min_quantity || null,
        stock_type: productData.stock?.stock_status || 'limited',
        arrival_type: productData.stock?.arrival_type || null,
        arrival_interval: productData.stock?.arrival_interval || null,
        arrival_day: productData.stock?.arrival_day || null,
        arrival_date: productData.stock?.arrival_date || null,
        package_quantity: 1,
        
        // Price details
        pricing_mode: productData.pricing?.mode || 'manual',
        currency: productData.pricing?.currency || 'USD',
        cost: productData.pricing?.cost || 0,
        price: parseFloat(productData.pricing?.total_price || 0),
        tax_rate: productData.pricing?.tax_rate || 0,
        profit: productData.pricing?.profit || 0,
        vat: productData.pricing?.vat || 0,
        discount: productData.pricing?.discount || 0,
        has_difference: productData.pricing?.has_difference || false,
        difference_type: productData.pricing?.difference_type,
        difference_value: productData.pricing?.difference_value,
        is_multi_currency: productData.pricing?.is_multi || false,
        multi_currency_prices: productData.pricing?.multi_currency_prices || {},
        
        // Components
        components: productData.components.map(comp => ({
          product_id: comp.product_id,
          quantity: comp.quantity,
          converted_currency: comp.converted_currency
        })),
        
        // Package options
        package_options: (productData.package_options || []).map(option => ({
          name: option.name || '',
          count: option.count || 1,
          discount: option.discount || 0,
          status: option.status || 'active',
          stock_status: option.stock_status || 'divide'
        }))
      };

      const response = await fetch('/api/crafted-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create crafted product');
      }

      alert('Crafted product added successfully!');
      
      // Reset form to initial state
      setProductData(initialFormState);
      setCurrentSection('details');
      
      // Clear the saved form data for this tab
      if (activeTabId) {
        saveTabFormData(activeTabId, {
          productData: initialFormState,
          currentSection: 'details'
        });
      }

      // Don't close the tab, let user continue adding products if they want
    } catch (error) {
      console.error('Error adding crafted product:', error);
      alert('Failed to add crafted product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddContentLayout
      title="Create Crafted Product"
      onSubmit={handleSubmit}
      isLoading={loading}
      submitButtonText="Add Crafted Product"
      onCancel={() => closeTab('add-crafted-product')}
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