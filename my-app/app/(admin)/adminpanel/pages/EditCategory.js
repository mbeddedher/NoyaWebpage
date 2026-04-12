'use client';
import { useState, useEffect, useCallback } from 'react';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';
import { CategoryDetails } from './AddCategory';

export default function EditCategory({ categoryId }) {
  const { closeTab, activeTabId, getTabFormData, saveTabFormData } = useAdminTabs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSection, setCurrentSection] = useState('details');

  // Get saved form data for this specific category
  const formDataKey = `edit-category-${categoryId}`;
  const formData = activeTabId ? getTabFormData(formDataKey) : {
    categoryData: null,
    originalData: null,
    currentSection: 'details'
  };

  const [categoryData, setCategoryData] = useState(formData.categoryData);
  const [originalData, setOriginalData] = useState(formData.originalData);

  const fetchCategoryData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/categories/${categoryId}`);
      if (!response.ok) throw new Error('Failed to fetch category');
      const { rows } = await response.json();
      if (!rows || rows.length === 0) {
        throw new Error('Category not found');
      }
      const data = rows[0];
      console.log('Fetched Data', data);
      setCategoryData(data);
      setOriginalData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchCategoryData();
  }, [fetchCategoryData]);

  // Save form data whenever it changes
  useEffect(() => {
    if (activeTabId && !loading && categoryData) {
      saveTabFormData(formDataKey, {
        categoryData,
        originalData,
        currentSection
      });
    }
  }, [categoryData, originalData, currentSection, activeTabId, loading, formDataKey, saveTabFormData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);

      // Validate required fields
      if (!categoryData.name) {
        alert('Category name is required');
        return;
      }

      const response = await fetch(`/api/categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });

      if (!response.ok) {
        throw new Error('Failed to update category');
      }

      const result = await response.json();
      setOriginalData(result);
      alert('Category updated successfully!');
      closeTab(`edit-category-${categoryId}`);
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const hasChanges = JSON.stringify(categoryData) !== JSON.stringify(originalData);
    if (!hasChanges || window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
      closeTab(`edit-category-${categoryId}`);
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  return (
    <AddContentLayout
      title="Edit Category"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitButtonText="Save Changes"
      isLoading={loading}
    >
      <CategoryDetails 
        data={categoryData} 
        onChange={setCategoryData}
        refreshTrigger={0}
      />
    </AddContentLayout>
  );
} 