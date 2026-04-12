'use client';
import { useState, useEffect } from 'react';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';

// Recursive function to build category options with proper indentation
function buildCategoryOptions(categories, parentId = null, level = 0) {
  const indent = '\u00A0'.repeat(level * 4); // Non-breaking spaces for indentation
  const options = [];

  // Get categories at current level
  const levelCategories = categories.filter(c => c.parent_id === parentId);

  // Add each category and its children recursively
  levelCategories.forEach(category => {
    // Check if category has subcategories
    const hasSubcategories = categories.some(c => c.parent_id === category.id);

    options.push({
      id: category.id,
      name: `${indent}${category.name}`,
      disabled: hasSubcategories // Disable if has subcategories
    });

    // Add children recursively
    const childOptions = buildCategoryOptions(categories, category.id, level + 1);
    options.push(...childOptions);
  });

  return options;
}

// Product Details Page Component
export function ProductDetails({ data, onChange }) {
  const [categories, setCategories] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  useEffect(() => {
    // Fetch categories and suppliers
    const fetchData = async () => {
      try {
        const [categoriesRes, suppliersRes] = await Promise.all([
          fetch('/api/categories'),
          fetch('/api/suppliers')
        ]);
        const [categoriesData, suppliersData] = await Promise.all([
          categoriesRes.json(),
          suppliersRes.json()
        ]);
        setCategories(categoriesData);
        setSuppliers(suppliersData);

        // Build hierarchical options for categories
        const options = buildCategoryOptions(categoriesData);
        setCategoryOptions(options);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <>
      {/* Basic Info Section */}
      <div className="form-section">
        <h4>Basic Information</h4>
        <div className="form-group">
          <label htmlFor="name">Product Name*</label>
          <input
            id="name"
            type="text"
            value={data.name || ''}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="sku">SKU*</label>
          <input
            id="sku"
            type="text"
            value={data.sku || ''}
            onChange={(e) => onChange({ ...data, sku: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="brand">Brand*</label>
          <input
            id="brand"
            type="text"
            value={data.brand || ''}
            onChange={(e) => onChange({ ...data, brand: e.target.value })}
            required
          />
        </div>
      </div>

      {/* Categories and Suppliers Section */}
      <div className="form-section">
        <h4>Categories & Suppliers</h4>
        <div className="form-group">
          <label htmlFor="category_id">Category*</label>
          <select
            id="category_id"
            value={data.category_id || ''}
            onChange={(e) => onChange({ ...data, category_id: Number(e.target.value) })}
            required
            className="hierarchical-select"
          >
            <option value="">Select Category</option>
            {categoryOptions.map(option => (
              <option 
                key={option.id} 
                value={option.id}
                disabled={option.disabled}
              >
                {option.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="supplier_id">Supplier*</label>
          <select
            id="supplier_id"
            value={data.supplier_id || ''}
            onChange={(e) => onChange({ ...data, supplier_id: Number(e.target.value) })}
            required
          >
            <option value="">Select Supplier</option>
            {suppliers.map(supplier => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Additional Details Section */}
      <div className="form-section">
        <h4>Additional Details</h4>
        <div className="form-group">
          <label htmlFor="dimensions">Dimensions</label>
          <input
            id="dimensions"
            type="text"
            value={data.dimensions || ''}
            onChange={(e) => onChange({ ...data, dimensions: e.target.value })}
            placeholder="e.g., 10x20x30 cm"
          />
        </div>
      </div>

      {/* Status Section */}
      <div className="form-section">
        <h4>Status Settings</h4>
        <div className="form-row">
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={data.is_active}
                onChange={(e) => onChange({ ...data, is_active: e.target.checked })}
              />
              Active
            </label>
          </div>
        </div>
      </div>
    </>
  );
}

// Product Stock Page Component
export function ProductStock({ data, onChange }) {
  const unitOptions = ['m', 'cm', 'mm', 'inch', 'm2', 'kg', 'g', 'piece', 'pack'];
  const stockStatusOptions = ['limited', 'unlimited', 'locked', 'infinite'];
  const arrivalTypeOptions = ['unknown', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

  const handleStockChange = (field, value) => {
    onChange({
      ...data,
      stock: {
        ...data.stock,
        [field]: value
      }
    });
  };

  return (
    <div className="form-section">
      <h4>Stock Information</h4>
      
      <div className="form-group">
        <label htmlFor="unit">Unit*</label>
        <select
          id="unit"
          value={data.stock?.unit || 'piece'}
          onChange={(e) => handleStockChange('unit', e.target.value)}
          required
        >
          {unitOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="stock_status">Stock Status*</label>
        <select
          id="stock_status"
          value={data.stock?.stock_status || 'limited'}
          onChange={(e) => handleStockChange('stock_status', e.target.value)}
          required
        >
          {stockStatusOptions.map(option => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="quantity">Quantity*</label>
        <input
          id="quantity"
          type="number"
          min="0"
          value={data.stock?.quantity || 0}
          onChange={(e) => handleStockChange('quantity', parseInt(e.target.value) || 0)}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="min_quantity">Minimum Stock Level</label>
        <input
          id="min_quantity"
          type="number"
          min="0"
          value={data.stock?.min_quantity === 0 ? '' : data.stock?.min_quantity}
          onChange={(e) => handleStockChange('min_quantity', e.target.value === '' ? 0 : parseInt(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="arrival_type">Arrival Type*</label>
        <select
          id="arrival_type"
          value={data.stock?.arrival_type || 'unknown'}
          onChange={(e) => handleStockChange('arrival_type', e.target.value)}
          required
        >
          <option value="interval">Interval</option>
          <option value="weeky">Weekly</option>
          <option value="monthly">Monthly</option>
          <option value="date">Specific Date</option>
          <option value="inhereted">Inherited</option>
          <option value="unknown">Unknown</option>
        </select>
      </div>

      {data.stock?.arrival_type === 'interval' && (
        <div className="form-group">
          <label htmlFor="arrival_interval">Interval (days)</label>
          <input
            id="arrival_interval"
            type="number"
            min="1"
            value={data.stock?.arrival_interval || ''}
            onChange={(e) => handleStockChange('arrival_interval', e.target.value)}
          />
        </div>
      )}

      {data.stock?.arrival_type === 'weeky' && (
        <div className="form-group">
          <label htmlFor="arrival_day">Arrival Day</label>
          <select
            id="arrival_day"
            value={data.stock?.arrival_day || 'monday'}
            onChange={(e) => handleStockChange('arrival_day', e.target.value)}
          >
            <option value="monday">Monday</option>
            <option value="tuesday">Tuesday</option>
            <option value="wednesday">Wednesday</option>
            <option value="thursday">Thursday</option>
            <option value="friday">Friday</option>
            <option value="saturday">Saturday</option>
            <option value="sunday">Sunday</option>
          </select>
        </div>
      )}

      {data.stock?.arrival_type === 'monthly' && (
        <div className="form-group">
          <label htmlFor="arrival_day">Day of Month</label>
          <input
            id="arrival_day"
            type="number"
            min="1"
            max="31"
            value={data.stock?.arrival_interval || ''}
            onChange={(e) => handleStockChange('arrival_interval', e.target.value)}
          />
        </div>
      )}

      {data.stock?.arrival_type === 'date' && (
        <div className="form-group">
          <label htmlFor="arrival_date">Arrival Date</label>
          <input
            id="arrival_date"
            type="date"
            value={data.stock?.arrival_date || ''}
            onChange={(e) => handleStockChange('arrival_date', e.target.value)}
          />
        </div>
      )}
    </div>
  );
}

// Product Pricing Component
export function ProductPricing({ data, onChange }) {
  const handlePricingChange = (field, value) => {
    const updatedPricing = {
      ...data.pricing || {},
      [field]: value
    };

    // Calculate price based on cost, profit margin, VAT, supplier discount, and discount
    if (field === 'cost' || field === 'profit' || field === 'vat' || field === 'supplier_discount' || field === 'discount') {
      const cost = field === 'cost' ? value : (data.pricing?.cost || 0);
      const profit = field === 'profit' ? value : (data.pricing?.profit || 0);
      const vatRate = field === 'vat' ? value : (data.pricing?.vat || 0);
      const supplierDiscount = field === 'supplier_discount' ? value : (data.pricing?.supplier_discount || 0);
      const discount = field === 'discount' ? value : (data.pricing?.discount || 0);

      // Calculate actual cost after supplier discount
      const actualCost = cost * (1 - (supplierDiscount / 100));
      
      // Calculate price before VAT using profit margin
      const priceBeforeVat = actualCost * (1 + (profit / 100));
      
      // Add VAT to get final price
      const priceWithVat = priceBeforeVat * (1 + (vatRate / 100));
      
      // Apply discount to get final price
      const finalPrice = priceWithVat * (1 - (discount / 100));
      
      // Round to 2 decimal places
      updatedPricing.price = Math.round(finalPrice * 100) / 100;
    }

    console.log('Updated pricing:', updatedPricing); // Debug log

    onChange({
      ...data,
      pricing: updatedPricing
    });
  };

  return (
    <div className="form-section">
      <h4>Pricing Information</h4>
      <div className="form-group">
        <label htmlFor="cost">Cost*</label>
        <input
          id="cost"
          type="number"
          step="0.01"
          min="0"
          value={data.pricing?.cost === 0 ? '' : data.pricing?.cost}
          onChange={(e) => handlePricingChange('cost', e.target.value === '' ? 0 : parseFloat(e.target.value))}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="supplier_discount">Supplier Discount (%)</label>
        <input
          id="supplier_discount"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={data.pricing?.supplier_discount === 0 ? '' : data.pricing?.supplier_discount}
          onChange={(e) => handlePricingChange('supplier_discount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="profit">Profit Margin (%)*</label>
        <input
          id="profit"
          type="number"
          step="0.01"
          min="0"
          value={data.pricing?.profit === 0 ? '' : data.pricing?.profit}
          onChange={(e) => handlePricingChange('profit', e.target.value === '' ? 0 : parseFloat(e.target.value))}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="vat">VAT Rate (%)</label>
        <input
          id="vat"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={data.pricing?.vat === 0 ? '' : data.pricing?.vat}
          onChange={(e) => handlePricingChange('vat', e.target.value === '' ? 0 : parseFloat(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="discount">Discount (%)</label>
        <input
          id="discount"
          type="number"
          step="0.01"
          min="0"
          max="100"
          value={data.pricing?.discount === 0 ? '' : data.pricing?.discount}
          onChange={(e) => handlePricingChange('discount', e.target.value === '' ? 0 : parseFloat(e.target.value))}
        />
      </div>

      <div className="form-group">
        <label htmlFor="price">Calculated Price</label>
        <input
          id="price"
          type="number"
          step="0.01"
          value={data.pricing?.price === 0 ? '' : data.pricing?.price}
          readOnly
          disabled
        />
      </div>

      <div className="form-group">
        <label htmlFor="currency">Currency*</label>
        <select
          id="currency"
          value={data.pricing?.currency || 'USD'}
          onChange={(e) => handlePricingChange('currency', e.target.value)}
          required
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="TRY">TRY</option>
        </select>
      </div>
    </div>
  );
}

// Package Options Component
export function PackageOptions({ data, onChange }) {
  const [packageOptions, setPackageOptions] = useState(data.package_options || []);

  const addPackageOption = () => {
    const newOption = {
      name: '',
      count: 1,
      discount: 0,
      status: 'active',
      stock_status: 'divide'
    };
    setPackageOptions([...packageOptions, newOption]);
    onChange({ ...data, package_options: [...packageOptions, newOption] });
  };

  const updatePackageOption = (index, field, value) => {
    const updatedOptions = [...packageOptions];
    updatedOptions[index] = { ...updatedOptions[index], [field]: value };
    setPackageOptions(updatedOptions);
    onChange({ ...data, package_options: updatedOptions });
  };

  const removePackageOption = (index) => {
    const updatedOptions = packageOptions.filter((_, i) => i !== index);
    setPackageOptions(updatedOptions);
    onChange({ ...data, package_options: updatedOptions });
  };

  return (
    <div className="form-section full-width">
      <h4>Package Options</h4>
      <button type="button" className="button button-secondary" onClick={addPackageOption}>
        Add Package Option
      </button>
      {packageOptions.map((option, index) => (
        <div key={index} className="package-option">
          <div className="form-row">
            <div className="form-group">
              <label htmlFor={`name-${index}`}>Name*</label>
              <input
                id={`name-${index}`}
                type="text"
                value={option.name}
                onChange={(e) => updatePackageOption(index, 'name', e.target.value)}
                required
                placeholder="e.g., Small Pack, Large Box"
              />
            </div>
            <div className="form-group">
              <label htmlFor={`count-${index}`}>Count*</label>
              <input
                id={`count-${index}`}
                type="number"
                min="1"
                value={option.count}
                onChange={(e) => updatePackageOption(index, 'count', e.target.value === '' ? '' : parseInt(e.target.value))}
                onBlur={(e) => { if (e.target.value === '' || isNaN(option.count)) updatePackageOption(index, 'count', 0); }}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor={`discount-${index}`}>Discount (%)</label>
              <input
                id={`discount-${index}`}
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={option.discount}
                onChange={(e) => updatePackageOption(index, 'discount', e.target.value === '' ? '' : parseFloat(e.target.value))}
                onBlur={(e) => { if (e.target.value === '' || isNaN(option.discount)) updatePackageOption(index, 'discount', 0); }}
              />
            </div>
            <div className="form-group">
              <label htmlFor={`status-${index}`}>Status</label>
              <select
                id={`status-${index}`}
                value={option.status}
                onChange={(e) => updatePackageOption(index, 'status', e.target.value)}
              >
                <option value="active">Active</option>
                <option value="not active">Not Active</option>
                <option value="out of stock">Out of Stock</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor={`stock-status-${index}`}>Stock Status</label>
              <select
                id={`stock-status-${index}`}
                value={option.stock_status}
                onChange={(e) => updatePackageOption(index, 'stock_status', e.target.value)}
              >
                <option value="divide">Divide</option>
                <option value="independent">Independent</option>
              </select>
            </div>
            <button
              type="button"
              className="button button-secondary"
              onClick={() => removePackageOption(index)}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AddProduct() {
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
    specifications: '',
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
      vat: 0,
      profit: 0,
      discount: 0,
      supplier_discount: 0,
      currency: 'USD'
    },
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

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create product');
      }

      alert('Product added successfully!');
      // Reset form to initial state
      setProductData(initialFormState);
      // Reset to first section
      setCurrentSection('details');
    } catch (error) {
      console.error('Error adding product:', error);
      alert('Failed to add product. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddContentLayout
      title="Add New Product"
      onSubmit={handleSubmit}
      isLoading={loading}
      submitButtonText="Add Product"
      onCancel={() => closeTab('add-product')}
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