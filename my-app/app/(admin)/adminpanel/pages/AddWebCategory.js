'use client';
import { useState, useEffect } from 'react';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';

function CategoryForm({ data, onChange, refreshTrigger }) {
  const [categories, setCategories] = useState([]);
  const [error, setError] = useState(null);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/web-categories');
      if (!response.ok) {
        throw new Error('Failed to fetch categories');
      }
      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError(error.message);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [refreshTrigger]);

  // Filter out the current category and its children from parent options
  const getValidParentOptions = () => {
    if (!data.id) return categories;

    const getChildIds = (parentId) => {
      const children = categories.filter(c => c.parent_id === parentId);
      let childIds = [parentId];
      children.forEach(child => {
        childIds = [...childIds, ...getChildIds(child.id)];
      });
      return childIds;
    };

    const invalidIds = getChildIds(data.id);
    return categories.filter(category => !invalidIds.includes(category.id));
  };

  // Build hierarchical category structure
  const buildCategoryHierarchy = (parentId = null, level = 0) => {
    const validOptions = getValidParentOptions();
    return validOptions
      .filter(category => category.parent_id === parentId)
      .map(category => ({
        ...category,
        level,
        children: buildCategoryHierarchy(category.id, level + 1)
      }));
  };

  // Flatten hierarchical structure for select options
  const flattenCategoryHierarchy = (hierarchy) => {
    return hierarchy.reduce((flat, category) => {
      return [
        ...flat,
        {
          ...category,
          displayName: '─'.repeat(category.level) + (category.level > 0 ? ' ' : '') + category.name
        },
        ...flattenCategoryHierarchy(category.children)
      ];
    }, []);
  };

  const hierarchicalCategories = buildCategoryHierarchy();
  const flattenedCategories = flattenCategoryHierarchy(hierarchicalCategories);

  return (
    <div className="form-section">
      <h4>Category Information</h4>
      {error && <div className="error-message">{error}</div>}
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
      <div className="form-group">
        <label htmlFor="parent_id">Parent Category</label>
        <select
          id="parent_id"
          value={data.parent_id || ''}
          onChange={(e) => onChange({ ...data, parent_id: e.target.value ? Number(e.target.value) : null })}
          style={{ fontFamily: 'monospace' }}
        >
          <option value="">None (Root Category)</option>
          {flattenedCategories.map(category => (
            <option key={category.id} value={category.id}>
              {category.displayName}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export { CategoryForm };

export default function AddWebCategory() {
  const { closeTab, activeTabId, getTabFormData, saveTabFormData } = useAdminTabs();
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const initialFormState = {
    name: '',
    description: '',
    parent_id: '',
    is_active: true,
    slug: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    display_order: 0,
    icon: '',
    banner_image: '',
    featured: false
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
  }, [categoryData, activeTabId, loading, saveTabFormData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (!categoryData.name) {
        throw new Error('Category name is required');
      }

      const response = await fetch('/api/web-categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create category');
      }

      const result = await response.json();
      alert('Web category created successfully!');
      
      // Reset form and refresh categories
      setCategoryData({
        name: '',
        description: '',
        parent_id: null
      });
      
      // Trigger refresh of categories
      setRefreshTrigger(prev => prev + 1);
      
      closeTab('add-web-category');
    } catch (error) {
      console.error('Error creating web category:', error);
      alert(error.message || 'An error occurred while creating the web category');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AddContentLayout 
      title="Add New Web Category"
      onSubmit={handleSubmit}
      isLoading={loading}
      submitButtonText="Create Web Category"
      onCancel={() => closeTab('add-web-category')}
    >
      <CategoryForm 
        data={categoryData} 
        onChange={setCategoryData}
        refreshTrigger={refreshTrigger}
      />
    </AddContentLayout>
  );
} 