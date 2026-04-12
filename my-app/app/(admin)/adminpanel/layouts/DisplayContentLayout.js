'use client';
import { useState, useEffect } from 'react';

export default function DisplayContentLayout({
  title,
  columns,
  data = [],
  onSearch,
  onSearchButtonClick,
  searchValue,
  onSort,
  onFilter,
  onBulkAction,
  onRowAction,
  bulkActions = [],
  rowActions = [],
  itemsPerPageOptions = [10, 25, 50, 100],
  showSearchButton = false,
  isLoading = false
}) {
  const [selectedItems, setSelectedItems] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(itemsPerPageOptions[0]);
  const [sortConfig, setSortConfig] = useState({ field: null, direction: 'asc' });
  const [filters, setFilters] = useState({});

  // Handle sorting
  const handleSort = (field) => {
    const direction = sortConfig.field === field && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ field, direction });
    onSort?.(field, direction);
  };

  // Handle bulk actions
  const handleBulkAction = (action) => {
    if (selectedItems.length === 0) {
      alert('Please select items first');
      return;
    }
    onBulkAction?.(action, selectedItems);
  };

  // Handle pagination
  const safeData = Array.isArray(data) ? data : [];
  const totalPages = Math.ceil(safeData.length / itemsPerPage) || 1;
  const paginatedData = safeData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data]);

  if (isLoading) {
    return (
      <div className="display-content-layout">
        <div className="display-content-header">
          <h2>{title}</h2>
        </div>
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="display-content-layout">
      <div className="display-content-header">
        <h2>{title}</h2>
        
        {/* Search and Filters */}
        <div className="toolbar">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => onSearch?.(e.target.value)}
            />
            {showSearchButton && (
              <button 
                className="button button-primary search-button"
                onClick={onSearchButtonClick}
              >
                Search
              </button>
            )}
          </div>

          {/* Bulk Actions */}
          {bulkActions.length > 0 && (
            <div className="bulk-actions">
              <select 
                onChange={(e) => handleBulkAction(e.target.value)}
                disabled={selectedItems.length === 0}
              >
                <option value="">Bulk Actions</option>
                {bulkActions.map(action => (
                  <option key={action.value} value={action.value}>
                    {action.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        {safeData.length === 0 ? (
          <div className="no-data-message">
            <p>No data available</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {bulkActions.length > 0 && (
                  <th>
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        setSelectedItems(
                          e.target.checked ? safeData.map(item => item.id) : []
                        );
                      }}
                      checked={selectedItems.length === safeData.length}
                    />
                  </th>
                )}
                {columns.map(column => (
                  <th
                    key={column.field}
                    onClick={() => handleSort(column.field)}
                    className={`sortable ${
                      sortConfig.field === column.field ? sortConfig.direction : ''
                    }`}
                  >
                    {column.label}
                  </th>
                ))}
                {rowActions.length > 0 && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((item, rowIndex) => {
                const rowKey = item?.id ?? item?.display_id ?? rowIndex;
                return (
                <tr key={rowKey}>
                  {bulkActions.length > 0 && (
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(item.id)}
                        onChange={(e) => {
                          setSelectedItems(prev =>
                            e.target.checked
                              ? [...prev, item.id]
                              : prev.filter(id => id !== item.id)
                          );
                        }}
                      />
                    </td>
                  )}
                  {columns.map(column => (
                    <td key={`${item.id}-${column.field}`}>
                      {column.render ? column.render(item) : item[column.field]}
                    </td>
                  ))}
                  {rowActions.length > 0 && (
                    <td className="row-actions">
                      {rowActions.map(action => (
                        <button
                          key={action.label}
                          onClick={() => onRowAction?.(action.value, item)}
                          className={`button-icon ${action.className || ''}`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </td>
                  )}
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {safeData.length > 0 && (
        <div className="pagination">
          <div className="items-per-page">
            <select
              value={itemsPerPage}
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
            >
              {itemsPerPageOptions.map(option => (
                <option key={option} value={option}>
                  {option} per page
                </option>
              ))}
            </select>
          </div>

          <div className="page-navigation">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 