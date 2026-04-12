'use client';
import { useState } from 'react';
import AddProduct from './components/AddProduct';

export default function AdminPanel() {
  const [selectedSection, setSelectedSection] = useState('products');

  // Function to render content based on selected section
  const renderContent = () => {
    switch (selectedSection) {
      case 'products':
        return <AddProduct />;
      default:
        return <div>Select a section from the sidebar</div>;
    }
  };

  return (
    <div className="admin-panel">
      <h1 className="admin-title">Admin Dashboard</h1>
      {renderContent()}
    </div>
  );
} 