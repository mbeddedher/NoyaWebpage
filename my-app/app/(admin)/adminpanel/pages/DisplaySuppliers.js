'use client';
import { useState, useEffect } from 'react';
import DisplayContentLayout from '../layouts/DisplayContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';

export default function DisplaySuppliers() {
  const [suppliers, setSuppliers] = useState([]);
  const [displayedSuppliers, setDisplayedSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { openTab } = useAdminTabs();

  // Column definitions for the table
  const columns = [
    { field: 'id', label: 'ID' },
    { field: 'name', label: 'Supplier Name' },
    { field: 'contact_name', label: 'Contact Person' },
    { field: 'phone', label: 'Phone' },
    { field: 'email', label: 'Email' },
    { field: 'city', label: 'City' },
    { field: 'country', label: 'Country' }
  ];

  // Row actions
  const rowActions = [
    { label: '✏️', value: 'edit', className: 'edit-action' },
    { label: '🗑️', value: 'delete', className: 'delete-action' }
  ];

  // Bulk actions
  const bulkActions = [
    { label: 'Delete Selected', value: 'delete' }
  ];

  // Fetch suppliers only once on mount
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const response = await fetch('/api/suppliers');
        if (!response.ok) throw new Error('Failed to fetch suppliers');
        const data = await response.json();
        setSuppliers(data);
        setDisplayedSuppliers(data);
      } catch (error) {
        console.error('Error fetching suppliers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, []);

  // Handle search input change
  const handleSearchInputChange = (query) => {
    setSearchQuery(query);
  };

  // Handle search button click
  const handleSearchClick = () => {
    if (!searchQuery.trim()) {
      setDisplayedSuppliers(suppliers);
      return;
    }
    
    const filtered = suppliers.filter(supplier => 
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (supplier.contact_name && supplier.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (supplier.email && supplier.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setDisplayedSuppliers(filtered);
  };

  // Handle sort locally
  const handleSort = (field, direction) => {
    const sorted = [...displayedSuppliers].sort((a, b) => {
      const aValue = a[field] || '';
      const bValue = b[field] || '';
      if (direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      }
      return aValue < bValue ? 1 : -1;
    });
    setDisplayedSuppliers(sorted);
  };

  // Delete supplier
  const deleteSupplier = async (supplierId) => {
    try {
      const response = await fetch(`/api/suppliers/${supplierId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete supplier');

      // Update state after successful deletion
      const updatedSuppliers = suppliers.filter(s => s.id !== supplierId);
      setSuppliers(updatedSuppliers);
      setDisplayedSuppliers(updatedSuppliers);
    } catch (error) {
      console.error('Error deleting supplier:', error);
      alert('Failed to delete supplier. Please try again.');
    }
  };

  // Handle row action
  const handleRowAction = async (action, item) => {
    switch (action) {
      case 'edit':
        openTab({
          id: `edit-supplier-${item.id}`,
          label: `Edit Supplier: ${item.name}`,
          component: 'EditSupplier',
          props: { supplierId: item.id }
        });
        break;
      case 'delete':
        if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;
        await deleteSupplier(item.id);
        break;
    }
  };

  // Handle bulk action
  const handleBulkAction = async (action, selectedIds) => {
    switch (action) {
      case 'delete':
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} suppliers?`)) return;
        try {
          for (const id of selectedIds) {
            await deleteSupplier(id);
          }
        } catch (error) {
          console.error('Error deleting suppliers:', error);
          alert('Failed to delete some suppliers. Please try again.');
        }
        break;
    }
  };

  return (
    <DisplayContentLayout
      title="Suppliers"
      columns={columns}
      data={displayedSuppliers}
      onSearch={handleSearchInputChange}
      onSearchButtonClick={handleSearchClick}
      searchValue={searchQuery}
      onSort={handleSort}
      onRowAction={handleRowAction}
      onBulkAction={handleBulkAction}
      rowActions={rowActions}
      bulkActions={bulkActions}
      showSearchButton={true}
    />
  );
} 