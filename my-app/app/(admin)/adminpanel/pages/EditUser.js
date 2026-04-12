'use client';
import { useState, useEffect } from 'react';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';

export default function EditUser({ userId }) {
  const { closeTab, updateTabLabel, openTab } = useAdminTabs();
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    is_active: true,
    role: 'customer'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isModified, setIsModified] = useState(false);
  const [originalData, setOriginalData] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          if (response.status === 404) {
            alert('This user has been deleted');
            closeTab('edit-user');
            return;
          }
          throw new Error('Failed to fetch user');
        }
        const data = await response.json();
        setUserData(data);
        setOriginalData(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching user:', error);
        alert('Failed to fetch user details');
      }
    };

    fetchUser();
  }, [userId, closeTab]);

  // Check for modifications
  useEffect(() => {
    if (originalData) {
      const hasChanges = Object.keys(userData).some(key => userData[key] !== originalData[key]);
      setIsModified(hasChanges);
      
      // Update tab label with * for modifications
      const newLabel = `Edit User - ${userData.first_name} ${userData.last_name}${hasChanges ? ' *' : ''}`;
      updateTabLabel('edit-user', newLabel);
    }
  }, [userData, originalData, updateTabLabel]);

  // Listen for save event
  useEffect(() => {
    const handleSaveEvent = async (event) => {
      if (event.detail.tabId === 'edit-user') {
        try {
          const response = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData)
          });

          if (!response.ok) {
            const error = await response.json();
            if (error.error === 'Email already exists') {
              alert('This email is already in use by another user');
              return;
            }
            throw new Error('Failed to update user');
          }

          alert('User updated successfully!');
          closeTab('edit-user');
          
          // If there's a pending tab in the event, open it
          if (event.detail.pendingTab) {
            openTab(event.detail.pendingTab);
          }
        } catch (error) {
          console.error('Error updating user:', error);
          alert('Failed to update user. Please try again.');
        }
      }
    };

    window.addEventListener('saveEditTab', handleSaveEvent);
    return () => window.removeEventListener('saveEditTab', handleSaveEvent);
  }, [userData, userId, closeTab, openTab]);

  const handleSubmit = async () => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const error = await response.json();
        if (error.error === 'Email already exists') {
          alert('This email is already in use by another user');
          return;
        }
        throw new Error('Failed to update user');
      }

      alert('User updated successfully!');
      closeTab('edit-user');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Failed to update user. Please try again.');
    }
  };

  const handleCancel = () => {
    if (!isModified || window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
      closeTab('edit-user');
    }
  };

  const handleInputChange = (field, value) => {
    setUserData(prev => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <AddContentLayout
      title="Edit User"
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitButtonText="Save Changes"
    >
      <div className="form-section">
        <div className="form-group">
          <label htmlFor="first_name">First Name*</label>
          <input
            id="first_name"
            type="text"
            value={userData.first_name || ''}
            onChange={(e) => handleInputChange('first_name', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="last_name">Last Name*</label>
          <input
            id="last_name"
            type="text"
            value={userData.last_name || ''}
            onChange={(e) => handleInputChange('last_name', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">Email*</label>
          <input
            id="email"
            type="email"
            value={userData.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="role">Role*</label>
          <select
            id="role"
            value={userData.role || 'customer'}
            onChange={(e) => handleInputChange('role', e.target.value)}
            required
          >
            <option value="admin">Admin</option>
            <option value="customer">Customer</option>
            <option value="servicer">Servicer</option>
            <option value="guest">Guest</option>
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="phone_number">Phone Number</label>
          <input
            id="phone_number"
            type="tel"
            value={userData.phone_number || ''}
            onChange={(e) => handleInputChange('phone_number', e.target.value)}
          />
        </div>
        <div className="form-group">
          <label>
            <input
              type="checkbox"
              checked={userData.is_active}
              onChange={(e) => handleInputChange('is_active', e.target.checked)}
            />
            Active
          </label>
        </div>
      </div>
    </AddContentLayout>
  );
} 