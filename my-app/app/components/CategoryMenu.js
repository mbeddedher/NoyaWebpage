'use client'

import { useState } from "react";
import { useRouter } from 'next/navigation';
import '../styles/CategoryMenu.css'

export default function CategoryMenu({categories, setMouse}){
    const router = useRouter();
    const [openCategories, setOpenCategories] = useState(new Set());
    const categoryMap = new Map();
    
    // Initialize map with all categories
    categories.forEach(category => {
      categoryMap.set(category.id, { ...category, subcategories: [] });
    });

    // Build the nested structure
    const nestedCategories = [];
    categories.forEach(category => {
      if (category.parent_id === null) {
        nestedCategories.push(categoryMap.get(category.id));
      } else {
        const parentCategory = categoryMap.get(category.parent_id);
        if (parentCategory) {
          parentCategory.subcategories.push(categoryMap.get(category.id));
        }
      }
    });

    const handleCategoryHover = (categoryName) => {
      setOpenCategories(prev => {
        const newSet = new Set(prev);
        newSet.add(categoryName);
        return newSet;
      });
    };

    // Function to get all subcategory IDs recursively
    const getAllSubcategoryIds = (category) => {
      let ids = [category.id];
      if (category.subcategories && category.subcategories.length > 0) {
        category.subcategories.forEach(subcat => {
          ids = [...ids, ...getAllSubcategoryIds(subcat)];
        });
      }
      return ids;
    };

    const handleCategoryClick = (category) => {
      // Get all subcategory IDs including the clicked category
      const categoryIds = getAllSubcategoryIds(category);
      const queryString = categoryIds.join(',');
      router.push(`/products?categories=${queryString}`);
      setMouse(false);
      setOpenCategories(new Set());
    };

    function generateCategories(categories, level = 0) {
      return categories.map((category) => {
        const hasSubcategories = category.subcategories && category.subcategories.length > 0;
        const isOpen = openCategories.has(category.name);
        
        return (
          <li key={category.name} className="menu-item">
            <div 
              className="menu-btn"
              onMouseEnter={() => handleCategoryHover(category.name)}
              onClick={() => handleCategoryClick(category)}
              style={{ paddingLeft: `${level * 10 + 15}px` }}
            >
              <span>{category.name}</span>
              {hasSubcategories && <span className="arrow">▼</span>}
            </div>
            {hasSubcategories && isOpen && (
              <ul className="submenu">
                {generateCategories(category.subcategories, level + 1)}
              </ul>
            )}
          </li>
        );
      });
    }

    return (
        <ul 
          className="menu" 
          onMouseLeave={() => {
            setMouse(false);
            setOpenCategories(new Set());
          }} 
          onMouseEnter={() => setMouse(true)}
        >
          {generateCategories(nestedCategories)}
        </ul>
    );
}