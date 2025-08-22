import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MealTimeline from './components/MealTimeline';
import QuickAdd from './components/QuickAdd';
import TopFoods from './components/TopFoods';
import TrendCharts from './components/TrendCharts';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { isAuthenticated, getCurrentUser, fetchUserProfile, fetchMeals, getUserData, clearAuthData } from './utils/api';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userData, setUserData] = useState(null);
  const [mealsData, setMealsData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize app and fetch user data if authenticated
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if user is authenticated
        if (isAuthenticated()) {
          // Try to get fresh user data from API
          try {
            const currentUserResponse = await getCurrentUser();
            setUserData(currentUserResponse.user);
          } catch (error) {
            console.error('Failed to fetch current user from API, using stored data:', error);
            // Fallback to stored user data if API fails
            const storedUserData = getUserData();
            if (storedUserData) {
              setUserData(storedUserData);
            } else {
              // If no stored data either, clear auth and redirect to login
              clearAuthData();
            }
          }

          // Fetch other data only if authenticated
          await fetchAppData();
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    const fetchAppData = async () => {
      // Get user data to extract user ID
      const storedUserData = getUserData();
      const userId = storedUserData?.user_id || storedUserData?.id;
      
      if (!userId) {
        console.error('No user ID found, skipping data fetch');
        return;
      }

      // Fetch user profile data
      try {
        await fetchUserProfile(userId);
        // User profile data is handled by the API utility
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }

      // Fetch meals data
      try {
        const mealsResponse = await fetchMeals(userId);
        setMealsData(mealsResponse);
      } catch (error) {
        console.error('Failed to fetch meals data:', error);
        // Will use default data in components if API fails
      }
    };

    initializeApp();
  }, []);

  const handleSidebarToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMobileMenuToggle = () => {
    // Mobile menu functionality could be implemented here
    console.log('Mobile menu toggled');
  };

  // Handle responsive design
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      } else {
        setSidebarCollapsed(false);
      }
    };

    handleResize(); // Check on mount
    window.addEventListener('resize', handleResize);

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const DashboardContent = () => (
    <div className="app-container">
      <div className="main-layout">
        {/* Sidebar */}
        <Sidebar collapsed={sidebarCollapsed} onToggle={handleSidebarToggle} />

        {/* Main Content */}
        <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
          {/* Header */}
          <Header onMobileMenuToggle={handleMobileMenuToggle} userData={userData} />

          {/* Dashboard Content */}
          <main className="dashboard-main">
            <div className="dashboard-grid">
              {/* Left Column - Dashboard and Meal Timeline */}
              <div className="dashboard-left">
                <Dashboard userData={userData} mealsData={mealsData} />
                <MealTimeline mealsData={mealsData} />
              </div>

              {/* Right Column - Quick Add, Top Foods, and Trends */}
              <div className="dashboard-right">
                <QuickAdd />
                <TrendCharts />
                <TopFoods />
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Floating Add Button */}
      <button className="floating-button">
        <Plus size={24} />
      </button>
    </div>
  );

  // Check if user is authenticated - using API utility
  const checkAuthenticated = () => {
    return isAuthenticated();
  };

  // Show loading screen while initializing
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading CalorIA...</p>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={checkAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={checkAuthenticated() ? <Navigate to="/dashboard" replace /> : <Register />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardContent />} />
        </Route>
        
        {/* Default Redirect */}
        <Route path="*" element={<Navigate to={checkAuthenticated() ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
