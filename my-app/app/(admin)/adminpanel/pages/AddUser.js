'use client';
import { useState, useEffect } from 'react';
import AddContentLayout from '../layouts/AddContentLayout';
import { useAdminTabs } from '../../../context/AdminTabsContext';

// Define special characters at the top level for consistency
const specialChars = '!@#$%^&*()-_+=<>?/[]{}|~';

// User Details Component
function UserDetails({ data, onChange, emailError, passwordError, validatePassword }) {
  return (
    <div className="form-section">
      <div className="form-group">
        <label htmlFor="first_name">First Name</label>
        <input
          type="text"
          id="first_name"
          value={data.first_name || ''}
          onChange={(e) => onChange({ ...data, first_name: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="last_name">Last Name</label>
        <input
          type="text"
          id="last_name"
          value={data.last_name || ''}
          onChange={(e) => onChange({ ...data, last_name: e.target.value })}
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          type="email"
          id="email"
          value={data.email || ''}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          className={emailError ? 'error' : ''}
          required
        />
        {emailError && <div className="error-message">{emailError}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          type="password"
          id="password"
          value={data.password || ''}
          onChange={(e) => {
            const newData = { ...data, password: e.target.value };
            onChange(newData);
            validatePassword(newData);
          }}
          className={passwordError ? 'error' : ''}
          required
        />
        <div className="password-requirements">
          Password must contain:
          <ul>
            <li className={data.password?.length >= 8 ? 'valid' : ''}>At least 8 characters</li>
            <li className={/[A-Z]/.test(data.password || '') ? 'valid' : ''}>One uppercase letter (A-Z)</li>
            <li className={/[a-z]/.test(data.password || '') ? 'valid' : ''}>One lowercase letter (a-z)</li>
            <li className={/[0-9]/.test(data.password || '') ? 'valid' : ''}>One number (0-9)</li>
            <li className={data.password && [...data.password].some(char => specialChars.includes(char)) ? 'valid' : ''}>
              One special character:<br/>
              <div className="special-chars">
                <span className="char-group">
                  <span className="char-group-chars">! @ # $ % ^ & * ( )</span>
                </span>
                <span className="char-group">
                  <span className="char-group-chars">- _</span>
                </span>
                <span className="char-group">
                  <span className="char-group-chars">+ =</span>
                </span>
                <span className="char-group">
                  <span className="char-group-chars">[ ] { } &lt; &gt;</span>
                </span>
                <span className="char-group">
                  <span className="char-group-chars">/ | ~ ?</span>
                </span>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="confirm_password">Confirm Password</label>
        <input
          type="password"
          id="confirm_password"
          value={data.confirm_password || ''}
          onChange={(e) => {
            const newData = { ...data, confirm_password: e.target.value };
            onChange(newData);
            validatePassword(newData);
          }}
          className={passwordError ? 'error' : ''}
          required
        />
        {passwordError && <div className="error-message">{passwordError}</div>}
      </div>

      <div className="form-group">
        <label htmlFor="role">Role</label>
        <select
          id="role"
          value={data.role || ''}
          onChange={(e) => onChange({ ...data, role: e.target.value })}
          required
        >
          <option value="">Select Role</option>
          <option value="admin">Admin</option>
          <option value="customer">Customer</option>
          <option value="servicer">Servicer</option>
          <option value="guest">Guest</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="is_active">Status</label>
        <select
          id="is_active"
          value={data.is_active}
          onChange={(e) => onChange({ ...data, is_active: e.target.value === 'true' })}
          required
        >
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      <style jsx>{`
        .error {
          border-color: #dc3545;
        }
        .error-message {
          color: #dc3545;
          font-size: 0.875rem;
          margin-top: 0.25rem;
        }
        .password-requirements {
          font-size: 0.875rem;
          margin-top: 0.5rem;
          color: #6c757d;
        }
        .password-requirements ul {
          list-style: none;
          padding-left: 1rem;
          margin-top: 0.25rem;
        }
        .password-requirements li {
          margin: 0.25rem 0;
          position: relative;
        }
        .password-requirements li:before {
          content: '❌';
          margin-right: 0.5rem;
        }
        .password-requirements li.valid:before {
          content: '✅';
        }
        .valid {
          color: #198754;
        }
        .special-chars {
          padding: 0.5rem;
          margin-top: 0.25rem;
          background: #f8f9fa;
          border-radius: 4px;
          font-family: monospace;
          line-height: 1.8;
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .char-group {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          background: #fff;
          border-radius: 3px;
        }
        .char-group-chars {
          letter-spacing: 0.25rem;
        }
      `}</style>
    </div>
  );
}

export default function AddUser() {
  const { closeTab, activeTabId, getTabFormData, saveTabFormData } = useAdminTabs();
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const initialFormState = {
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: '',
    is_active: true
  };

  // Get saved form data or use initial state
  const formData = activeTabId ? getTabFormData(activeTabId) : {
    userData: initialFormState
  };

  const [userData, setUserData] = useState(formData.userData || initialFormState);

  // Save form data whenever it changes
  useEffect(() => {
    if (activeTabId && !loading) {
      saveTabFormData(activeTabId, {
        userData
      });
    }
  }, [userData, activeTabId, loading]);

  // Check email availability when email changes
  const checkEmail = async (email) => {
    try {
      const response = await fetch(`/api/users/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (data.exists) {
        setEmailError('This email is already in use');
      } else {
        setEmailError('');
      }
    } catch (error) {
      console.error('Error checking email:', error);
    }
  };

  // Handle email change with debounce
  const handleEmailChange = (newData) => {
    setUserData(newData);
    if (newData.email) {
      // Clear previous timeout
      if (window.emailCheckTimeout) {
        clearTimeout(window.emailCheckTimeout);
      }
      // Set new timeout
      window.emailCheckTimeout = setTimeout(() => {
        checkEmail(newData.email);
      }, 500); // Wait 500ms after user stops typing
    } else {
      setEmailError('');
    }
  };

  // Validate password
  const validatePassword = (data) => {
    const { password, confirm_password } = data;
    
    // Password requirements
    const minLength = password?.length >= 8;
    const hasUpperCase = /[A-Z]/.test(password || '');
    const hasLowerCase = /[a-z]/.test(password || '');
    const hasNumber = /[0-9]/.test(password || '');
    const hasSpecialChar = password && [...password].some(char => specialChars.includes(char));
    
    if (password && !minLength) {
      setPasswordError('Password must be at least 8 characters long');
    } else if (password && !hasUpperCase) {
      setPasswordError('Password must contain at least one uppercase letter');
    } else if (password && !hasLowerCase) {
      setPasswordError('Password must contain at least one lowercase letter');
    } else if (password && !hasNumber) {
      setPasswordError('Password must contain at least one number');
    } else if (password && !hasSpecialChar) {
      setPasswordError('Password must contain at least one special character from the list above');
    } else if (password && confirm_password && password !== confirm_password) {
      setPasswordError('Passwords do not match');
    } else {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Don't submit if there are any errors
    if (emailError || passwordError) {
      alert('Please fix all errors before submitting');
      return;
    }

    // Don't submit if passwords don't match
    if (userData.password !== userData.confirm_password) {
      setPasswordError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      // Remove confirm_password before sending to API
      const { confirm_password, ...submitData } = userData;
      
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      const result = await response.json();
      
      // Show success message
      alert(`User ${result.first_name} ${result.last_name} has been successfully created!`);
      
      // Reset form to initial state
      setUserData(initialFormState);
      setEmailError('');
      setPasswordError('');
      
      // Close the tab
      closeTab('add-user');
    } catch (error) {
      console.error('Error creating user:', error);
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    // Show confirmation if form has been modified
    const isFormModified = Object.keys(userData).some(key => userData[key] !== initialFormState[key]);
    
    if (isFormModified) {
      if (window.confirm('Are you sure you want to cancel? All changes will be lost.')) {
        closeTab('add-user');
      }
    } else {
      closeTab('add-user');
    }
  };

  return (
    <AddContentLayout
      title="Add New User"
      onSubmit={handleSubmit}
      isLoading={loading}
      submitButtonText="Add User"
      onCancel={handleCancel}
    >
      <UserDetails 
        data={userData} 
        onChange={(newData) => {
          if (newData.email !== userData.email) {
            handleEmailChange(newData);
          } else {
            setUserData(newData);
          }
        }}
        emailError={emailError}
        passwordError={passwordError}
        validatePassword={validatePassword}
      />
    </AddContentLayout>
  );
} 