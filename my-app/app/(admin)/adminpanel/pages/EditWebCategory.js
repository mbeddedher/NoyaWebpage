'use client';
import { useState, useEffect, useCallback } from 'react';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';
import { CategoryForm } from './AddWebCategory';

export default function EditWebCategory({ categoryId }) {
  const { closeTab, activeTabId, getTabFormData, saveTabFormData } = useAdminTabs();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSection, setCurrentSection] = useState('details');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Get saved form data for this specific category
  const formDataKey = `edit-web-category-${categoryId}`;
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
      const response = await fetch(`/api/web-categories/${categoryId}`);
      if (!response.ok) {
        if (response.status === 404) {
          alert('This web category has been deleted');
          closeTab(`edit-web-category-${categoryId}`);
          return;
        }
        throw new Error('Failed to fetch web category');
      }
      const data = await response.json();
      if (!data) {
        alert('This web category has been deleted');
        closeTab(`edit-web-category-${categoryId}`);
        return;
      }

      setCategoryData(data);
      setOriginalData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [categoryId, closeTab]);

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

      const response = await fetch(`/api/web-categories/${categoryId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(categoryData)
      });

      if (!response.ok) {
        throw new Error('Failed to update web category');
      }

      const result = await response.json();
      setOriginalData(result);
      alert('Web category updated successfully!');
      closeTab(`edit-web-category-${categoryId}`);
    } catch (error) {
      console.error('Error updating web category:', error);
      alert('Failed to update web category. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    const hasChanges = JSON.stringify(categoryData) !== JSON.stringify(originalData);
    if (!hasChanges || window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
      closeTab(`edit-web-category-${categoryId}`);
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
      title="Edit Web Category"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitButtonText="Save Changes"
      isLoading={loading}
    >
      <CategoryForm 
        data={categoryData} 
        onChange={setCategoryData}
        refreshTrigger={refreshTrigger}
      />
    </AddContentLayout>
  );
} 