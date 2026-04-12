'use client';
import { useState, useEffect } from 'react';
import DisplayContentLayout from '../layouts/DisplayContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';

// Recursive component for hierarchical view
function CategoryTree({ categories, category, level = 0, onAction }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const children = categories.filter(c => c.parent_id === category.id);
  const hasChildren = children.length > 0;
  
  return (
    <div className="category-tree-item" style={{ marginLeft: `${level * 24}px` }}>
      <div className="category-tree-content">
        <div className="category-tree-header">
          {hasChildren && (
            <button 
              className="expand-button"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? '▼' : '▶'}
            </button>
          )}
          <span className="category-name">{category.name}</span>
        </div>
        <div className="category-actions">
          <button
            onClick={() => onAction('edit', category)}
            className="button-icon edit-action"
          >
            ✏️
          </button>
          <button
            onClick={() => onAction('delete', category)}
            className="button-icon delete-action"
          >
            🗑️
          </button>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="category-children">
          {children.map(child => (
            <CategoryTree
              key={child.id}
              categories={categories}
              category={child}
              level={level + 1}
              onAction={onAction}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DisplayCategories() {
  const [categories, setCategories] = useState([]);
  const [displayedCategories, setDisplayedCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [displayType, setDisplayType] = useState('table');
  const { openTab, setActiveTabId, tabs } = useAdminTabs();

  // Column definitions for the table
  const columns = [
    { field: 'id', label: 'ID' },
    { field: 'name', label: 'Name' },
    { field: 'description', label: 'Description' },
    { 
      field: 'parent_id', 
      label: 'Parent Category',
      render: (item) => {
        const parent = categories.find(c => c.id === item.parent_id);
        return parent ? parent.name : 'None';
      }
    }
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

  // Fetch categories only once on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch('/api/categories');
        if (!response.ok) throw new Error('Failed to fetch categories');
        const data = await response.json();
        setCategories(data);
        setDisplayedCategories(data);
      } catch (error) {
        console.error('Error fetching categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Handle search input change
  const handleSearchInputChange = (query) => {
    setSearchQuery(query);
  };

  // Handle search button click
  const handleSearchClick = () => {
    if (!searchQuery.trim()) {
      setDisplayedCategories(categories);
      return;
    }
    
    const filtered = categories.filter(category => 
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (category.description && category.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    setDisplayedCategories(filtered);
  };

  // Handle sort locally
  const handleSort = (field, direction) => {
    const sorted = [...displayedCategories].sort((a, b) => {
      if (direction === 'asc') {
        return a[field] > b[field] ? 1 : -1;
      }
      return a[field] < b[field] ? 1 : -1;
    });
    setDisplayedCategories(sorted);
  };

  // Delete category and its children recursively
  const deleteCategory = async (categoryId) => {
    try {
      // Get all child categories recursively
      const getAllChildIds = (parentId) => {
        const children = categories.filter(c => c.parent_id === parentId);
        let childIds = [parentId];
        children.forEach(child => {
          childIds = [...childIds, ...getAllChildIds(child.id)];
        });
        return childIds;
      };

      const idsToDelete = getAllChildIds(categoryId);
      
      // Delete categories one by one
      for (const id of idsToDelete) {
        const response = await fetch(`/api/categories/${id}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || `Failed to delete category ${id}`);
        }
      }

      // Update state after successful deletion
      const updatedCategories = categories.filter(c => !idsToDelete.includes(c.id));
      setCategories(updatedCategories);
      setDisplayedCategories(updatedCategories);
    } catch (error) {
      console.error('Error deleting category:', error);
      alert(error.message || 'Failed to delete category. Please try again.');
    }
  };

  // Handle row action
  const handleRowAction = async (action, item) => {
    switch (action) {
      case 'edit':
        const tabId = `edit-category-${item.id}`;
        // Check if tab already exists
        const existingTab = tabs.find(tab => tab.id === tabId);
        if (existingTab) {
          // If tab exists, just activate it without recreating
          setActiveTabId(tabId);
          return; // Important: return here to prevent any further processing
        }
        // If tab doesn't exist, create a new one
        openTab({
          id: tabId,
          label: `Edit: ${item.name}`,
          component: 'EditCategory',
          props: { categoryId: item.id }
        });
        break;
      case 'delete':
        if (!confirm(`Are you sure you want to delete "${item.name}" and all its subcategories?`)) return;
        await deleteCategory(item.id);
        break;
    }
  };

  // Handle bulk action
  const handleBulkAction = async (action, selectedIds) => {
    switch (action) {
      case 'delete':
        if (!confirm(`Are you sure you want to delete ${selectedIds.length} categories and their subcategories?`)) return;
        try {
          // Get all child categories for selected categories
          const getAllChildIds = (ids) => {
            let allIds = [...ids];
            ids.forEach(id => {
              const children = categories.filter(c => c.parent_id === id);
              children.forEach(child => {
                const childIds = getAllChildIds([child.id]);
                allIds = [...allIds, ...childIds];
              });
            });
            return [...new Set(allIds)]; // Remove duplicates
          };

          const idsToDelete = getAllChildIds(selectedIds);

          // Delete categories one by one
          for (const id of idsToDelete) {
            const response = await fetch(`/api/categories/${id}`, {
              method: 'DELETE'
            });
            if (!response.ok) {
              const data = await response.json().catch(() => ({}));
              throw new Error(data.error || `Failed to delete category ${id}`);
            }
          }

          const updatedCategories = categories.filter(c => !idsToDelete.includes(c.id));
          setCategories(updatedCategories);
          setDisplayedCategories(updatedCategories);
        } catch (error) {
          console.error('Error deleting categories:', error);
          alert(error.message || 'Failed to delete categories. Please try again.');
        }
        break;
    }
  };

  // Render hierarchical view
  const renderHierarchicalView = () => {
    const rootCategories = displayedCategories.filter(c => !c.parent_id);
    
    return (
      <div className="hierarchical-view">
        {rootCategories.map(category => (
          <CategoryTree
            key={category.id}
            categories={displayedCategories}
            category={category}
            onAction={handleRowAction}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="categories-display">
      <div className="display-type-switch">
        <button
          className={`switch-button ${displayType === 'table' ? 'active' : ''}`}
          onClick={() => setDisplayType('table')}
        >
          Table View
        </button>
        <button
          className={`switch-button ${displayType === 'tree' ? 'active' : ''}`}
          onClick={() => setDisplayType('tree')}
        >
          Tree View
        </button>
      </div>

      {displayType === 'table' ? (
        <DisplayContentLayout
          title="Categories"
          columns={columns}
          data={displayedCategories}
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
      ) : (
        <div className="tree-container">
          <div className="tree-header">
            <h2>Categories</h2>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
              />
              <button 
                className="button button-primary search-button"
                onClick={handleSearchClick}
              >
                Search
              </button>
            </div>
          </div>
          {renderHierarchicalView()}
        </div>
      )}
    </div>
  );
} 