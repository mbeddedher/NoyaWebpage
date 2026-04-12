'use client'

import React, { createContext, useState, useContext, useEffect } from 'react';
import Cookies from 'js-cookie';
import { useRouter } from 'next/navigation';

// Create the context with a default value
const UserContext = createContext({
  isLoggedIn: false,
  userId: null,
  login: () => {},
  logout: () => {},
});

// Create a provider component
export const UserProvider = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState(null);
  const router = useRouter();

  const fetchUserId = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const { userId } = await res.json();
        setUserId(userId);
        return userId;
      }
      setUserId(null);
      return null;
    } catch {
      setUserId(null);
      return null;
    }
  };

  const checkLoginStatus = async () => {
    try {
      const token = Cookies.get('token');
      console.log('Checking token in context:', token);
      
      if (!token) {
        console.log('No token found, setting logged out');
        setIsLoggedIn(false);
        setUserId(null);
        return false;
      }

      console.log('Token found, setting logged in');
      setIsLoggedIn(true);
      await fetchUserId();
      return true;
    } catch (error) {
      console.error('Error checking login status:', error);
      setIsLoggedIn(false);
      setUserId(null);
      return false;
    }
  };

  // Initial check on mount
  useEffect(() => {
    console.log('UserContext mounted, checking initial login status');
    checkLoginStatus();
  }, []);

  // Check whenever token changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        checkLoginStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Login function
  const login = async(e, email, password) => {
    e.preventDefault();
    try {
      const visitorId =
        typeof window !== 'undefined'
          ? localStorage.getItem('product_events_visitor_id')
          : null;

      const res = await fetch('/api/auth/login', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, visitor_id: visitorId }),
        credentials: 'include'
      });

      const data = await res.json();
      console.log('Login response:', data);

      if (res.ok && data.token) {
        Cookies.set('token', data.token, { 
          expires: 7,
          path: '/',
          sameSite: 'Lax'
        });
        console.log('Token set in cookie:', Cookies.get('token'));
        setIsLoggedIn(true);
        setUserId(data.userId ?? null);
        router.push('/');
        return true;
      }
      
      console.error('Login failed:', data.error);
      setIsLoggedIn(false);
      return false;
    } catch(error) {
      console.error('Login error:', error);
      setIsLoggedIn(false);
      return false;
    }
  };

  // Logout function
  const logout = async() => {
    try {
      const token = Cookies.get('token');
      if (token) {
        await fetch('/api/auth/logout', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          credentials: 'include'
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      console.log('Removing token and setting logged out');
      Cookies.remove('token', { path: '/' });
      setIsLoggedIn(false);
      setUserId(null);
      router.push('/');
    }
  };

  console.log('Current login state in context:', isLoggedIn);

  const contextValue = {
    isLoggedIn,
    userId,
    login,
    logout,
    checkLoginStatus
  };

  return (
    <UserContext.Provider value={contextValue}>
      {children}
    </UserContext.Provider>
  );
};

// Custom hook to use UserContext
export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
