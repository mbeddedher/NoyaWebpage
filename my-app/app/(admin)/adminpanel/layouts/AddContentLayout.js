'use client';
import { useState } from 'react';
import '../../../styles/adminLayouts.css';

export default function AddContentLayout({ 
  title,
  children,
  pages,
  onSave,
  onSubmit,
  onCancel,
  submitButtonText = 'Save',
  isLoading = false
}) {
  const [currentPage, setCurrentPage] = useState(0);
  const isPaged = Array.isArray(pages) && pages.length > 0;

  return (
    <div className="add-content-layout">
      <div className="content-wrapper">
        <div className="add-content-form">
          {/* Title */}
          {title && (
            <div className="add-content-header">
              <h2>{title}</h2>
            </div>
          )}

          {/* Page Navigation for paged content */}
          {isPaged && (
            <div className="page-navigation">
              {pages.map((page, index) => (
                <button
                  key={page.title}
                  className={`nav-button ${index === currentPage ? 'active' : ''}`}
                  onClick={() => setCurrentPage(index)}
                >
                  {page.title}
                </button>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="page-content">
            {isPaged ? pages[currentPage]?.content : children}
          </div>

          {/* Action Buttons */}
          <div className="fixed-bottom-bar">
            <div className="action-buttons">
              {onCancel && (
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                className="button button-primary"
                onClick={isPaged ? onSave : onSubmit}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : submitButtonText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 