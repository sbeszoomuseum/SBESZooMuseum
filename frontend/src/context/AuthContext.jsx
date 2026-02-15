import React, { createContext, useState, useContext, useEffect } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || (
  window.location.hostname.includes('vercel.app')
    ? 'https://biomuseum.onrender.com'
    : 'http://localhost:8000'
);

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth from localStorage and verify with backend
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Try to get token from localStorage first
        const savedToken = localStorage.getItem('authToken');
        
        if (savedToken) {
          // Verify token with backend
          try {
            const response = await fetch(`${BACKEND_URL}/api/auth/verify`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${savedToken}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const userData = await response.json();
              setUser(userData);
              setToken(savedToken);
            } else {
              // Token is invalid, clear it
              localStorage.removeItem('authToken');
              localStorage.removeItem('authUser');
              setUser(null);
              setToken(null);
            }
          } catch (error) {
            console.error('Token verification error:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('authUser');
            setUser(null);
            setToken(null);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Login function - called after successful Google OAuth
  const login = async (googleToken) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/auth/gmail/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ token: googleToken })
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      
      // Save token and user to state and localStorage
      setToken(data.access_token);
      setUser(data.user);
      localStorage.setItem('authToken', data.access_token);
      localStorage.setItem('authUser', JSON.stringify(data.user));
      
      return data.user;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (token) {
        await fetch(`${BACKEND_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear state and localStorage
      setUser(null);
      setToken(null);
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
    }
  };

  // Check if user is authenticated
  const isAuthenticated = !!token && !!user;

  // Get current auth header for API calls
  const getAuthHeader = () => {
    if (!token) return {};
    return { 'Authorization': `Bearer ${token}` };
  };

  const value = {
    user,
    token,
    loading,
    isAuthenticated,
    login,
    logout,
    getAuthHeader
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
