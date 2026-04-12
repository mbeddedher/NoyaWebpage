'use client';
import { useState, useEffect } from 'react';
import DisplayContentLayout from '../layouts/DisplayContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';

export default function DisplayUsers() {
  const { openTab } = useAdminTabs();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch users');
      }
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value) => {
    // Implement search functionality
  };

  const handleSort = (field, direction) => {
    // Implement sort functionality
  };

  const handleRowAction = async (action, user) => {
    switch (action) {
      case 'edit':
        openTab({
          id: 'edit-user',
          label: `Edit User - ${user.first_name} ${user.last_name}`,
          component: 'EditUser',
          props: { userId: user.id }
        });
        break;
      case 'delete':
        if (window.confirm('Are you sure you want to delete this user?')) {
          try {
            const response = await fetch(`/api/users/${user.id}`, {
              method: 'DELETE'
            });
            if (!response.ok) {
              const error = await response.json();
              throw new Error(error.error || 'Failed to delete user');
            }
            fetchUsers();
          } catch (error) {
            console.error('Error deleting user:', error);
            alert(error.message);
          }
        }
        break;
      default:
        break;
    }
  };

  const columns = [
    { 
      field: 'name', 
      label: 'Name',
      render: (user) => `${user.first_name} ${user.last_name}`
    },
    { field: 'email', label: 'Email' },
    { field: 'role', label: 'Role' },
    { 
      field: 'is_active', 
      label: 'Status',
      render: (user) => (
        <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
          {user.is_active ? 'Active' : 'Inactive'}
        </span>
      )
    },
    { 
      field: 'created_at', 
      label: 'Created At',
      render: (user) => new Date(user.created_at).toLocaleDateString()
    }
  ];

  const rowActions = [
    { label: '✏️', value: 'edit', className: 'edit-action' },
    { label: '🗑️', value: 'delete', className: 'delete-action' }
  ];

  return (
    <DisplayContentLayout
      title="Users"
      columns={columns}
      data={users}
      onSearch={handleSearch}
      onSort={handleSort}
      onRowAction={handleRowAction}
      rowActions={rowActions}
    />
  );
} 