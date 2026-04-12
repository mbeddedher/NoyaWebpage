'use client';
import { useAdminTabs } from '../../../context/AdminTabsContext';
import dynamic from 'next/dynamic';
import { Suspense, useState } from 'react';
import ErrorBoundary from './ErrorBoundary';
import EditProductDisplay from '../pages/EditProductDisplay';

// Loading component
const LoadingComponent = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>Loading content...</p>
  </div>
);

// Error component
const ErrorComponent = ({ error, onRetry }) => (
  <div className="error-container">
    <p>Error loading component: {error}</p>
    <button onClick={onRetry}>Retry</button>
  </div>
);

// Dynamically import all possible components with loading and error states
const components = {
  DisplayProducts: dynamic(() => import('../pages/DisplayProducts'), {
    loading: () => <LoadingComponent />,
  }),
  AddProduct: dynamic(() => import('../pages/AddProduct'), {
    loading: () => <LoadingComponent />,
  }),
  EditProduct: dynamic(() => import('../pages/EditProduct'), {
    loading: () => <LoadingComponent />,
  }),
  DisplayCategories: dynamic(() => import('../pages/DisplayCategories'), {
    loading: () => <LoadingComponent />,
  }),
  AddCategory: dynamic(() => import('../pages/AddCategory'), {
    loading: () => <LoadingComponent />,
  }),
  EditCategory: dynamic(() => import('../pages/EditCategory'), {
    loading: () => <LoadingComponent />,
  }),
  DisplaySuppliers: dynamic(() => import('../pages/DisplaySuppliers'), {
    loading: () => <LoadingComponent />,
  }),
  AddSupplier: dynamic(() => import('../pages/AddSupplier'), {
    loading: () => <LoadingComponent />,
  }),
  EditSupplier: dynamic(() => import('../pages/EditSupplier'), {
    loading: () => <LoadingComponent />,
  }),
  AddCraftedProduct: dynamic(() => import('../pages/AddCraftedProduct'), {
    loading: () => <LoadingComponent />,
  }),
  EditCraftedProduct: dynamic(() => import('../pages/EditCraftedProduct'), {
    loading: () => <LoadingComponent />,
  }),
  AddProductDisplay: dynamic(() => import('../pages/AddProductDisplay'), {
    loading: () => <LoadingComponent />,
  }),
  DisplayWebCategories: dynamic(() => import('../pages/DisplayWebCategories'), {
    loading: () => <LoadingComponent />,
  }),
  AddWebCategory: dynamic(() => import('../pages/AddWebCategory'), {
    loading: () => <LoadingComponent />,
  }),
  EditWebCategory: dynamic(() => import('../pages/EditWebCategory'), {
    loading: () => <LoadingComponent />,
  }),
  DisplayProductDisplays: dynamic(() => import('../pages/DisplayProductDisplays'), {
    loading: () => <LoadingComponent />,
  }),
  DisplayUsers: dynamic(() => import('../pages/DisplayUsers'), {
    loading: () => <LoadingComponent />,
  }),
  AddUser: dynamic(() => import('../pages/AddUser'), {
    loading: () => <LoadingComponent />,
  }),
  EditUser: dynamic(() => import('../pages/EditUser'), {
    loading: () => <LoadingComponent />,
  }),
  EditProductDisplay: dynamic(() => import('../pages/EditProductDisplay'), {
    loading: () => <LoadingComponent />,
  }),
  Analytics: dynamic(() => import('../pages/Analytics'), {
    loading: () => <LoadingComponent />,
  }),
};

export default function TabContent() {
  const { tabs, activeTabId, closeTab } = useAdminTabs();
  const [error, setError] = useState(null);
  
  if (!activeTabId) {
    return (
      <div className="welcome-message">
        <h2>Welcome to Admin Panel</h2>
        <p>Select an option from the sidebar to get started.</p>
      </div>
    );
  }

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  if (!activeTab) return null;

  const Component = components[activeTab.component];
  if (!Component) {
    return <ErrorComponent error="Component not found" onRetry={() => closeTab(activeTabId)} />;
  }

  return (
    <Suspense fallback={<LoadingComponent />}>
      <ErrorBoundary
        fallback={(error) => (
          <ErrorComponent 
            error={error?.message || 'An unknown error occurred'} 
            onRetry={() => {
              setError(null);
              window.location.reload();
            }}
          />
        )}
      >
        <Component {...activeTab.props} />
      </ErrorBoundary>
    </Suspense>
  );
} 