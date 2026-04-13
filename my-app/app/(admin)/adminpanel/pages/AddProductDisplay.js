'use client';
import { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';
import OptimizedImage from '../../../components/OptimizedImage';

// In admin tabs, components may remount frequently; cache lookup fetches to avoid request storms.
let __variantsLookupCache = null; // { productsList, pricesData, stocksData, packageOptionsData, currencyData }
let __variantsLookupInflight = null;

let __webCategoriesCache = null; // array from /api/web-categories (processed)
let __webCategoriesInflight = null;

async function fetchWebCategoriesCached() {
  if (__webCategoriesCache) return __webCategoriesCache;
  if (__webCategoriesInflight) return __webCategoriesInflight;

  __webCategoriesInflight = (async () => {
    const response = await fetch('/api/web-categories');
    if (!response.ok) {
      throw new Error('Failed to fetch categories');
    }
    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new Error('Invalid categories data received');
    }

    const categoryMap = data.reduce((map, cat) => {
      map[cat.id] = cat;
      return map;
    }, {});

    return data.map((cat) => ({
      ...cat,
      parentName: cat.parent_id ? categoryMap[cat.parent_id]?.name : null,
    }));
  })();

  try {
    __webCategoriesCache = await __webCategoriesInflight;
    return __webCategoriesCache;
  } finally {
    __webCategoriesInflight = null;
  }
}

function invalidateVariantsLookupCache() {
  __variantsLookupCache = null;
  __variantsLookupInflight = null;
}

async function fetchVariantsLookupData({ force = false } = {}) {
  if (force) invalidateVariantsLookupCache();
  if (__variantsLookupCache) return __variantsLookupCache;
  if (__variantsLookupInflight) return __variantsLookupInflight;

  __variantsLookupInflight = (async () => {
    // 1. products
    const productsRes = await fetch('/api/products');
    if (!productsRes.ok) {
      const errorData = await productsRes.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch products');
    }
    const productsData = await productsRes.json();
    const productsList = productsData.products || [];
    if (!Array.isArray(productsList)) {
      throw new Error('Invalid products data format');
    }

    // When no products, skip the rest (keeps UI functional)
    if (productsList.length === 0) {
      return {
        productsList,
        pricesData: [],
        stocksData: [],
        packageOptionsData: [],
        currencyData: [],
      };
    }

    // 2. prices / stocks / package options / currency rates in parallel
    const [pricesRes, stocksRes, packageOptionsRes, currencyRes] = await Promise.all([
      fetch('/api/products/prices'),
      fetch('/api/products/stocks'),
      fetch('/api/package-options'),
      fetch('/api/currency-rates'),
    ]);

    if (!pricesRes.ok) {
      const errorData = await pricesRes.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch prices');
    }
    if (!stocksRes.ok) {
      const errorData = await stocksRes.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch stocks');
    }
    if (!packageOptionsRes.ok) {
      const errorData = await packageOptionsRes.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch package options');
    }
    if (!currencyRes.ok) {
      const errorData = await currencyRes.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to fetch currencies');
    }

    const [pricesData, stocksData, packageOptionsData, currencyData] = await Promise.all([
      pricesRes.json(),
      stocksRes.json(),
      packageOptionsRes.json(),
      currencyRes.json(),
    ]);

    return {
      productsList,
      pricesData,
      stocksData,
      packageOptionsData,
      currencyData,
    };
  })();

  try {
    __variantsLookupCache = await __variantsLookupInflight;
    return __variantsLookupCache;
  } finally {
    __variantsLookupInflight = null;
  }
}

