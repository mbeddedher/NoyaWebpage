'use client';
import { useState } from 'react';

export default function PackageOptions({ data, onChange }) {
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
                onChange={(e) => updatePackageOption(index, 'count', parseInt(e.target.value))}
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
                onChange={(e) => updatePackageOption(index, 'discount', parseFloat(e.target.value))}
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
              className="button button-danger"
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