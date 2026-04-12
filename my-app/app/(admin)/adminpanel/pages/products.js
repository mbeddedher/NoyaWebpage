'use client';
import { useEffect } from 'react';
import AddProduct from '../components/AddProduct';

export default function ProductsPage({ activeTab }) {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'details':
        return <AddProduct />;
      case 'prices':
        return <div>Prices content will go here</div>;
      case 'stocks':
        return <div>Stocks content will go here</div>;
      case 'images':
        return <div>Images content will go here</div>;
      default:
        return <AddProduct />;
    }
  };

  return (
    <div className="products-page">
      {renderTabContent()}
    </div>
  );
} 