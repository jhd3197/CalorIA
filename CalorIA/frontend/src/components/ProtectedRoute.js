import React, { useState, useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { isAuthenticated, checkAuthHealth, clearAuthData } from '../utils/api';

function ProtectedRoute() {
  const [authStatus, setAuthStatus] = useState('checking'); // 'checking', 'authenticated', 'unauthenticated'

  useEffect(() => {
    const validateAuth = async () => {
      // First check if we have token and user data
      if (!isAuthenticated()) {
        console.log('No authentication data found, redirecting to login');
        setAuthStatus('unauthenticated');
        return;
      }

      try {
        // Validate token with backend
        await checkAuthHealth();
        console.log('Authentication validation successful');
        setAuthStatus('authenticated');
      } catch (error) {
        console.error('Authentication validation failed:', error);
        
        // Clear any stale authentication data
        clearAuthData();
        setAuthStatus('unauthenticated');
      }
    };

    validateAuth();
  }, []);

  // Show loading spinner while checking authentication
  if (authStatus === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // If authenticated, render the child routes (Outlet)
  // If not, redirect to login page
  return authStatus === 'authenticated' ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;