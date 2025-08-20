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

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userData, setUserData] = useState(null);
  const [mealsData, setMealsData] = useState(null);

  // Fetch data from backend APIs
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch('http://localhost:4032/api/user');
        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        }
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        // Will use default data in components if API fails
      }
    };

    const fetchMealsData = async () => {
      try {
        const response = await fetch('http://localhost:4032/api/meals');
        if (response.ok) {
          const data = await response.json();
          setMealsData(data);
        }
      } catch (error) {
        console.error('Failed to fetch meals data:', error);
        // Will use default data in components if API fails
      }
    };

    fetchUserData();
    fetchMealsData();
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
          <Header onMobileMenuToggle={handleMobileMenuToggle} />

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

  // Check if user is authenticated
  const isAuthenticated = () => {
    return localStorage.getItem('user') !== null;
  };

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />} />
        <Route path="/register" element={isAuthenticated() ? <Navigate to="/dashboard" replace /> : <Register />} />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardContent />} />
        </Route>
        
        {/* Default Redirect */}
        <Route path="*" element={<Navigate to={isAuthenticated() ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
