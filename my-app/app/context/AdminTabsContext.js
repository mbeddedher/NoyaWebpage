'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const AdminTabsContext = createContext();

// Define initial states for different form types
const initialFormStates = {
  AddProduct: {
    name: '',
    sku: '',
    brand: '',
    category_id: '',
    supplier_id: '',
    description: '',
    specifications: '',
    is_active: true,
    stock: {
      quantity: 0,
      min_quantity: 0,
      max_quantity: 0,
      location: '',
      unit: '',
      stock_status: 'limited'
    },
    pricing: {
      cost: 0,
      price: 0,
      discount_price: 0,
      tax_rate: 0,
      currency: 'USD'
    },
    package_options: []
  },
  AddSupplier: {
    name: '',
    company_name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    tax_id: '',
    payment_terms: '',
    is_active: true,
    notes: '',
    website: '',
    currency: 'USD',
    credit_limit: 0,
    payment_method: ''
  },
  AddUser: {
    username: '',
    email: '',
    password: '',
    confirm_password: '',
    first_name: '',
    last_name: '',
    role: '',
    department: '',
    phone: '',
    is_active: true,
    permissions: [],
    profile_image: null,
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: ''
  },
  AddCraftedProduct: {
    name: '',
    sku: '',
    brand: '',
    category_id: '',
    description: '',
    specifications: '',
    is_active: true,
    stock: {
      quantity: 0,
      min_quantity: 0,
      max_quantity: 0,
      location: '',
      unit: '',
      stock_status: 'limited'
    },
    pricing: {
      cost: 0,
      price: 0,
      discount_price: 0,
      tax_rate: 0,
      currency: 'USD'
    },
    components: [],
    package_options: []
  },
  EditCraftedProduct: {
    name: '',
    sku: '',
    brand: '',
    category_id: '',
    supplier_id: '',
    description: '',
    specifications: '',
    is_active: true,
    
    // Stock details
    stock: {
      quantity: 0,
      min_quantity: 0,
      max_quantity: 0,
      location: '',
      unit: 'piece',
      stock_status: 'limited'
    },
    
    // Price details
    pricing: {
      mode: 'manual',
      currency: 'USD',
      cost: 0,
      price: 0,
      tax_rate: 0,
      profit: 0,
      vat: 0,
      discount: 0,
      has_difference: false,
      difference_type: '',
      difference_value: '',
      is_multi: false,
      multi_currency_prices: {}
    },
    
    // Components
    components: [],
    
    // Package options
    package_options: []
  },
  EditProduct: {
    name: '',
    sku: '',
    brand: '',
    category_id: '',
    supplier_id: '',
    description: '',
    specifications: '',
    is_active: true,
    stock: {
      quantity: 0,
      min_quantity: 0,
      max_quantity: 0,
      location: '',
      unit: '',
      stock_status: 'limited'
    },
    pricing: {
      cost: 0,
      price: 0,
      discount_price: 0,
      tax_rate: 0,
      currency: 'USD'
    },
    package_options: []
  },
  DisplayProducts: {
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
  },
  AddWebCategory: {
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
  },
  AddCategory: {
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
  },
  AddProductDisplay: {
    name: '',
    description: '',
    category_id: '',
    status: 'active',
    keywords: '',
    variants: [],
    images: []
  }
};

export function AdminTabsProvider({ children }) {
  // Main tabs state with formData included
  const [tabsState, setTabsState] = useState({
    tabs: [],
    activeTabId: null,
    pendingEditTab: null,
    formData: {} // Store form data for each tab
  });

  const MAX_TABS = 10;

  // Load state from localStorage on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem('adminTabsState');
      if (savedState) {
        setTabsState(JSON.parse(savedState));
      }
    } catch (error) {
      console.error('Error loading saved tabs:', error);
      localStorage.removeItem('adminTabsState');
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('adminTabsState', JSON.stringify(tabsState));
    } catch (error) {
      console.error('Error saving tabs:', error);
    }
  }, [tabsState]);

  const isEditComponent = (component) => {
    return ['EditCategory','EditCraftedProduct', 'EditWebCategory', 'EditProduct', 'EditProductDisplay', 'EditUser', 'EditSupplier'].includes(component);
  };

  // Get form data for a specific tab
  const getTabFormData = (tabId) => {
    return tabsState.formData[tabId] || {};
  };

  // Save form data for a specific tab
  const saveTabFormData = (tabId, data) => {
    setTabsState(prev => ({
      ...prev,
      formData: {
        ...prev.formData,
        [tabId]: data
      }
    }));
  };

  const openTab = (newTab) => {
    if (!newTab.id) {
      console.error('Tab must have an ID');
      return;
    }

    // Check if exact same tab exists
    const exactTab = tabsState.tabs.find(tab => tab.id === newTab.id);
    if (exactTab) {
      setTabsState(prev => ({
        ...prev,
        activeTabId: exactTab.id
      }));
      return;
    }

    // For non-edit tabs, check if tab with same component exists
    if (!isEditComponent(newTab.component)) {
      const existingTab = tabsState.tabs.find(tab => tab.component === newTab.component);
      if (existingTab) {
        setTabsState(prev => ({
          ...prev,
          activeTabId: existingTab.id
        }));
        return;
      }
    }

    // Initialize new tab with default form state
    const initialFormData = initialFormStates[newTab.component] || {};
    
    // Check if max tabs reached
    if (tabsState.tabs.length >= MAX_TABS) {
      alert(`Maximum ${MAX_TABS} tabs allowed. Please close some tabs first.`);
      return;
    }

    setTabsState(prev => ({
      ...prev,
      tabs: [...prev.tabs, newTab],
      activeTabId: newTab.id,
      formData: {
        ...prev.formData,
        [newTab.id]: initialFormData
      }
    }));
  };

  const closeTab = (tabId) => {
    setTabsState(prev => {
      const newTabs = prev.tabs.filter(tab => tab.id !== tabId);
      const newFormData = { ...prev.formData };
      delete newFormData[tabId];

      return {
        ...prev,
        tabs: newTabs,
        activeTabId: prev.activeTabId === tabId 
          ? (newTabs[newTabs.length - 1]?.id || null)
          : prev.activeTabId,
        formData: newFormData
      };
    });
  };

  const updateTabLabel = (tabId, newLabel) => {
    setTabsState(prev => ({
      ...prev,
      tabs: prev.tabs.map(tab => 
        tab.id === tabId 
          ? { ...tab, label: newLabel }
          : tab
      )
    }));
  };

  const value = {
    tabs: tabsState.tabs,
    activeTabId: tabsState.activeTabId,
    setActiveTabId: (id) => setTabsState(prev => ({ ...prev, activeTabId: id })),
    openTab,
    closeTab,
    updateTabLabel,
    pendingEditTab: tabsState.pendingEditTab,
    setPendingEditTab: (tab) => setTabsState(prev => ({ ...prev, pendingEditTab: tab })),
    getTabFormData,
    saveTabFormData
  };

  return (
    <AdminTabsContext.Provider value={value}>
      {children}
    </AdminTabsContext.Provider>
  );
}

export function useAdminTabs() {
  const context = useContext(AdminTabsContext);
  if (!context) {
    throw new Error('useAdminTabs must be used within an AdminTabsProvider');
  }
  return context;
} 