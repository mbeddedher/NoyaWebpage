'use client';
import { useState, useEffect } from 'react';
import DisplayContentLayout from '../layouts/DisplayContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';

export default function DisplayProductDisplays() {
  const [displays, setDisplays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { openTab } = useAdminTabs();

  // Column definitions for the table
  const columns = [
    { field: 'id', label: 'ID' },
    { field: 'name', label: 'Name' },
    { 
      field: 'status', 
      label: 'Status',
      render: (item) => item.status === 'active' ? 'Active' : 'Inactive'
    },
    { field: 'ranking', label: 'Ranking' },
    { 
      field: 'has_variants', 
      label: 'Has Variants',
      render: (item) => item.has_variants ? 'Yes' : 'No'
    },
    { 
      field: 'popularity_score', 
      label: 'Popularity',
      render: (item) => item.popularity_score.toFixed(2)
    },
    { 
      field: 'created_at', 
      label: 'Created At',
      render: (item) => new Date(item.created_at).toLocaleDateString()
    }
  ];

  // Row actions
  const rowActions = [
    { label: '✏️', value: 'edit', className: 'edit-action' },
    { label: '🗑️', value: 'delete', className: 'delete-action' }
  ];

  // Bulk actions
  const bulkActions = [
    { label: 'Delete Selected', value: 'delete' },
    { label: 'Activate Selected', value: 'activate' },
    { label: 'Deactivate Selected', value: 'deactivate' }
  ];

  // Fetch product displays
  useEffect(() => {
    const fetchDisplays = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/product-displays');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Failed to fetch product displays: ${response.statusText}`);
        }
        
        const data = await response.json();
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format received from server');
        }
        
        setDisplays(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching product displays:', error);
        setError(error.message);
        setDisplays([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDisplays();
  }, []);

  // Handle search
  const handleSearch = async (query) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/product-displays?search=${encodeURIComponent(query)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to search product displays');
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received from server');
      }
      
      setDisplays(data);
      setError(null);
    } catch (error) {
      console.error('Error searching product displays:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle sort
  const handleSort = async (field, direction) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/product-displays?sort=${field}&direction=${direction}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sort product displays');
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) {
        throw new Error('Invalid data format received from server');
      }
      
      setDisplays(data);
      setError(null);
    } catch (error) {
      console.error('Error sorting product displays:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle row action
  const handleRowAction = async (action, item) => {
    switch (action) {
      case 'edit':
        openTab({
          id: 'edit-product-display',
          label: `Edit: ${item.name}`,
          component: 'EditProductDisplay',
          props: { id: item.id }
        });
        break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this product display?')) {
          try {
            const response = await fetch(`/api/product-displays/${item.id}`, {
              method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete product display');
            setDisplays(displays.filter(d => d.id !== item.id));
          } catch (error) {
            console.error('Error deleting product display:', error);
          }
        }
        break;
    }
  };

  // Handle bulk action
  const handleBulkAction = async (action, selectedIds) => {
    try {
      const response = await fetch('/api/product-displays/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          ids: selectedIds
        })
      });

      if (!response.ok) throw new Error('Failed to perform bulk action');
      
      // Refresh the displays list
      const updatedResponse = await fetch('/api/product-displays');
      if (!updatedResponse.ok) throw new Error('Failed to fetch updated product displays');
      const data = await updatedResponse.json();
      setDisplays(data);
    } catch (error) {
      console.error('Error performing bulk action:', error);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading product displays...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>Error: {error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <DisplayContentLayout
      title="Product Displays"
      columns={columns}
      data={displays}
      onSearch={handleSearch}
      onSort={handleSort}
      onRowAction={handleRowAction}
      onBulkAction={handleBulkAction}
      rowActions={rowActions}
      bulkActions={bulkActions}
    />
  );
} 