import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';

function ProtectedRoute() {
  // Check if user is logged in
  const isAuthenticated = () => {
    const user = localStorage.getItem('user');
    return !!user; // Returns true if user exists in localStorage
  };

  // If authenticated, render the child routes (Outlet)
  // If not, redirect to login page
  return isAuthenticated() ? <Outlet /> : <Navigate to="/login" replace />;
}

export default ProtectedRoute;