'use client';
import { useState, useEffect } from 'react';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';

export default function EditSupplier({ supplierId }) {
  const { closeTab, updateTabLabel } = useAdminTabs();
  const [supplierData, setSupplierData] = useState({
    name: '',
    contact_name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isModified, setIsModified] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/suppliers/${supplierId}`);
        if (!response.ok) {
          if (response.status === 404) {
            alert('This supplier has been deleted');
            closeTab(`edit-supplier-${supplierId}`);
            return;
          }
          throw new Error('Failed to fetch supplier');
        }
        const data = await response.json();
        setSupplierData(data);
        setOriginalData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching supplier:', error);
        alert('Failed to fetch supplier details');
      }
    };

    fetchData();
  }, [supplierId]);

  // Check for modifications
  useEffect(() => {
    if (originalData) {
      const hasChanges = Object.keys(supplierData).some(key => supplierData[key] !== originalData[key]);
      setIsModified(hasChanges);
      
      // Update tab label with * for modifications
      const newLabel = `Edit Supplier - ${supplierData.name}${hasChanges ? ' *' : ''}`;
      updateTabLabel(`edit-supplier-${supplierId}`, newLabel);
    }
  }, [supplierData, originalData, supplierId]);

  const handleSubmit = async () => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(supplierData)
      });

      if (!response.ok) {
        throw new Error('Failed to update supplier');
      }

      setOriginalData(supplierData);
      alert('Supplier updated successfully!');
      closeTab(`edit-supplier-${supplierId}`);
    } catch (error) {
      console.error('Error updating supplier:', error);
      alert('Failed to update supplier. Please try again.');
    }
  };

  const handleCancel = () => {
    if (!isModified || window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
      closeTab(`edit-supplier-${supplierId}`);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AddContentLayout
      title="Edit Supplier"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitButtonText="Save Changes"
    >
      <div className="form-section">
        <div className="form-group">
          <label htmlFor="name">Supplier Name*</label>
          <input
            id="name"
            type="text"
            value={supplierData.name || ''}
            onChange={(e) => setSupplierData({ ...supplierData, name: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="contact_name">Contact Person</label>
          <input
            id="contact_name"
            type="text"
            value={supplierData.contact_name || ''}
            onChange={(e) => setSupplierData({ ...supplierData, contact_name: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={supplierData.email || ''}
            onChange={(e) => setSupplierData({ ...supplierData, email: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            type="tel"
            value={supplierData.phone || ''}
            onChange={(e) => setSupplierData({ ...supplierData, phone: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            value={supplierData.address || ''}
            onChange={(e) => setSupplierData({ ...supplierData, address: e.target.value })}
          />
        </div>
      </div>
    </AddContentLayout>
  );
} 