// Basic Details Component
export function BasicDetails({ data, onChange }) {
  const [webCategories, setWebCategories] = useState([]);
  const [error, setError] = useState(null);
  const [summaryPoints, setSummaryPoints] = useState(() => {
    try {
      const desc = typeof data.description === 'string' ? JSON.parse(data.description) : data.description;
      return desc?.summary || [''];
    } catch (e) {
      return [''];
    }
  });

  // Add state for size array display
  const [sizeArray, setSizeArray] = useState(data.size_array || []);

  const dataRef = useRef(data);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    dataRef.current = data;
    onChangeRef.current = onChange;
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoriesWithParents = await fetchWebCategoriesCached();
        setWebCategories(categoriesWithParents);
      } catch (error) {
        console.error('Error fetching web categories:', error);
        setWebCategories([]);
        setError(error.message);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const d = dataRef.current;
    if (d.variants) {
      const uniqueSizes = [...new Set(d.variants
        .filter(v => v.size)
        .map(v => v.size.trim())
      )];
      setSizeArray(uniqueSizes);
      onChangeRef.current({ ...d, size_array: uniqueSizes });
    }
  }, [data.variants]);

  // Function to check if a category has children
  const hasChildren = (categoryId) => {
    return webCategories.some(category => category.parent_id === categoryId);
  };

  // Function to update description in the structured format
  const updateDescription = (mainText, points = summaryPoints) => {
    const descriptionObj = {
      summary: points,
      description: mainText
    };
    onChange({ ...data, description: descriptionObj });
  };

  // Function to handle summary point changes
  const handleSummaryPointChange = (index, value) => {
    const newPoints = [...summaryPoints];
    newPoints[index] = value;
    setSummaryPoints(newPoints);
    
    // Get the main description text
    let mainText = '';
    try {
      const desc = typeof data.description === 'string' ? JSON.parse(data.description) : data.description;
      mainText = desc?.description || '';
    } catch (e) {
      mainText = '';
    }
    
    updateDescription(mainText, newPoints);
  };

  // Function to add a new summary point
  const addSummaryPoint = () => {
    setSummaryPoints([...summaryPoints, '']);
  };

  // Function to remove a summary point
  const removeSummaryPoint = (index) => {
    const newPoints = summaryPoints.filter((_, i) => i !== index);
    setSummaryPoints(newPoints);
    
    // Get the main description text
    let mainText = '';
    try {
      const desc = typeof data.description === 'string' ? JSON.parse(data.description) : data.description;
      mainText = desc?.description || '';
    } catch (e) {
      mainText = '';
    }
    
    updateDescription(mainText, newPoints);
  };

  // Get the main description text from the structured format
  const getDescriptionText = () => {
    try {
      const desc = typeof data.description === 'string' ? JSON.parse(data.description) : data.description;
      return desc?.description || '';
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="form-section">
      <h4>Basic Information</h4>
      {error && <div className="error-message">{error}</div>}
      
      {/* Add Size Array Display */}
      <div className="form-group">
        <label>Available Sizes</label>
        <div className="size-array-display">
          {sizeArray.length > 0 ? (
            <div className="size-tags">
              {sizeArray.map((size, index) => (
                <span key={index} className="size-tag">
                  {size}
                </span>
              ))}
            </div>
          ) : (
            <p className="no-sizes">No sizes available. Add variants to populate sizes.</p>
          )}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="name">Display Name*</label>
        <input
          id="name"
          type="text"
          value={data.name || ''}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          required
          placeholder="Enter display name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="brand">Brand</label>
        <input
          id="brand"
          type="text"
          value={data.brand || ''}
          onChange={(e) => onChange({ ...data, brand: e.target.value })}
          placeholder="Enter brand name"
        />
      </div>

      <div className="form-group">
        <label htmlFor="status">Status*</label>
        <select
          id="status"
          value={data.status || 'active'}
          onChange={(e) => onChange({ ...data, status: e.target.value })}
          required
        >
          <option value="active">Active</option>
          <option value="diactive">Inactive</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="category_id">Web Category*</label>
        <select
          id="category_id"
          value={data.category_id || ''}
          onChange={(e) => onChange({ ...data, category_id: e.target.value })}
          required
        >
          <option value="">Select Category</option>
          {Array.isArray(webCategories) && webCategories
            .filter(category => !hasChildren(category.id))
            .map(category => (
              <option key={category.id} value={category.id}>
                {category.parentName ? `${category.parentName} > ${category.name}` : category.name}
              </option>
            ))
          }
        </select>
      </div>

      <div className="form-group">
        <label>Summary Points</label>
        {summaryPoints.map((point, index) => (
          <div key={index} className="summary-point">
            <input
              type="text"
              value={point}
              onChange={(e) => handleSummaryPointChange(index, e.target.value)}
              placeholder={`Summary point ${index + 1}`}
            />
            <button
              type="button"
              onClick={() => removeSummaryPoint(index)}
              className="remove-point"
            >
              Remove
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={addSummaryPoint}
          className="add-point"
        >
          Add Summary Point
        </button>
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={getDescriptionText()}
          onChange={(e) => updateDescription(e.target.value)}
          placeholder="Enter product description (max 5000 characters)"
          rows={8}
          maxLength={5000}
        />
        <div className="description-info">
          <span className="character-count">
            {getDescriptionText().length}/5000 characters
          </span>
          {getDescriptionText().length >= 4900 && (
            <span className="warning">
              Approaching character limit
            </span>
          )}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="keywords">Keywords (comma-separated)</label>
        <input
          id="keywords"
          type="text"
          value={data.keywords || ''}
          onChange={(e) => onChange({ ...data, keywords: e.target.value })}
          placeholder="Enter keywords, separated by commas"
        />
      </div>

      <style jsx>{`
        .summary-point {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .summary-point input {
          flex: 1;
        }
        .remove-point {
          padding: 0.25rem 0.5rem;
          background: #dc3545;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .remove-point:hover {
          background: #c82333;
        }
        .add-point {
          padding: 0.5rem 1rem;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 0.5rem;
        }
        .add-point:hover {
          background: #218838;
        }
        .size-array-display {
          margin-top: 0.5rem;
        }
        .size-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .size-tag {
          background: #e9ecef;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.875rem;
          color: #495057;
        }
        .no-sizes {
          color: #6c757d;
          font-style: italic;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

// Product Variants Component
export function ProductVariants({ data, onChange }) {
  const [products, setProducts] = useState([]);
  const [productPrices, setProductPrices] = useState({});
  const [productStocks, setProductStocks] = useState({});
  const [packageOptions, setPackageOptions] = useState({});
  const [error, setError] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const dataRef = useRef(data);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    dataRef.current = data;
    onChangeRef.current = onChange;
  });

  const fetchData = async ({ force = false } = {}) => {
    try {
      setRefreshing(true);
      // Reset error state
      setError(null);

      const { productsList, pricesData, stocksData, packageOptionsData, currencyData } =
        await fetchVariantsLookupData({ force });

      setProducts(productsList);

      const productIds = (productsList || []).map((p) => p.id);

      setCurrencies(Array.isArray(currencyData) ? currencyData : []);

      // Map prices
      const pricesMap = {};
      if (Array.isArray(pricesData)) {
        pricesData.forEach((price) => {
          if (price && price.product_id && productIds.includes(price.product_id)) {
            pricesMap[price.product_id] = {
              price: price.price || 0,
              discount: price.discount || 0,
              currency: price.currency || 'USD',
              is_multi: price.is_multi,
              multi_currency_prices: price.multi_currency_prices,
            };
          }
        });
      }
      setProductPrices(pricesMap);

      // Map stocks
      const stocksMap = {};
      if (Array.isArray(stocksData)) {
        stocksData.forEach((stock) => {
          if (stock && stock.product_id && productIds.includes(stock.product_id)) {
            stocksMap[stock.product_id] = {
              quantity: stock.quantity || 0,
              unit: stock.unit || 'pcs',
              status: stock.stock_status || 'in_stock',
            };
          }
        });
      }
      setProductStocks(stocksMap);

      // Map package options
      const optionsMap = {};
      if (Array.isArray(packageOptionsData)) {
        packageOptionsData.forEach((option) => {
          if (option && option.product_id && productIds.includes(option.product_id)) {
            if (!optionsMap[option.product_id]) {
              optionsMap[option.product_id] = [];
            }
            optionsMap[option.product_id].push({
              id: option.id,
              name: option.name,
              count: option.count,
              discount: option.discount,
              status: option.status,
              stock_status: option.stock_status,
              order_index: option.order_index,
            });
            optionsMap[option.product_id].sort((a, b) => a.order_index - b.order_index);
          }
        });
      }
      setPackageOptions(optionsMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error.message || 'Failed to fetch data');
      // Set default empty values
      setProducts([]);
      setProductPrices({});
      setProductStocks({});
      setPackageOptions({});
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable: fetch once on mount
  }, []);

  const addVariant = () => {
    const newVariant = {
      product_id: '',
      size: '',
      has_package_options: true,
      package_options: [],
      order_index: (data.variants || []).length, // Add order index
      is_default_size: (data.variants || []).length === 0 // Make first variant default
    };
    const updatedVariants = [...(data.variants || []), newVariant];
    onChange({ ...data, variants: updatedVariants });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    if (result.type === 'variant') {
      const newVariants = Array.from(data.variants || []);
      const [reorderedVariant] = newVariants.splice(result.source.index, 1);
      newVariants.splice(result.destination.index, 0, reorderedVariant);
      
      // Update order_index for all variants after reordering
      newVariants.forEach((variant, index) => {
        variant.order_index = index;
      });
      
      onChange({ ...data, variants: newVariants });
    } else if (result.type === 'package-option') {
      const variantId = result.source.droppableId.split('-')[2];
      const variantIndex = (data.variants || []).findIndex(v => 
        (v.product_id || '').toString() === variantId.toString()
      );
      
      if (variantIndex === -1) return;

      const newVariants = [...(data.variants || [])];
      const variant = { ...newVariants[variantIndex] };
      const newPackageOptions = [...variant.package_options];
      
      const [reorderedOption] = newPackageOptions.splice(result.source.index, 1);
      newPackageOptions.splice(result.destination.index, 0, reorderedOption);
      
      // Update the order_index for each package option
      newPackageOptions.forEach((option, index) => {
        option.order_index = index;
      });
      
      variant.package_options = newPackageOptions;
      newVariants[variantIndex] = variant;
      
      onChange({ ...data, variants: newVariants });
    }
  };

  const updateVariant = (index, field, value) => {
    if (field === 'product_id') {
      // Check if this product is already selected in another variant
      const isDuplicate = (data.variants || []).some((variant, i) => 
        i !== index && variant.product_id === value
      );

      if (isDuplicate) {
        alert('This product is already added as a variant.');
        return;
      }

      // When product is selected, get its package options and price data
      const updatedVariants = [...(data.variants || [])];
      const priceInfo = productPrices[value];
      
      updatedVariants[index] = {
        ...updatedVariants[index],
        [field]: value,
        package_options: packageOptions[value]?.map(opt => ({
          ...opt,
          state: 'active' // Initial state: active
        })) || [],
        price_info: priceInfo ? {
          price: priceInfo.price,
          currency: priceInfo.currency,
          is_multi: priceInfo.is_multi,
          multi_currency_prices: priceInfo.multi_currency_prices,
          discount: priceInfo.discount
        } : null
      };
      onChange({ ...data, variants: updatedVariants });
    } else if (field === 'size') {
      // Validate size field
      if (!value.trim()) {
        alert('Size is required');
        return;
      }
      
      const updatedVariants = [...(data.variants || [])];
      updatedVariants[index] = { ...updatedVariants[index], size: value.trim() };
      onChange({ ...data, variants: updatedVariants });
    } else {
      const updatedVariants = [...(data.variants || [])];
      updatedVariants[index] = { ...updatedVariants[index], [field]: value };
      onChange({ ...data, variants: updatedVariants });
    }
  };

  const removeVariant = (index) => {
    const updatedVariants = (data.variants || []).filter((_, i) => i !== index);
    onChange({ ...data, variants: updatedVariants });
  };

  // Get list of already selected product IDs
  const getSelectedProductIds = () => {
    return (data.variants || []).map(variant => variant.product_id).filter(Boolean);
  };

  // Filter out already selected products from dropdown
  const getAvailableProducts = () => {
    const selectedIds = getSelectedProductIds();
    return products.filter(product => !selectedIds.includes(product.id));
  };

  return (
    <div className="form-section full-width">
      <h4>Product Variants</h4>
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}
      <div className="variants-actions">
        <button
          type="button"
          className="add-variant-btn"
          onClick={addVariant}
          disabled={getAvailableProducts().length === 0}
        >
          Add Variant
        </button>
        <button
          type="button"
          className="refresh-variants-btn"
          onClick={() => fetchData({ force: true })}
          disabled={refreshing}
          title="Reload latest prices/stocks/package options"
        >
          {refreshing ? 'Refreshing…' : 'Refresh Prices/Stocks'}
        </button>
      </div>
      
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="variants-table">
          <div className="variants-header">
            <div></div>
            <div>Product</div>
            <div>Size</div>
            <div>Price</div>
            <div>Stock</div>
            <div>Stock Unit</div>
            <div>Status</div>
            <div>Default</div>
            <div>Package Options</div>
            <div></div>
          </div>
          <Droppable droppableId="variants-list" type="variant">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {(data.variants || []).map((variant, index) => {
                  const stockInfo = variant.product_id ? productStocks[variant.product_id] : null;
                  const priceInfo = variant.product_id ? productPrices[variant.product_id] : null;
                  const product = products.find(p => p.id === variant.product_id);
                  
                  return (
                    <Draggable
                      key={`variant-${index}`}
                      draggableId={`variant-${index}`}
                      index={index}
                      type="variant"
                    >
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`variant-row ${snapshot.isDragging ? 'dragging' : ''}`}
                        >
                          <div 
                            {...provided.dragHandleProps}
                            className="variant-drag-handle"
                          >
                            ⋮⋮
                          </div>
                          <div className="variant-product">
                            <select
                              value={variant.product_id || ''}
                              onChange={(e) => updateVariant(index, 'product_id', e.target.value)}
                              required
                            >
                              <option value="">Select Product</option>
                              {getAvailableProducts()
                                .concat(variant.product_id ? [products.find(p => p.id === variant.product_id)] : [])
                                .filter(Boolean)
                                .map(product => (
                                  <option key={product.id} value={product.id}>
                                    {product.name} ({product.sku})
                                  </option>
                                ))
                              }
                            </select>
                            {product && <span className="variant-product-sku">SKU: {product.sku}</span>}
                          </div>

                          <div className="variant-size">
                            <input
                              type="text"
                              value={variant.size || ''}
                              onChange={(e) => updateVariant(index, 'size', e.target.value)}
                              placeholder="Enter size (required)"
                              required
                              pattern=".+"
                              title="Size is required"
                            />
                          </div>

                          <div className="variant-price">
                            {priceInfo && `${priceInfo.price} ${priceInfo.currency}`}
                          </div>

                          <div className="variant-stock">
                            {stockInfo && (
                              <span className={stockInfo.status === 'limited' ? 'warning' : ''}>
                                {stockInfo.quantity}
                              </span>
                            )}
                          </div>

                          <div className="variant-unit">
                            {stockInfo && stockInfo.unit}
                          </div>

                          <select 
                            className="status-select"
                            value={variant.status || 'active'}
                            onChange={(e) => {
                              const newVariants = [...(data.variants || [])];
                              newVariants[index].status = e.target.value;
                              onChange({ ...data, variants: newVariants });
                            }}
                          >
                            <option value="active" className="status-active">Active</option>
                            <option value="inactive" className="status-inactive">Inactive</option>
                            <option value="out-of-stock" className="status-out-of-stock">Out of Stock</option>
                          </select>

                          <div className="variant-default">
                            <input
                              type="radio"
                              name="default_size"
                              checked={variant.size === data.default_size}
                              onChange={() => {
                                console.log('Setting default size. Current state:', {
                                  variantSize: variant.size,
                                  currentDefault: data.default_size
                                });
                                const newVariants = [...(data.variants || [])];
                                // Update default size in parent data
                                onChange({
                                  ...data,
                                  default_size: variant.size,
                                  variants: newVariants.map(v => ({
                                    ...v,
                                    is_default_size: v.size === variant.size
                                  }))
                                });
                              }}
                            />
                          </div>

                          <div className="variant-package-options">
                            <Droppable
                              droppableId={`package-options-${variant.product_id || index}`}
                              type="package-option"
                              direction="vertical"
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className="package-options-list"
                                >
                                  {variant.package_options?.map((option, optionIndex) => (
                                    <Draggable
                                      key={`option-${option.id}`}
                                      draggableId={`option-${option.id}`}
                                      index={optionIndex}
                                    >
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          className={`package-option-tag ${option.status === 'not active' ? 'disabled' : ''} 
                                            ${option.status === 'out of stock' ? 'out-of-stock' : ''}
                                            ${snapshot.isDragging ? 'dragging' : ''}`}
                                        >
                                          <span 
                                            {...provided.dragHandleProps}
                                            className="drag-handle"
                                          >
                                            ⋮
                                          </span>
                                          <div className="package-option-content">
                                            <div className="option-name">
                                              {option.name} ({option.count} pcs)
                                              {option.discount > 0 && (
                                                <span className="discount-badge">-{option.discount}%</span>
                                              )}
                                            </div>
                                            <div className={`option-status ${
                                              option.status === 'not active' ? 'status-inactive' :
                                              option.status === 'out of stock' ? 'status-out-of-stock' :
                                              'status-active'
                                            }`}>
                                              {option.status}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>

                          <div className="variant-actions">
                            <button
                              type="button"
                              className="remove-variant-btn"
                              onClick={() => removeVariant(index)}
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>
      </DragDropContext>
      <style jsx>{`
        .variants-actions {
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }

        .refresh-variants-btn {
          border: 1px solid #ddd;
          background: #fff;
          color: #333;
          padding: 8px 12px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 600;
        }

        .refresh-variants-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

// Product Images Component
export function ProductImages({ data, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});

  const THUMB_W = 280;
  const THUMB_H = 420;

  // Ensure data.images exists
  const images = data?.images || [];
  console.log('Current images data:', images);

  const getImageResolution = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          console.log('Image resolution calculated:', `${img.width}x${img.height}`);
          resolve(`${img.width}x${img.height}`);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    console.log('Files selected for upload:', files.map(f => ({ name: f.name, type: f.type, size: f.size })));
    // reset input so selecting same file again triggers change
    e.target.value = '';
    if (!files.length) return;

    // No thumbnail-crop flow: upload files as-is
    for (const file of files) {
      // eslint-disable-next-line no-await-in-loop -- keep sequential uploads for simpler UX
      await uploadCroppedFile({ file, crop: null });
    }
  };

  const uploadCroppedFile = async ({ file, crop }) => {
    setUploading(true);
    try {
      const newImages = [];
      
      // Upload files one by one to ensure proper handling
      for (const f of [file]) {
        try {          
          // Get file details first
          const resolution = await getImageResolution(f);
          const fileSize = Math.round(f.size / 1024); // Convert to KB
          const format = f.type.split('/')[1].toUpperCase();
          console.log('File details:', { resolution, fileSize, format });

          // Upload the file
          const formData = new FormData();
          formData.append('file', f);
          if (crop) {
            formData.append('crop', JSON.stringify(crop));
          }

          console.log('Uploading file to server...');
          const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          });

          if (!response.ok) {
            throw new Error('Failed to upload image');
          }

          const uploadResponse = await response.json();
          console.log('Server response:', uploadResponse);

          const newImage = {
            original_url: uploadResponse.url,
            cart_url: uploadResponse.cart_url,
            is_primary: false,
            display_type: 'gallery', // kept for backward compatibility (not user-editable)
            alt_text: '',
            in_thumb: true,
            hide: false,
            // 1-based ordering (validation requires orders start from 1)
            order_index: images.length + newImages.length + 1,
            file_size: uploadResponse.file_size ?? fileSize,
            resolution: uploadResponse.resolution ?? resolution,
            format: uploadResponse.format || format,
            cart_dimensions: uploadResponse.cart_dimensions ?? { width: THUMB_W, height: THUMB_H },
          };
          console.log('Created new image object:', newImage);
          newImages.push(newImage);
        } catch (error) {
          console.error('Error uploading single image:', error);
          // Continue with other files even if one fails
        }
      }

      if (newImages.length > 0) {
        console.log('Successfully uploaded images:', newImages);
        onChange({
          ...data,
          images: [...images, ...newImages]
        });
      } else {
        throw new Error('No images were successfully uploaded');
      }
    } catch (error) {
      console.error('Error in image upload process:', error);
      alert('Failed to upload images. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const updateImage = (index, field, value) => {
    console.log('Updating image:', { index, field, value });
    const updatedImages = [...images];
    updatedImages[index] = { ...updatedImages[index], [field]: value };

    console.log('Updated image:', updatedImages[index]);
    onChange({
      ...data,
      images: updatedImages
    });
  };

  const removeImage = (index) => {
    const updatedImages = images.filter((_, i) => i !== index);
    onChange({
      ...data,
      images: updatedImages
    });
  };

  const handleOrderChange = (index, newOrder) => {
    // Convert to number and validate range
    const orderNum = parseInt(newOrder);
    if (isNaN(orderNum) || orderNum < 1 || orderNum > images.length) {
      return;
    }

    // Update the order_index for all images
    const updatedImages = [...images];
    const oldOrder = Number(updatedImages[index]?.order_index) || index + 1;
    
    updatedImages.forEach((img, i) => {
      if (oldOrder < orderNum) {
        // Moving down: decrease order of images in between
        if (i !== index && img.order_index > oldOrder && img.order_index <= orderNum) {
          img.order_index--;
        }
      } else if (oldOrder > orderNum) {
        // Moving up: increase order of images in between
        if (i !== index && img.order_index >= orderNum && img.order_index < oldOrder) {
          img.order_index++;
        }
      }
    });
    
    // Set the new order for the moved image
    updatedImages[index].order_index = orderNum;
    
    onChange({
      ...data,
      images: updatedImages
    });
  };

  return (
    <div className="form-section full-width">
      <h4>Product Images</h4>
      <div className="image-upload-section">
        <input
          type="file"
          id="image-upload"
          multiple
          accept="image/*"
          onChange={handleImageUpload}
          disabled={uploading}
        />
        <label htmlFor="image-upload" className="upload-button">
          {uploading ? 'Uploading...' : 'Upload Images'}
        </label>
      </div>

      <div className="images-grid">
        {images.map((image, index) => {
          // Handle image URL - ensure it's a valid path from the public directory
          const rawUrl = image.original_url || image.url || '';
          const imageUrl = rawUrl.replace(/^blob:.*$/, '');
          const finalUrl =
            /^https?:\/\//i.test(imageUrl)
              ? imageUrl
              : imageUrl.startsWith('/')
                ? imageUrl
                : `/images/${imageUrl}`;
          
          if (imageUrl.startsWith('blob:')) {
            return null;
          }
          
          return (
            <div key={index} className="image-item">
              <div className="image-item__media">
                <OptimizedImage
                  src={finalUrl}
                  alt={image.alt_text || 'Product image'}
                  fill
                  sizes="(max-width: 768px) 100vw, 280px"
                  style={{ objectFit: 'cover' }}
                />
              </div>
              <div className="image-controls">
                <div className="control-row">
                  <label className="primary-checkbox">
                    <input
                      type="checkbox"
                      checked={image.in_thumb ?? true}
                      onChange={(e) => {
                        if (image.hide) return;
                        updateImage(index, 'in_thumb', e.target.checked);
                      }}
                      disabled={image.hide ?? false}
                    />
                    In Thumbnail
                  </label>
                  <label className="primary-checkbox">
                    <input
                      type="checkbox"
                      checked={image.hide ?? false}
                      onChange={(e) => updateImage(index, 'hide', e.target.checked)}
                    />
                    Hide
                  </label>
                  <label>
                    Order:
                    <input
                      type="number"
                      min="1"
                      max={images.length}
                      value={image.order_index || index + 1}
                      onChange={(e) => handleOrderChange(index, e.target.value)}
                      className="order-input"
                      disabled={image.hide ?? false}
                    />
                  </label>
                  <label className="primary-checkbox" style={{ opacity: (image.in_thumb ?? true) && !(image.hide ?? false) ? 1 : 0.5 }}>
                    <input
                      type="checkbox"
                      checked={image.is_primary || false}
                      disabled={!(image.in_thumb ?? true) || (image.hide ?? false)}
                      onChange={(e) => updateImage(index, 'is_primary', e.target.checked)}
                    />
                    Primary Image
                  </label>
                </div>
                <div className="control-row">
                  <input
                    type="text"
                    value={image.alt_text || ''}
                    onChange={(e) => updateImage(index, 'alt_text', e.target.value)}
                    placeholder="Alt text"
                    disabled={image.hide ?? false}
                  />
                </div>
                <div className="image-info">
                  <span>Size: {image.file_size}KB</span>
                  <span>Resolution: {image.resolution}</span>
                  <span>Format: {image.format}</span>
                </div>
                <div className="control-row">
                  <button
                    onClick={() => removeImage(index)}
                    className="remove-button"
                    disabled={image.hide ?? false}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .image-item {
          border: 1px solid #ddd;
          padding: 10px;
          margin-bottom: 10px;
          border-radius: 4px;
        }
        
        .image-controls {
          margin-top: 10px;
        }
        
        .control-row {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 5px;
          flex-wrap: wrap;
        }

        .control-row label {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }
        
        .order-input {
          width: 72px;
          padding: 4px;
        }
        
        .primary-checkbox {
          display: flex;
          align-items: center;
          gap: 5px;
          cursor: pointer;
          padding: 4px 8px;
          background: #f0f0f0;
          border-radius: 4px;
          font-size: 0.9em;
        }
        
        .primary-checkbox input[type="checkbox"] {
          margin: 0;
          cursor: pointer;
        }
        
        .primary-checkbox:hover {
          background: #e0e0e0;
        }

        .image-upload-section {
          margin-bottom: 20px;
        }

        .upload-button {
          display: inline-block;
          padding: 8px 16px;
          background: #4a90e2;
          color: white;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .upload-button:hover {
          background: #357abd;
        }

        .images-grid {
          display: grid;
          gap: 20px;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        }

        .image-item__media {
          position: relative;
          width: 100%;
          aspect-ratio: 1;
          margin-bottom: 10px;
          border-radius: 4px;
          overflow: hidden;
        }

        .image-info {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          font-size: 0.85em;
          color: #666;
          margin-top: 5px;
        }

        input[type="text"],
        select {
          width: 100%;
          padding: 6px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }

        .variant-default {
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 0 10px;
        }
        
        .variant-default input[type="radio"] {
          cursor: pointer;
          width: 16px;
          height: 16px;
        }

        .variant-default input[type="radio"]:checked {
          accent-color: #4a90e2;
        }
      `}</style>
    </div>
  );
}

// Main Component
export default function AddProductDisplay() {
  const { closeTab, activeTabId, getTabFormData, saveTabFormData } = useAdminTabs();
  const [loading, setLoading] = useState(false);
  const lastPersistedRef = useRef('');
  const initialFormState = {
    name: '',
    description: '',
    category_id: '',
    status: 'active',
    brand: '',
    keywords: '',
    variants: [],
    images: []
  };

  // Get saved form data or use initial state
  const formData = activeTabId ? getTabFormData(activeTabId) : {
    displayData: initialFormState,
    currentSection: 'details'
  };

  const [currentSection, setCurrentSection] = useState(formData.currentSection || 'details');

  const [displayData, setDisplayData] = useState(formData.displayData || initialFormState);

  const validateImagesBeforeSubmit = (images = []) => {
    const visible = (images || []).filter((img) => !(img?.hide ?? false));
    const errors = [];

    if (visible.length < 1) errors.push('You must add at least 1 image (not hidden).');

    const inThumb = visible.filter((img) => img?.in_thumb ?? true);
    if (inThumb.length < 1) errors.push('You must select at least 1 image as "In Thumbnail".');

    const primaries = inThumb.filter((img) => !!img?.is_primary);
    if (primaries.length !== 1) errors.push('You must select exactly 1 "Primary Image" among "In Thumbnail" images.');

    // Orders: unique and consecutive starting at 1 (hidden images excluded)
    const orders = visible.map((img) => Number(img?.order_index)).filter((n) => Number.isFinite(n));
    if (orders.length !== visible.length) {
      errors.push('Every visible image must have a valid numeric Order.');
    } else {
      const ints = orders.map((n) => (Number.isInteger(n) ? n : NaN));
      if (ints.some((n) => !Number.isFinite(n))) errors.push('Order must be an integer.');
      const unique = new Set(ints);
      if (unique.size !== ints.length) errors.push('All visible images must have different Order values.');
      if (ints.length) {
        const min = Math.min(...ints);
        const max = Math.max(...ints);
        if (min !== 1) errors.push('Order must start from 1.');
        if (max !== visible.length) errors.push(`Order must be consecutive up to ${visible.length}.`);
      }
    }

    // Primary cannot be hidden; primary must be in_thumb
    const invalidPrimary = visible.filter((img) => !!img?.is_primary && !(img?.in_thumb ?? true));
    if (invalidPrimary.length) errors.push('Primary Image must also be "In Thumbnail".');

    return errors;
  };
  
  // Save form data whenever it changes
  useEffect(() => {
    if (activeTabId && !loading) {
      // Avoid persisting large derived lookup maps into localStorage
      const { prices, currencies, ...displayDataToPersist } = displayData || {};
      const payload = { displayData: displayDataToPersist, currentSection };
      const key = JSON.stringify(payload);
      if (key === lastPersistedRef.current) return;
      lastPersistedRef.current = key;
      saveTabFormData(activeTabId, payload);
    }
  }, [displayData, currentSection, activeTabId, loading, saveTabFormData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Validate required fields
      if (!displayData.name || !displayData.category_id) {
        alert('Please fill in all required fields');
        setLoading(false);
        return;
      }

      const imageErrors = validateImagesBeforeSubmit(displayData.images || []);
      if (imageErrors.length) {
        alert(`Image validation failed:\n\n- ${imageErrors.join('\n- ')}`);
        setLoading(false);
        return;
      }

      // Always refresh latest prices/currency rates at submit time
      const selectedProductIds = (displayData.variants || [])
        .map((v) => v?.product_id)
        .filter(Boolean);
      let latestPricesMap = null;
      let latestCurrencies = null;
      try {
        const [pricesRes, currencyRes] = await Promise.all([
          fetch('/api/products/prices', { cache: 'no-store' }),
          fetch('/api/currency-rates', { cache: 'no-store' }),
        ]);
        if (pricesRes.ok) {
          const pricesData = await pricesRes.json();
          latestPricesMap = {};
          if (Array.isArray(pricesData)) {
            for (const price of pricesData) {
              if (price?.product_id && selectedProductIds.includes(price.product_id)) {
                latestPricesMap[price.product_id] = price;
              }
            }
          }
        }
        if (currencyRes.ok) {
          latestCurrencies = await currencyRes.json();
        }
      } catch (err) {
        console.warn('Failed to refresh latest prices/currencies at submit time:', err);
      }

      const refreshedVariants = (displayData.variants || []).map((variant) => {
        if (!variant?.product_id || !latestPricesMap) return variant;
        const p = latestPricesMap[variant.product_id];
        if (!p) return variant;
        return {
          ...variant,
          price_info: {
            price: p.price,
            currency: p.currency,
            is_multi: p.is_multi,
            multi_currency_prices: p.multi_currency_prices,
            discount: p.discount,
            exchange_rates: Array.isArray(latestCurrencies) ? latestCurrencies : variant?.price_info?.exchange_rates,
          },
        };
      });

      // Calculate price range from variants (use refreshed prices)
      let minPrice = null;
      let maxPrice = null;
      let hasVariants = true;
      let priceArray = [];  

      if (refreshedVariants && refreshedVariants.length > 0) {
          if(refreshedVariants.length === 1){
            hasVariants = false;
          }
          refreshedVariants.forEach(variant => {
            if (!variant.product_id || !variant.price_info) return;

          const priceInfo = variant.price_info;
          let variantPrice = null;

          // Handle different currency cases
          if (priceInfo.currency === 'MIX' && priceInfo.is_multi && Array.isArray(priceInfo.multi_currency_prices)) {
            // For MIX currency type, sum up all prices converted to TRY
            variantPrice = priceInfo.multi_currency_prices.reduce((total, currencyPrice) => {
              if (currencyPrice.currency === 'TRY') {
                return total + currencyPrice.price;
              }
              const exchangeRate = priceInfo.exchange_rates?.[currencyPrice.currency];
              if (exchangeRate) {
                return total + (currencyPrice.price * exchangeRate);
              }
              return total;
            }, 0);
          } else if (priceInfo.currency === 'EUR' || priceInfo.currency === 'USD') {
            // For EUR and USD, convert to TRY using exchange rates
            const exchangeRate = priceInfo.exchange_rates?.[priceInfo.currency];
            if (exchangeRate) {
              variantPrice = priceInfo.price * exchangeRate;
            }
          } else if (priceInfo.currency === 'TRY') {
            // For TRY, use price directly
            variantPrice = priceInfo.price;
          }

          if (variantPrice !== null) {
            minPrice = minPrice === null ? variantPrice : Math.min(minPrice, variantPrice);
            maxPrice = maxPrice === null ? variantPrice : Math.max(maxPrice, variantPrice);
          }
          priceArray.push(variantPrice);
        });

        if (minPrice !== null && maxPrice !== null) {
          // Format prices with 2 decimal places
          minPrice = parseFloat(Number(minPrice).toFixed(2));
          maxPrice = parseFloat(Number(maxPrice).toFixed(2));
          
          
        }
        
      }

      // Add price information and variants flag to the submission data
      const submissionData = {
        ...displayData,
        variants: refreshedVariants,
        currencies: latestCurrencies ?? displayData.currencies,
        has_variants: hasVariants,
        min_price: minPrice,
        max_price: maxPrice,
        price_array: priceArray,
        images: displayData.images?.map(img => ({
          original_url: img.original_url || img.url,
          alt_text: img.alt_text,
          order_index: img.order_index,
          hide: img.hide ?? false,
          in_thumb: img.in_thumb ?? true,
          is_primary: img.is_primary ?? false,
          // keep sending display_type for old backend compatibility
          display_type: img.display_type || 'gallery',
          file_size: img.file_size,
          resolution: img.resolution,
          format: img.format
        }))
      };

      // Log the data being sent
      console.log('Submitting product display data:', submissionData);

      const response = await fetch('/api/product-displays', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submissionData)
      });

      const result = await response.json();
      console.log('Server response:', result);

      // Check for specific error cases first
      if (result.error || !response.ok) {
        console.log('Server error:', result); // Log the full error for debugging

        // Handle database unique constraint error for product_variants
        if (result.message?.includes('product_variants_product_id_size_key')) {
          const variant = displayData.variants.find(v => {
            const variantKey = `(${v.product_id},${v.size})`;
            return result.message.includes(variantKey);
          });

          if (variant) {
            alert(`Error: Product "${variant.name}" with size "${variant.size}" is already used in another display.`);
          } else {
            alert('Error: A product variant with this size combination already exists in another display.');
          }
          return;
        }
        
        // For other errors, show the exact error message from the server
        alert(result.message || result.error || 'An error occurred while creating the product display.');
        return;
      }

      // Success case
      alert('Product display added successfully!');
      
      // Reset form data to initial state
      setDisplayData({
        name: '',
        description: '',
        category_id: '',
        status: 'active',
        brand: '',
        keywords: '',
        variants: [],
        images: [],
        currencies: []
      });

      // Clear the form data from tab storage
      if (activeTabId) {
        saveTabFormData(activeTabId, {
          displayData: initialFormState,
          currentSection: 'details'
        });
      }

      // Reset current section to details
      setCurrentSection('details');

      closeTab('add-product-display');
    } catch (error) {
      console.error('Error adding product display:', error);
      alert(
        'Unexpected Error:\n\n' +
        'An error occurred while creating the product display.\n\n' +
        'Details:\n' +
        (error.message || 'Unknown error') + '\n\n' +
        'Please try again or contact support if the problem persists.'
      );
    } finally {
      setLoading(false);
    }
  };

  const sections = {
    details: {
      title: 'Basic Details',
      component: <BasicDetails data={displayData} onChange={setDisplayData} />
    },
    variants: {
      title: 'Product Variants',
      component: <ProductVariants data={displayData} onChange={setDisplayData} />
    },
    images: {
      title: 'Product Images',
      component: <ProductImages data={displayData} onChange={setDisplayData} />
    }
  };

  return (
    <AddContentLayout
      title="Add New Product Display"
      onSubmit={handleSubmit}
      isLoading={loading}
      submitButtonText="Add Product Display"
      onCancel={() => closeTab('add-product-display')}
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