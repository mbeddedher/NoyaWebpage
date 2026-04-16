'use client';
import { useState } from 'react';
import { useAdminTabs } from '../../context/AdminTabsContext';
import TabNavigation from './components/TabNavigation';
import TabContent from './components/TabContent';
import '../../styles/adminPanel.css';

export default function AdminPanelLayout({ children }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavbarCollapsed, setIsNavbarCollapsed] = useState(false);
  const { openTab } = useAdminTabs();

  const menuItems = [
    { 
      id: 'products', 
      label: 'Display Products', 
      icon: '📦',
      component: 'DisplayProducts'
    },
    { 
      id: 'add-product', 
      label: 'Add Product', 
      icon: '➕',
      component: 'AddProduct'
    },
    { 
      id: 'crafted-product', 
      label: 'Create Crafted Product', 
      icon: '🛠️',
      component: 'AddCraftedProduct'
    },
    { 
      id: 'product-displays', 
      label: 'Product Displays', 
      icon: '🎨',
      overlay: true,
      items: [
        {
          id: 'display-product-displays',
          label: 'Display Product Displays',
          component: 'DisplayProductDisplays'
        },
        {
          id: 'add-product-display',
          label: 'Add Product Display',
          component: 'AddProductDisplay'
        }
      ]
    },
    { 
      id: 'categories', 
      label: 'Product Categories', 
      icon: '📑',
      overlay: true,
      items: [
        {
          id: 'display-categories',
          label: 'Display Categories',
          component: 'DisplayCategories'
        },
        {
          id: 'add-category',
          label: 'Add Category',
          component: 'AddCategory'
        }
      ]
    },
    { 
      id: 'web-categories', 
      label: 'Web Categories', 
      icon: '🌐',
      overlay: true,
      items: [
        {
          id: 'display-web-categories',
          label: 'Display Categories',
          component: 'DisplayWebCategories'
        },
        {
          id: 'add-web-category',
          label: 'Add Category',
          component: 'AddWebCategory'
        }
      ]
    },
    { 
      id: 'suppliers', 
      label: 'Display Suppliers', 
      icon: '🏢',
      component: 'DisplaySuppliers'
    },
    { 
      id: 'add-supplier', 
      label: 'Add Supplier', 
      icon: '➕',
      component: 'AddSupplier'
    },
    {
      id: 'users',
      label: 'Users',
      icon: '👥',
      overlay: true,
      items: [
        {
          id: 'display-users',
          label: 'Display Users',
          component: 'DisplayUsers'
        },
        {
          id: 'add-user',
          label: 'Add User',
          component: 'AddUser'
        }
      ]
    }
    ,
    {
      id: 'analytics',
      label: 'Analytics',
      icon: '📊',
      component: 'Analytics'
    },
    {
      id: 'blog',
      label: 'Blog',
      icon: '📝',
      overlay: true,
      items: [
        {
          id: 'blog-posts-list',
          label: 'Articles (list)',
          component: 'BlogPostsList',
        },
        {
          id: 'blog-create',
          label: 'Add article',
          component: 'BlogAdmin',
        },
      ],
    }
  ];

  const [overlayVisible, setOverlayVisible] = useState(null);

  const filteredMenuItems = menuItems.filter(item =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMenuClick = (item) => {
    if (item.overlay) {
      setOverlayVisible(overlayVisible === item.id ? null : item.id);
    } else {
      setOverlayVisible(null);
      openTab({
        id: `${item.id}-${Date.now()}`,
        label: item.label,
        component: item.component
      });
    }
  };

  const handleOverlayItemClick = (parentItem, item) => {
    setOverlayVisible(null);
    openTab({
      id: `${item.id}-${Date.now()}`,
      label: `${parentItem.label} - ${item.label}`,
      component: item.component
    });
  };

  const toggleNavbar = () => {
    setIsNavbarCollapsed(!isNavbarCollapsed);
    setOverlayVisible(null);
  };

  return (
    <div className="admin-panel-container">
      <nav className={`admin-sidebar ${isNavbarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h2>{isNavbarCollapsed ? '🏪' : 'Admin Panel'}</h2>
          <button className="toggle-nav" onClick={toggleNavbar}>
            {isNavbarCollapsed ? '→' : '←'}
          </button>
        </div>
        <div className="menu-items">
          {menuItems.map((item) => (
            <div key={item.id} className="menu-item-container">
              <button
                className={`menu-item ${overlayVisible === item.id ? 'active' : ''}`}
                onClick={() => handleMenuClick(item)}
              >
                <span className="icon">{item.icon}</span>
                {!isNavbarCollapsed && (
                  <>
                    <span className="label">{item.label}</span>
                    {item.overlay && <span className="arrow">{overlayVisible === item.id ? '▼' : '▶'}</span>}
                  </>
                )}
              </button>
              {item.overlay && overlayVisible === item.id && !isNavbarCollapsed && (
                <div className="overlay-menu">
                  {item.items.map((subItem) => (
                    <button
                      key={subItem.id}
                      className="overlay-item"
                      onClick={() => handleOverlayItemClick(item, subItem)}
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </nav>
      <main className={`main-content ${isNavbarCollapsed ? 'expanded' : ''}`}>
        <TabNavigation />
        <TabContent />
      </main>
    </div>
  );
} 