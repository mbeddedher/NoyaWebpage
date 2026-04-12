'use client';
import { useState, useEffect } from 'react';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';

// Recursive function to build category options with proper indentation
function buildCategoryOptions(categories, parentId = null, level = 0) {
  const indent = '\u00A0'.repeat(level * 4); // Non-breaking spaces for indentation
  const options = [];

  // Get categories at current level
  const levelCategories = categories.filter(c => c.parent_id === parentId);

  // Add each category and its children recursively
  levelCategories.forEach(category => {
    options.push({
      id: category.id,
      name: `${indent}${category.name}`,
      disabled: false
    });

    // Add children recursively
    const childOptions = buildCategoryOptions(categories, category.id, level + 1);
    options.push(...childOptions);
  });

  return options;
}

// Category Details Component
export function CategoryDetails({ data, onChange, refreshTrigger }) {
  const [categories, setCategories] = useState([]);
  const [categoryOptions, setCategoryOptions] = useState([]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      const data = await response.json();
      setCategories(data);
      
      // Build hierarchical options
      const options = buildCategoryOptions(data);
      setCategoryOptions(options);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch categories on mount and when refreshTrigger changes
  useEffect(() => {
    fetchCategories();
  }, [refreshTrigger]);

  return (
    <>
      {/* Basic Info Section */}
      <div className="form-section">
        <h4>Basic Information</h4>
        <div className="form-group">
          <label htmlFor="name">Category Name*</label>
          <input
            id="name"
            type="text"
            value={data.name || ''}
            onChange={(e) => onChange({ ...data, name: e.target.value })}
            required
            placeholder="Enter category name"
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={data.description || ''}
            onChange={(e) => onChange({ ...data, description: e.target.value })}
            placeholder="Enter category description"
            rows={4}
          />
        </div>
      </div>

      {/* Parent Category Section */}
      <div className="form-section">
        <h4>Parent Category</h4>
        <div className="form-group">
          <label htmlFor="parent_id">Parent Category</label>
          <select
            id="parent_id"
            value={data.parent_id || ''}
            onChange={(e) => onChange({ ...data, parent_id: e.target.value ? Number(e.target.value) : null })}
            className="hierarchical-select"
          >
            <option value="">No Parent (Top Level Category)</option>
            {categoryOptions.map(option => (
              <option 
                key={option.id} 
                value={option.id}
                disabled={option.id === data.id}
              >
                {option.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </>
  );
}

export default function AddCategory() {
  const { closeTab, activeTabId, getTabFormData, saveTabFormData } = useAdminTabs();
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const initialFormState = {
    name: '',
    description: '',
    parent_id: '',
    is_active: true,
    type: 'product',
    attributes: [],
    display_order: 0,
    icon: '',
    image: '',
    tax_rate: 0,
    minimum_stock: 0,
    maximum_stock: 100
  };

  // Get saved form data or use initial state
  const formData = activeTabId ? getTabFormData(activeTabId) : {
    categoryData: initialFormState
  };

  const [categoryData, setCategoryData] = useState(formData.categoryData || initialFormState);

  // Save form data whenever it changes
  useEffect(() => {
    if (activeTabId && !loading) {
      saveTabFormData(activeTabId, {
        categoryData
      });
    }
  }, [categoryData, activeTabId, loading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Validate required fields
      if (!categoryData.name) {
        alert('Category name is required');
        return;
      }

      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });

      if (!response.ok) {
        throw new Error('Failed to create category');
      }

      const result = await response.json();
      console.log('Category created successfully:', result);
      
      // Reset form after successful submission
      setCategoryData(initialFormState);
      
      // Trigger a refresh of the categories list
      setRefreshTrigger(prev => prev + 1);

      alert('Category added successfully!');
      
      // Small delay to ensure the refresh completes before closing
      await new Promise(resolve => setTimeout(resolve, 100));
      closeTab('add-category');
    } catch (error) {
      console.error('Error adding category:', error);
      alert('Failed to add category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddContentLayout 
      title="Add New Category"
      onSubmit={handleSubmit}
      isLoading={loading}
      submitButtonText="Add Category"
      onCancel={() => closeTab('add-category')}
    >
      <CategoryDetails 
        data={categoryData} 
        onChange={setCategoryData}
        refreshTrigger={refreshTrigger}
      />
    </AddContentLayout>
  );
} 