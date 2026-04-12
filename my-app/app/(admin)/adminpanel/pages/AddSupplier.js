'use client';
import { useState, useEffect } from 'react';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';

// Supplier Details Component
function SupplierDetails({ data, onChange }) {
  return (
    <>
      {/* Basic Info Section */}
      <div className="form-section">
        <h4>Basic Information</h4>
        <div className="form-group">
          <label htmlFor="name">Supplier Name*</label>
          <input
            id="name"
            type="text"
            value={data.name || ''}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            required
            placeholder="Enter supplier name"
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label htmlFor="contact_name">Contact Person</label>
          <input
            id="contact_name"
            type="text"
            value={data.contact_name || ''}
            onChange={(e) => onChange({ ...data, contact_name: e.target.value })}
            placeholder="Enter contact person name"
            className="form-control"
          />
        </div>
      </div>

      {/* Contact Information Section */}
      <div className="form-section">
        <h4>Contact Information</h4>
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            id="phone"
            type="tel"
            value={data.phone || ''}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
            placeholder="Enter phone number"
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            value={data.email || ''}
            onChange={(e) => onChange({ ...data, email: e.target.value })}
            placeholder="Enter email address"
            className="form-control"
          />
        </div>
        <div className="form-group">
          <label htmlFor="website">Website</label>
          <input
            id="website"
            type="url"
            value={data.website || ''}
            onChange={(e) => onChange({ ...data, website: e.target.value })}
            placeholder="Enter website URL"
            className="form-control"
          />
        </div>
      </div>

      {/* Address Section */}
      <div className="form-section">
        <h4>Address Information</h4>
        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            value={data.address || ''}
            onChange={(e) => onChange({ ...data, address: e.target.value })}
            placeholder="Enter full address"
            rows={3}
            className="form-control"
          />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="city">City</label>
            <input
              id="city"
              type="text"
              value={data.city || ''}
              onChange={(e) => onChange({ ...data, city: e.target.value })}
              placeholder="Enter city"
              className="form-control"
            />
          </div>
          <div className="form-group">
            <label htmlFor="postal_code">Postal Code</label>
            <input
              id="postal_code"
              type="text"
              value={data.postal_code || ''}
              onChange={(e) => onChange({ ...data, postal_code: e.target.value })}
              placeholder="Enter postal code"
              className="form-control"
            />
          </div>
        </div>
        <div className="form-group">
          <label htmlFor="country">Country</label>
          <input
            id="country"
            type="text"
            value={data.country || ''}
            onChange={(e) => onChange({ ...data, country: e.target.value })}
            placeholder="Enter country"
            className="form-control"
          />
        </div>
      </div>
    </>
  );
}

export default function AddSupplier() {
  const [loading, setLoading] = useState(false);
  const { closeTab, activeTabId, getTabFormData, saveTabFormData } = useAdminTabs();
  const initialFormState = {
    name: '',
    contact_name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    country: '',
    postal_code: '',
    website: ''
  };

  // Get saved form data or use initial state
  const formData = activeTabId ? getTabFormData(activeTabId) : {
    supplierData: initialFormState
  };

  const [supplierData, setSupplierData] = useState(formData.supplierData || initialFormState);

  // Save form data whenever it changes
  useEffect(() => {
    if (activeTabId && !loading) {
      saveTabFormData(activeTabId, {
        supplierData
      });
    }
  }, [supplierData, activeTabId, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      // Validate required fields
      if (!supplierData.name) {
        alert('Supplier name is required');
        return;
      }

      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierData)
      });

      if (!response.ok) {
        throw new Error('Failed to create supplier');
      }

      const result = await response.json();
      console.log('Supplier created successfully:', result);
      
      // Reset form after successful submission
      setSupplierData(initialFormState);
      alert('Supplier added successfully!');
      closeTab('add-supplier');
    } catch (error) {
      console.error('Error adding supplier:', error);
      alert('Failed to add supplier. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddContentLayout 
      title="Add New Supplier"
      onSubmit={handleSubmit}
      isLoading={loading}
      submitButtonText="Add Supplier"
      onCancel={() => closeTab('add-supplier')}
    >
      <SupplierDetails data={supplierData} onChange={setSupplierData} />
    </AddContentLayout>
  );
} 