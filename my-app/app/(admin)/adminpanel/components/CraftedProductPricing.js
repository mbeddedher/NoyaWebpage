'use client';
import { useState, useEffect } from 'react';

export default function CraftedProductPricing({ data, onChange }) {
  const [priceMode, setPriceMode] = useState(data.pricing?.mode || 'manual');
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [currencyRates, setCurrencyRates] = useState({});
  const [multiCurrencyPrices, setMultiCurrencyPrices] = useState({});

  const calculateTotalFromComponents = (type) => {
    if (!data.components) return {};
    
    // Group totals by currency first
    const totals = data.components.reduce((acc, component) => {
      const quantity = component.quantity || 1;
      const value = type === 'cost' ? (component.cost || 0) : (component.price || 0);
      const currency = component.converted_currency;
      
      if (!acc[currency]) {
        acc[currency] = 0;
      }
      acc[currency] += quantity * value;
      return acc;
    }, {});

    // Convert all totals to selected currency
    const selectedCurrency = data.pricing?.currency || 'USD';
    let finalTotal = 0;

    Object.entries(totals).forEach(([currency, amount]) => {
      if (currency === selectedCurrency) {
        finalTotal += amount;
      } else {
        const rateKey = `${currency}_${selectedCurrency}`;
        const rate = currencyRates[rateKey];
        if (rate) {
          finalTotal += amount * parseFloat(rate);
        }
      }
    });

    // Only apply price difference to price calculations in price mode
    if (type === 'price' && priceMode === 'price' && data.pricing?.has_difference && data.pricing?.difference_value) {
      const diffValue = parseFloat(data.pricing.difference_value);
      // Apply difference to totals by currency
      Object.keys(totals).forEach(currency => {
        totals[currency] = data.pricing.difference_type === 'discount' 
          ? totals[currency] * (1 - diffValue / 100)
          : totals[currency] * (1 + diffValue / 100);
      });
      finalTotal = data.pricing.difference_type === 'discount'
        ? finalTotal * (1 - diffValue / 100)
        : finalTotal * (1 + diffValue / 100);
    }

    return { 
      byCurrency: totals,
      total: parseFloat(finalTotal.toFixed(2))
    };
  };

  const calculateSellingPrice = (cost) => {
    const profit = data.pricing?.profit || 0;
    const vat = data.pricing?.vat || 0;
    const discount = data.pricing?.discount || 0;

    // Add profit margin
    let price = cost * (1 + (profit / 100));
    
    // Add VAT
    price = price * (1 + (vat / 100));
    
    // Apply discount
    price = price * (1 - (discount / 100));

    return price;
  };

  const calculateMeanValue = (components, field) => {
    if (!components || components.length === 0) return 0;
    
    const totalQuantity = components.reduce((sum, component) => {
      return sum + (parseInt(component.quantity) || 1);
    }, 0);
    console.log('Total Quantity:', totalQuantity);

    const weightedSum = components.reduce((acc, component) => {
      const value = parseFloat(component[field]) || 0;
      console.log('Component:', component[field]);
      console.log('Field:', field);
      console.log('Value:', value);
      const quantity = parseInt(component.quantity) || 1;
      return acc + (value * quantity);
    }, 0);
    console.log('Weighted Sum:', weightedSum);

    return parseFloat((weightedSum / totalQuantity).toFixed(2));
  };

  useEffect(() => {
    fetchCurrencyRates();
  }, []);

  const fetchCurrencyRates = async () => {
    try {
      const response = await fetch('/api/currency-rates');
      if (!response.ok) throw new Error('Failed to fetch currency rates');
      const data = await response.json();
      setCurrencyRates(data.rates || {});
    } catch (error) {
      console.error('Error fetching currency rates:', error);
    }
  };

  // Recalculate price whenever components, profit, VAT, or discount changes
  useEffect(() => {
    if (priceMode === 'manual') {
      // Get base values
      const cost = parseFloat(data.pricing?.cost) || 0;
      const profit = parseFloat(data.pricing?.profit) || 0;
      const vat = parseFloat(data.pricing?.vat) || 0; 
      const discount = parseFloat(data.pricing?.discount) || 0;

      // Calculate price with profit
      let price = cost * (1 + (profit / 100));
      
      // Add VAT
      price = price * (1 + (vat / 100));
      
      // Apply discount
      price = price * (1 - (discount / 100));

      // Update calculated price state
      setCalculatedPrice(price);

      // Update data with calculated price
      onChange({
        ...data,
        pricing: {
          ...data.pricing,
          is_multi: false,
          total_price: price
        }
      });
    } else if (priceMode === 'cost') {
      const costsByCurrency = calculateTotalFromComponents('cost');
      const newMultiCurrencyPrices = {};
      let totalPrice = 0;
      // Calculate prices for each currency
      Object.entries(costsByCurrency.byCurrency).forEach(([currency, cost]) => {
        const profit = data.pricing?.profit || 0;
        const vat = data.pricing?.vat || 0;
        const discount = data.pricing?.discount || 0;

        let price = cost * (1 + (profit / 100));
        price = price * (1 + (vat / 100));
        price = price * (1 - (discount / 100));
        if(currency === data.pricing?.currency){
          totalPrice += price;
        }else{
          const rate = currencyRates[`${currency}_${data.pricing?.currency}`];
          totalPrice += price * (rate ? parseFloat(rate) : 0);
        }

        newMultiCurrencyPrices[currency] = {
          cost,
          price,
          currency
        };
      });

      setMultiCurrencyPrices(newMultiCurrencyPrices);
      onChange({
        ...data,
        pricing: {
          ...data.pricing,
          is_multi: true,
          multi_currency_prices: newMultiCurrencyPrices,
          total_price: totalPrice
        }
      });

    } else if (priceMode === 'price') {
      const costsByCurrency = calculateTotalFromComponents('cost');
      const pricesByCurrency = calculateTotalFromComponents('price');
      const meanVat = calculateMeanValue(data.components, 'vat');
      const meanProfit = calculateMeanValue(data.components, 'profit');
      const meanDiscount = calculateMeanValue(data.components, 'discount');
      

      // Apply price difference if enabled
      
      const newMultiCurrencyPrices = {};
      
      // Combine all unique currencies
      const currencies = [...new Set([
        ...Object.keys(costsByCurrency.byCurrency),
        ...Object.keys(pricesByCurrency.byCurrency)
      ])];

      currencies.forEach(currency => {
        newMultiCurrencyPrices[currency] = {
          cost: costsByCurrency.byCurrency[currency] || 0,
          price: pricesByCurrency.byCurrency[currency] || 0,
          currency
        };
      });

      setMultiCurrencyPrices(newMultiCurrencyPrices);
      onChange({
        ...data,
        pricing: {
          ...data.pricing,
          is_multi: true,
          cost: costsByCurrency.total,
          multi_currency_prices: newMultiCurrencyPrices,
          vat: meanVat,
          profit: meanProfit,
          discount: meanDiscount,
          total_price: pricesByCurrency.total
        }
      });
    }
  }, [data.components, data.pricing?.profit, data.pricing?.vat, data.pricing?.discount,data.pricing?.has_difference, data.pricing?.difference_value, data.pricing?.difference_type,data.pricing?.currency, priceMode]);

 
 

  const handlePriceChange = (field, value) => {
    onChange({
      ...data,
      pricing: {
        ...data.pricing,
        [field]: value
      }
    });
  };

  const handleModeChange = (mode) => {
    setPriceMode(mode);
    // Reset price difference settings when not in price mode
    if (mode !== 'price') {
      onChange({
        ...data,
        pricing: {
          ...data.pricing,
          mode: mode,
          has_difference: false,
          difference_type: 'discount',
          difference_value: 0
        }
      });
    } else {
      onChange({
        ...data,
        pricing: {
          ...data.pricing,
          mode: mode
        }
      });
    }
  };

  return (
    <div className="form-section">
      <h4>Pricing Settings</h4>

      <div className="form-group">
        <label>Price Calculation Mode</label>
        <div className="radio-group">
          <label>
            <input
              type="radio"
              value="manual"
              checked={priceMode === 'manual'}
              onChange={() => handleModeChange('manual')}
            />
            Manual (Set cost manually)
          </label>
          <label>
            <input
              type="radio"
              value="cost"
              checked={priceMode === 'cost'}
              onChange={() => handleModeChange('cost')}
            />
            Inherit Cost (Calculate from components cost)
          </label>
          <label>
            <input
              type="radio"
              value="price"
              checked={priceMode === 'price'}
              onChange={() => handleModeChange('price')}
            />
            Inherit Price (Sum of components prices)
          </label>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="cost">Cost*</label>
        <input
          id="cost"
          type="number"
          min="0"
          step="0.01"
          value={priceMode !== 'manual' ? calculateTotalFromComponents('cost').total : (data.pricing?.cost || '')}
          onChange={(e) => handlePriceChange('cost', parseFloat(e.target.value) || 0)}
          disabled={priceMode !== 'manual'}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="profit">Profit Margin (%)</label>
        <input
          id="profit"
          type="number"
          min="0"
          max="100"
          value={data.pricing?.profit || ''}
          onChange={(e) => handlePriceChange('profit', parseFloat(e.target.value) || 0)}
          disabled={priceMode === 'price'}
        />
      </div>

      <div className="form-group">
        <label htmlFor="vat">VAT (%)</label>
        <input
          id="vat"
          type="number"
          min="0"
          max="100"
          value={data.pricing?.vat || ''}
          onChange={(e) => handlePriceChange('vat', parseFloat(e.target.value) || 0)}
          disabled={priceMode === 'price'}
        />
      </div>

      <div className="form-group">
        <label htmlFor="discount">Discount (%)</label>
        <input
          id="discount"
          type="number"
          min="0"
          max="100"
          value={data.pricing?.discount || ''}
          onChange={(e) => handlePriceChange('discount', parseFloat(e.target.value) || 0)}
          disabled={priceMode === 'price'}
        />
      </div>

      <div className="form-group">
        <label htmlFor="currency">Currency*</label>
        <select
          id="currency"
          value={data.pricing?.currency || 'USD'}
          onChange={(e) => handlePriceChange('currency', e.target.value)}
          required
        >
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="TRY">TRY</option>
        </select>
      </div>

      <div className={`price-difference-section ${priceMode !== 'price' ? 'disabled' : ''}`}>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={priceMode === 'price' && (data.pricing?.has_difference || false)}
              onChange={(e) => handlePriceChange('has_difference', e.target.checked)}
              disabled={priceMode !== 'price'}
            />
            Apply Price Difference
          </label>
        </div>

        {priceMode === 'price' && data.pricing?.has_difference && (
          <>
            <div className="form-group">
              <label>Difference Type</label>
              <select
                value={data.pricing?.difference_type || 'discount'}
                onChange={(e) => handlePriceChange('difference_type', e.target.value)}
              >
                <option value="discount">Discount</option>
                <option value="markup">Markup</option>
              </select>
            </div>

            <div className="form-group">
              <label>Difference Percentage (%)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={data.pricing?.difference_value || ''}
                onChange={(e) => handlePriceChange('difference_value', parseFloat(e.target.value) || 0)}
              />
            </div>
          </>
        )}
      </div>

      <div className="calculation-breakdown">
        <h5>Price Calculation Breakdown:</h5>
        <ul>
          {priceMode === 'cost' && (
            <>
              <li>Components Cost by Currency:</li>
              {Object.entries(multiCurrencyPrices).map(([currency, values]) => (
                <li key={currency} className="currency-total">
                  <div className="price-details">
                    <span>Currency: {currency}</span>
                    <span>Cost: {values.cost.toFixed(2)}</span>
                    <span>Price: {values.price.toFixed(2)}</span>
                    {data.pricing?.profit > 0 && (
                      <span>Including Profit: {data.pricing.profit}%</span>
                    )}
                    {data.pricing?.vat > 0 && (
                      <span>Including VAT: {data.pricing.vat}%</span>
                    )}
                    {data.pricing?.discount > 0 && (
                      <span>Including Discount: {data.pricing.discount}%</span>
                    )}
                  </div>
                </li>
              ))}
              <li className="total-line">Total Cost in {data.pricing?.currency}: {parseFloat(data.pricing?.cost || 0).toFixed(2)}</li>
              <li className="total-line">Final Price in {data.pricing?.currency}: {parseFloat(data.pricing?.total_price || 0).toFixed(2)}</li>
            </>
          )}
          {priceMode === 'price' && (
            <>
              <li>Components Cost by Currency:</li>
              {Object.entries(multiCurrencyPrices).map(([currency, values]) => (
                <li key={`cost-${currency}`} className="currency-total">
                  {currency}: {values.cost.toFixed(2)}
                </li>
              ))}
              <li className="total-line">Total Cost in {data.pricing?.currency}: {parseFloat(data.pricing?.cost || 0).toFixed(2)}</li>
              <li>Components Price by Currency:</li>
              {Object.entries(multiCurrencyPrices).map(([currency, values]) => (
                <li key={`price-${currency}`} className="currency-total">
                  {currency}: {values.price.toFixed(2)}
                </li>
              ))}
              {data.pricing?.has_difference ? (
                <>
                  <li className="total-line">Base Price in {data.pricing?.currency}: {parseFloat(data.pricing?.base_price || 0).toFixed(2)}</li>
                  <li className="price-adjustment">
                    {data.pricing.difference_type === 'discount' ? '- ' : '+ '}
                    {data.pricing.difference_value}% 
                    ({data.pricing.difference_type === 'discount' ? 'Discount' : 'Markup'})
                  </li>
                  <li className="final-price">
                    = Final Price: {parseFloat(data.pricing?.total_price || 0).toFixed(2)} {data.pricing?.currency}
                  </li>
                </>
              ) : (
                <li className="total-line">Total Price in {data.pricing?.currency}: {parseFloat(data.pricing?.total_price || 0).toFixed(2)}</li>
              )}
            </>
          )}
          {priceMode === 'manual' && (
            <>
              <li>Base Cost: {parseFloat(data.pricing?.cost || 0).toFixed(2)} {data.pricing?.currency}</li>
              {data.pricing?.profit > 0 && (
                <li>+ Profit ({data.pricing?.profit}%)</li>
              )}
              {data.pricing?.vat > 0 && (
                <li>+ VAT ({data.pricing?.vat}%)</li>
              )}
              {data.pricing?.discount > 0 && (
                <li>- Discount ({data.pricing?.discount}%)</li>
              )}
              <li className="final-price">= Final Price: {parseFloat(data.pricing?.total_price || 0).toFixed(2)} {data.pricing?.currency}</li>
            </>
          )}
        </ul>
      </div>

      <style jsx>{`
        .radio-group {
          margin-bottom: 1rem;
        }
        .radio-group label {
          display: block;
          margin-bottom: 0.5rem;
        }
        .radio-group input[type="radio"] {
          margin-right: 0.5rem;
        }
        .calculation-breakdown {
          margin-top: 2rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 4px;
        }
        .calculation-breakdown h5 {
          margin-top: 0;
          color: #666;
        }
        .calculation-breakdown ul {
          list-style: none;
          padding: 0;
        }
        .calculation-breakdown li {
          padding: 0.5rem 0;
          border-bottom: 1px dashed #ddd;
        }
        .final-price {
          font-weight: bold;
          color: #2c3e50;
          border-bottom: none !important;
        }
        .total-line {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #ddd;
          font-weight: bold;
          color: #2c3e50;
        }
        .currency-total {
          padding-left: 1rem;
          color: #666;
          font-size: 0.9em;
        }
        .price-difference-section {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 4px;
          border: 1px solid #e9ecef;
        }
        .price-difference-section .form-group {
          margin-bottom: 0.5rem;
        }
        .price-difference-section label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .price-difference-section input[type="checkbox"] {
          margin: 0;
        }
        .price-difference-section.disabled {
          opacity: 0.5;
          pointer-events: none;
        }
        .price-adjustment {
          color: ${props => props.data?.pricing?.difference_type === 'discount' ? '#dc3545' : '#28a745'};
          font-weight: 500;
        }
      `}</style>
    </div>
  );
} 