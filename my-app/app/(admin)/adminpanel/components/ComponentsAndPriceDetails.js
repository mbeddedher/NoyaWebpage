'use client';
import { useState, useEffect } from 'react';

export default function ComponentsAndPriceDetails({ data, onChange, refreshTrigger }) {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [productPrices, setProductPrices] = useState({});
  const [currencyRates, setCurrencyRates] = useState({});
  const [ratesDate, setRatesDate] = useState(null);
  const [availableCurrencies, setAvailableCurrencies] = useState(new Set());
  const [productUnits, setProductUnits] = useState({});

  const linkTypes = [
    { value: 'cost', label: 'Cost Only' },
    { value: 'cost-vat', label: 'Cost + VAT' },
    { value: 'price', label: 'Final Price' },
    { value: 'separate', label: 'Separate Price' }
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsRes, stocksRes, pricesRes, ratesRes] = await Promise.all([
          fetch('/api/products'),
          fetch('/api/products/stocks'),
          fetch('/api/products/prices'),
          fetch('/api/currency-rates')
        ]);

        if (!productsRes.ok) throw new Error('Failed to fetch products');
        if (!stocksRes.ok) throw new Error('Failed to fetch stock data');
        if (!pricesRes.ok) throw new Error('Failed to fetch price data');
        if (!ratesRes.ok) throw new Error('Failed to fetch currency rates');

        const [productsData, stocksData, pricesData, ratesData] = await Promise.all([
          productsRes.json(),
          stocksRes.json(),
          pricesRes.json(),
          ratesRes.json()
        ]);

        console.log('Fetched data:', {
          products: productsData,
          stocks: stocksData,
          prices: pricesData,
          rates: ratesData
        });

        setProducts(productsData);

        // Process stock units
        const unitsMap = {};
        stocksData.forEach(stock => {
          unitsMap[stock.product_id] = stock.unit;
        });
        setProductUnits(unitsMap);

        // Process prices
        const pricesMap = {};
        const currencies = new Set();
        pricesData.forEach(price => {
          pricesMap[price.product_id] = {
            price: parseFloat(price.price) || 0,
            cost: parseFloat(price.price) || 0,
            vat: parseFloat(price.vat) || 0,
            currency: price.currency,
            is_multi: price.is_multi
          };
          currencies.add(price.currency);
        });
        setProductPrices(pricesMap);
        setAvailableCurrencies(currencies);

        // Set currency rates
        setCurrencyRates(ratesData.rates);
        setRatesDate(ratesData.date);

        console.log('Processed data:', {
          unitsMap,
          pricesMap,
          currencies: Array.from(currencies),
          rates: ratesData.rates
        });
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshTrigger]);

  const calculatePriceInCurrency = (component, currency) => {
    if (!component.product_id || !productPrices[component.product_id]) return 0;
    
    const priceInfo = productPrices[component.product_id];
    let basePrice = 0;
    
    // Parse values with fallbacks
    const cost = parseFloat(priceInfo.cost) || parseFloat(priceInfo.price) || 0;
    const vat = parseFloat(priceInfo.vat) || parseFloat(data.vat_rate) || 0;
    const price = parseFloat(priceInfo.price) || 0;
    const separatePrice = parseFloat(data.separate_price) || 0;
    const quantity = parseInt(component.quantity) || 1;
    
    switch (data.link_type) {
      case 'cost':
        basePrice = cost * quantity;
        break;
      case 'cost-vat':
        basePrice = cost * (1 + vat / 100) * quantity;
        break;
      case 'price':
        basePrice = price * quantity;
        break;
      case 'separate':
        basePrice = separatePrice * quantity;
        break;
      default:
        basePrice = 0;
    }
    
    // Convert currency if needed
    if (priceInfo.currency !== currency) {
      const fromRate = parseFloat(currencyRates[`${priceInfo.currency}_TRY`]) || 1;
      const toRate = parseFloat(currencyRates[`${currency}_TRY`]) || 1;
      basePrice = basePrice * fromRate / toRate;
    }
    
    return basePrice;
  };

  const calculateTotalPrices = () => {
    if (!data.components || data.components.length === 0) return {};
    
    const totals = {};
    data.components.forEach(component => {
      if (component.product_id && productPrices[component.product_id]) {
        const currency = productPrices[component.product_id].currency;
        const price = calculatePriceInCurrency(component, currency);
        
        if (!totals[currency]) {
          totals[currency] = 0;
        }
        totals[currency] += price;
      }
    });

    return totals;
  };

  const convertToTRY = (amount, fromCurrency) => {
    if (!amount || !fromCurrency) return 0;
    if (fromCurrency === 'TRY') return parseFloat(amount) || 0;
    
    const rate = parseFloat(currencyRates[`${fromCurrency}_TRY`]) || 1;
    return (parseFloat(amount) || 0) * rate;
  };

  if (loading) {
    return <div>Loading products...</div>;
  }

  return (
    <div className="form-section">
      <h4>Components & Price Details</h4>
      
      {/* Price Settings */}
      <div className="form-group">
        <label htmlFor="link_type">Price Link Type*</label>
        <select
          id="link_type"
          value={data.link_type || 'cost'}
          onChange={(e) => onChange({ ...data, link_type: e.target.value })}
          required
        >
          {linkTypes.map(type => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </div>

      {data.link_type === 'cost' && (
        <>
          <div className="form-group">
            <label htmlFor="vat_rate">VAT Rate (%)*</label>
            <input
              id="vat_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={data.vat_rate || ''}
              onChange={(e) => onChange({ ...data, vat_rate: e.target.value })}
              required
              placeholder="Enter VAT rate"
            />
          </div>
          <div className="form-group">
            <label htmlFor="profit_rate">Profit Rate (%)*</label>
            <input
              id="profit_rate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={data.profit_rate || ''}
              onChange={(e) => onChange({ ...data, profit_rate: e.target.value })}
              required
              placeholder="Enter profit rate"
            />
          </div>
        </>
      )}

      {/* Component Products */}
      <div className="components-section">
        <h5>Component Products</h5>
        <button
          type="button"
          className="button button-secondary"
          onClick={() => {
            const newComponents = [...(data.components || [])];
            if (newComponents.some(comp => !comp.product_id)) {
              alert('Please select a product for the existing component first.');
              return;
            }
            newComponents.push({ product_id: '', quantity: 1 });
            onChange({ ...data, components: newComponents });
          }}
        >
          Add Component
        </button>

        {data.components?.map((component, index) => (
          <div key={index} className="component-item">
            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`component-${index}`}>Component Product*</label>
                <select
                  id={`component-${index}`}
                  value={component.product_id}
                  onChange={(e) => {
                    const newComponents = [...data.components];
                    if (e.target.value && newComponents.some(
                      (comp, i) => i !== index && comp.product_id === e.target.value
                    )) {
                      alert('This component is already added. Please adjust its quantity instead.');
                      return;
                    }
                    newComponents[index] = { ...component, product_id: e.target.value };
                    onChange({ ...data, components: newComponents });
                  }}
                  required
                >
                  <option value="">Select a product</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group quantity-unit-group">
                <label htmlFor={`quantity-${index}`}>Quantity*</label>
                <div className="quantity-with-unit">
                  <input
                    id={`quantity-${index}`}
                    type="number"
                    min="1"
                    step="1"
                    value={component.quantity}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      if (value > 0) {
                        const newComponents = [...data.components];
                        newComponents[index] = { ...component, quantity: value };
                        onChange({ ...data, components: newComponents });
                      }
                    }}
                    required
                  />
                  {component.product_id && (
                    <span className="unit-label">
                      {productUnits[component.product_id] || 'piece'}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="button button-danger"
                onClick={() => {
                  const newComponents = [...data.components];
                  newComponents.splice(index, 1);
                  onChange({ ...data, components: newComponents });
                }}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Price Summary */}
      {data.components?.length > 0 && (
        <div className="price-summary">
          <h5>Price Summary</h5>
          <p>Using currency rates from: {ratesDate || 'latest available rates'}</p>
          
          {/* Component Prices */}
          {data.components.map((component, index) => {
            if (!component.product_id || !productPrices[component.product_id]) return null;
            
            const priceInfo = productPrices[component.product_id];
            const quantity = parseInt(component.quantity) || 1;
            const cost = parseFloat(priceInfo.cost) || parseFloat(priceInfo.price) || 0;
            const baseAmount = cost * quantity;
            
            return (
              <div key={index} className="component-price">
                <p>
                  {products.find(p => p.id === component.product_id)?.name} x {quantity}
                  <br />
                  Base Cost: {baseAmount.toFixed(2)} {priceInfo.currency}
                </p>
              </div>
            );
          })}
          
          {/* Totals */}
          <div className="total-try">
            <p className="final-price">
              Base Total (TRY): {
                data.components.reduce((sum, component) => {
                  if (!component.product_id || !productPrices[component.product_id]) return sum;
                  const priceInfo = productPrices[component.product_id];
                  const quantity = parseInt(component.quantity) || 1;
                  const cost = parseFloat(priceInfo.cost) || parseFloat(priceInfo.price) || 0;
                  const baseAmount = cost * quantity;
                  const inTRY = priceInfo.currency === 'TRY' ? 
                    baseAmount : 
                    baseAmount * (parseFloat(currencyRates[`${priceInfo.currency}_TRY`]) || 1);
                  return sum + inTRY;
                }, 0).toFixed(2)
              }
              <br />
              + VAT ({data.vat_rate || 0}%): {
                data.components.reduce((sum, component) => {
                  if (!component.product_id || !productPrices[component.product_id]) return sum;
                  const priceInfo = productPrices[component.product_id];
                  const quantity = parseInt(component.quantity) || 1;
                  const cost = parseFloat(priceInfo.cost) || parseFloat(priceInfo.price) || 0;
                  const baseAmount = cost * quantity;
                  const inTRY = priceInfo.currency === 'TRY' ? 
                    baseAmount : 
                    baseAmount * (parseFloat(currencyRates[`${priceInfo.currency}_TRY`]) || 1);
                  return sum + (inTRY * (parseFloat(data.vat_rate || 0) / 100));
                }, 0).toFixed(2)
              }
              <br />
              + Profit ({data.profit_rate || 0}%): {
                data.components.reduce((sum, component) => {
                  if (!component.product_id || !productPrices[component.product_id]) return sum;
                  const priceInfo = productPrices[component.product_id];
                  const quantity = parseInt(component.quantity) || 1;
                  const cost = parseFloat(priceInfo.cost) || parseFloat(priceInfo.price) || 0;
                  const baseAmount = cost * quantity;
                  const inTRY = priceInfo.currency === 'TRY' ? 
                    baseAmount : 
                    baseAmount * (parseFloat(currencyRates[`${priceInfo.currency}_TRY`]) || 1);
                  const withVat = inTRY * (1 + parseFloat(data.vat_rate || 0) / 100);
                  return sum + (withVat * (parseFloat(data.profit_rate || 0) / 100));
                }, 0).toFixed(2)
              }
              <br />
              Final Total (TRY): {
                data.components.reduce((sum, component) => {
                  if (!component.product_id || !productPrices[component.product_id]) return sum;
                  const priceInfo = productPrices[component.product_id];
                  const quantity = parseInt(component.quantity) || 1;
                  const cost = parseFloat(priceInfo.cost) || parseFloat(priceInfo.price) || 0;
                  const baseAmount = cost * quantity;
                  const inTRY = priceInfo.currency === 'TRY' ? 
                    baseAmount : 
                    baseAmount * (parseFloat(currencyRates[`${priceInfo.currency}_TRY`]) || 1);
                  const withVat = inTRY * (1 + parseFloat(data.vat_rate || 0) / 100);
                  const withProfit = withVat * (1 + parseFloat(data.profit_rate || 0) / 100);
                  return sum + withProfit;
                }, 0).toFixed(2)
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 