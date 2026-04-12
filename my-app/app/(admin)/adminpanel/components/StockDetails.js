'use client';
import { useState } from 'react';

export default function StockDetails({ data, onChange }) {
  const arrivalTypes = [
    { value: 'interval', label: 'Interval' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'specific_date', label: 'Specific Date' },
    { value: 'inherited', label: 'Inherited' },
    { value: 'unknown', label: 'Unknown' }
  ];

  const weekDays = [
    { value: 'monday', label: 'Monday' },
    { value: 'tuesday', label: 'Tuesday' },
    { value: 'wednesday', label: 'Wednesday' },
    { value: 'thursday', label: 'Thursday' },
    { value: 'friday', label: 'Friday' },
    { value: 'saturday', label: 'Saturday' },
    { value: 'sunday', label: 'Sunday' }
  ];

  const handleArrivalValueChange = (value, type) => {
    switch (type) {
      case 'monthly':
        // Ensure value is between 1 and 30
        const monthDay = parseInt(value);
        if (monthDay >= 1 && monthDay <= 30) {
          onChange({ ...data, arrival_day_of_month: value });
        }
        break;
      case 'interval':
        // Ensure value is positive
        const interval = parseInt(value);
        if (interval > 0) {
          onChange({ ...data, arrival_interval: value });
        }
        break;
      default:
        // For date and weekly, pass the value directly
        onChange({ 
          ...data, 
          [type === 'date' ? 'arrival_date' : 'arrival_day']: value 
        });
    }
  };

  return (
    <div className="form-section">
      <h4>Stock Settings</h4>
      <div className="form-group">
        <label htmlFor="stock_status">Stock Status*</label>
        <select
          id="stock_status"
          value={data.stock_status || 'limited'}
          onChange={(e) => onChange({ ...data, stock_status: e.target.value })}
          required
        >
          <option value="limited">Limited</option>
          <option value="unlimited">Unlimited</option>
          <option value="locked">Locked</option>
          <option value="infinite">Infinite</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="unit">Unit*</label>
        <select
          id="unit"
          value={data.unit || ''}
          onChange={(e) => onChange({ ...data, unit: e.target.value })}
          required
        >
          <option value="">Select Unit</option>
          <option value="piece">Piece</option>
          <option value="box">Box</option>
          <option value="pack">Pack</option>
          <option value="kg">Kilogram</option>
          <option value="g">Gram</option>
          <option value="l">Liter</option>
          <option value="ml">Milliliter</option>
          <option value="m">Meter</option>
          <option value="cm">Centimeter</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="min_stock">Minimum Stock Level</label>
        <input
          id="min_stock"
          type="number"
          min="0"
          value={data.min_stock || ''}
          onChange={(e) => onChange({ ...data, min_stock: parseInt(e.target.value) })}
          placeholder="Enter minimum stock level"
        />
      </div>

      {data.stock_status === 'unlimited' && (
        <>
          <div className="form-group">
            <label htmlFor="arrival_type">Arrival Type*</label>
            <select
              id="arrival_type"
              value={data.arrival_type || 'unknown'}
              onChange={(e) => onChange({ ...data, arrival_type: e.target.value })}
              required
            >
              {arrivalTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {data.arrival_type === 'weekly' && (
            <div className="form-group">
              <label htmlFor="arrival_day">Arrival Day*</label>
              <select
                id="arrival_day"
                value={data.arrival_day || ''}
                onChange={(e) => handleArrivalValueChange(e.target.value, 'weekly')}
                required
              >
                <option value="">Select Day</option>
                {weekDays.map(day => (
                  <option key={day.value} value={day.value}>
                    {day.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {data.arrival_type === 'monthly' && (
            <div className="form-group">
              <label htmlFor="arrival_day_of_month">Day of Month*</label>
              <input
                id="arrival_day_of_month"
                type="number"
                min="1"
                max="30"
                value={data.arrival_day_of_month || ''}
                onChange={(e) => handleArrivalValueChange(e.target.value, 'monthly')}
                required
                placeholder="Enter day (1-30)"
              />
            </div>
          )}

          {data.arrival_type === 'interval' && (
            <div className="form-group">
              <label htmlFor="arrival_interval">Interval Days*</label>
              <input
                id="arrival_interval"
                type="number"
                min="1"
                value={data.arrival_interval || ''}
                onChange={(e) => handleArrivalValueChange(e.target.value, 'interval')}
                required
                placeholder="Enter interval in days"
              />
            </div>
          )}

          {data.arrival_type === 'specific_date' && (
            <div className="form-group">
              <label htmlFor="arrival_date">Arrival Date*</label>
              <input
                id="arrival_date"
                type="date"
                value={data.arrival_date || ''}
                onChange={(e) => handleArrivalValueChange(e.target.value, 'specific_date')}
                required
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
} 