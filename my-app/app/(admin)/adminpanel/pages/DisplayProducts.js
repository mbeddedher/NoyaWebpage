'use client';
import { useState, useEffect, useCallback } from 'react';
import DisplayContentLayout from '../layouts/DisplayContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';

export default function DisplayProducts() {
  const { getTabFormData, saveTabFormData, activeTabId, openTab } = useAdminTabs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Get saved form data or use initial state
  const formData = activeTabId ? getTabFormData(activeTabId) : {
    filters: {
      search: '',
      category: '',
      status: '',
      sortBy: 'name',
      sortOrder: 'asc'
    },
    pagination: {
      currentPage: 1,
      itemsPerPage: 10,
      totalItems: 0
    },
    products: []
  };

  // Initialize states from form data
  const [products, setProducts] = useState(formData.products);
  const [filters, setFilters] = useState(formData.filters);
  const [pagination, setPagination] = useState(formData.pagination);

  // Save form data whenever it changes
  useEffect(() => {
    if (activeTabId && !loading) {
      saveTabFormData(activeTabId, {
        filters,
        pagination,
        products
      });
    }
  }, [filters, pagination, products, activeTabId, loading, saveTabFormData]);

  const fetchProducts = useCallback(async () => {
    try {
      console.log('Fetching products with params:', {
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        filters
      });

      setLoading(true);
      const queryParams = new URLSearchParams({
        page: pagination.currentPage,
        limit: pagination.itemsPerPage,
        search: filters.search || '',
        category: filters.category || '',
        status: filters.status || '',
        sortBy: filters.sortBy || 'name',
        sortOrder: filters.sortOrder || 'asc'
      });

      const response = await fetch(`/api/products?${queryParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch products');
      }

      const data = await response.json();
      console.log('Received data:', data);

      if (!data || (!Array.isArray(data) && !Array.isArray(data.products))) {
        console.error('Invalid data format received:', data);
        throw new Error('Invalid data format received from server');
      }

      const productsList = Array.isArray(data) ? data : data.products || [];
      const totalItems = data.total || productsList.length || 0;

      console.log('Setting products:', productsList);
      setProducts(productsList);
      setPagination(prev => ({
        ...prev,
        totalItems
      }));
      setError(null);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage, filters]);

  useEffect(() => {
    console.log('Fetching products (mount or filters/pagination change)...');
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (searchTerm) => {
    console.log('Search term:', searchTerm);
    setFilters(prev => ({
      ...prev,
      search: searchTerm
    }));
    setPagination(prev => ({
      ...prev,
      currentPage: 1
    }));
  };

  const handleSort = (field, direction) => {
    console.log('Sorting:', field, direction);
    setFilters(prev => ({
      ...prev,
      sortBy: field,
      sortOrder: direction
    }));
  };

  const handleRowAction = async (action, item) => {
    switch (action) {
      case 'edit':
        if (item.is_crafted) {
          openTab({
            id: `edit-crafted-product-${item.id}`,
            label: `Edit: ${item.name}`,
            component: 'EditCraftedProduct',
            props: { productId: item.id }
          });
        } else {
          openTab({
            id: `edit-product-${item.id}`,
            label: `Edit: ${item.name}`,
            component: 'EditProduct',
            props: { productId: item.id }
          });
        }
        break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this product?')) {
          try {
            const response = await fetch(`/api/products/${item.id}`, {
              method: 'DELETE'
            });
            if (!response.ok) throw new Error('Failed to delete product');
            fetchProducts(); // Refresh the list
          } catch (error) {
            console.error('Error deleting product:', error);
            alert('Failed to delete product');
          }
        }
        break;
    }
  };

  const handleBulkAction = async (action, selectedIds) => {
    try {
      const response = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ids: selectedIds })
      });
      if (!response.ok) throw new Error(`Failed to ${action} products`);
      fetchProducts(); // Refresh the list
    } catch (error) {
      console.error(`Error performing bulk action:`, error);
      alert(`Failed to ${action} products`);
    }
  };

  // Column definitions for the table
  const columns = [
    { field: 'id', label: 'ID' },
    { field: 'name', label: 'Name' },
    { field: 'sku', label: 'SKU' },
    { field: 'brand', label: 'Brand' },
    { field: 'category', label: 'Category' },
    { field: 'supplier', label: 'Supplier' },
    { 
      field: 'is_active', 
      label: 'Status',
      render: (item) => item.is_active ? 'Active' : 'Inactive'
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

  return (
    <DisplayContentLayout
      title="Products"
      columns={columns}
      data={products}
      onSearch={handleSearch}
      onSort={handleSort}
      onRowAction={handleRowAction}
      onBulkAction={handleBulkAction}
      rowActions={rowActions}
      bulkActions={bulkActions}
      isLoading={loading}
    />
  );
} 