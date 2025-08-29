import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import MealTimeline from './components/MealTimeline';
import QuickAdd from './components/QuickAdd';
import TopFoods from './components/TopFoods';
import TrendCharts from './components/TrendCharts';
import MealPlanner from './components/MealPlanner';
import MealPrepForm from './components/MealPrepForm';
import ActivityPage from './components/ActivityPage';
import Recipes from './components/Recipes';
import RecipeDetails from './components/RecipeDetails';
import Ingredients from './components/Ingredients';
import GroceryList from './components/GroceryList';
import SettingsPage from './components/SettingsPage';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';
import { isAuthenticated, getCurrentUser, fetchUserProfile, getUserData, clearAuthData } from './utils/api';

function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userData, setUserData] = useState(null);
  const [mealsData, setMealsData] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authState, setAuthState] = useState('checking'); // 'checking', 'authenticated', 'unauthenticated'

  // Initialize app and fetch user data if authenticated
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Check if user is authenticated
        if (isAuthenticated()) {
          console.log('User appears to be authenticated, validating...');
          // Try to get fresh user data from API
          try {
            const currentUserResponse = await getCurrentUser();
            setUserData(currentUserResponse.user);
            setAuthState('authenticated');
            
            // Fetch other data only if authenticated
            await fetchAppData();
          } catch (error) {
            console.error('Failed to fetch current user from API:', error);
            
            // If it's an authentication error, clear everything
            if (error.message === 'AUTHENTICATION_FAILED') {
              clearAuthData();
              setUserData(null);
              setMealsData(null);
              setAuthState('unauthenticated');
            } else {
              // For other errors, try to use stored data
              const storedUserData = getUserData();
              if (storedUserData) {
                setUserData(storedUserData);
                setAuthState('authenticated');
                await fetchAppData();
              } else {
                clearAuthData();
                setAuthState('unauthenticated');
              }
            }
          }
        } else {
          console.log('User not authenticated');
          setAuthState('unauthenticated');
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setAuthState('unauthenticated');
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

  // Layout wrapper component to be used with React Router
  const AppLayout = ({ children }) => {
    const location = useLocation();
    const currentPath = location.pathname;
    
    return (
      <div className="app-container">
        <div className="main-layout">
          {/* Sidebar */}
          <Sidebar
            collapsed={sidebarCollapsed}
            onToggle={handleSidebarToggle}
            currentPath={currentPath}
          />

          {/* Main Content */}
          <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
            {/* Header */}
            <Header onMobileMenuToggle={handleMobileMenuToggle} userData={userData} />

            {/* Page Content */}
            <main className="dashboard-main">
              {children}
            </main>
          </div>
        </div>

      </div>
    );
  };

  // Individual page components
  const DashboardPage = () => (
    <div className="dashboard-grid">
      {/* Left Column - Dashboard (includes Meal Timeline internally) */}
      <div className="dashboard-left">
        <Dashboard userData={userData} mealsData={mealsData} />
      </div>

      {/* Right Column - Quick Add, Top Foods, and Trends */}
      <div className="dashboard-right">
        <QuickAdd />
        <TrendCharts />
        <TopFoods />
      </div>
    </div>
  );

  // Check if user is authenticated - using API utility and auth state
  const checkAuthenticated = () => {
    return authState === 'authenticated' && isAuthenticated();
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
        <Route
          path="/login"
          element={checkAuthenticated() ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/register"
          element={checkAuthenticated() ? <Navigate to="/dashboard" replace /> : <Register />}
        />
        
        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={
            <AppLayout>
              <DashboardPage />
            </AppLayout>
          } />
          <Route path="/meal-planner" element={
            <AppLayout>
              <MealPlanner userData={userData} />
            </AppLayout>
          } />
          <Route path="/meal-prep" element={
            <AppLayout>
              <MealPrepForm />
            </AppLayout>
          } />
          <Route path="/activity" element={
            <AppLayout>
              <ActivityPage userData={userData} />
            </AppLayout>
          } />
          <Route path="/recipes" element={
            <AppLayout>
              <Recipes userData={userData} />
            </AppLayout>
          } />
          <Route path="/recipes/:id" element={
            <AppLayout>
              <RecipeDetails />
            </AppLayout>
          } />
          <Route path="/recipes/:id/edit" element={
            <AppLayout>
              <RecipeDetails />
            </AppLayout>
          } />
          <Route path="/ingredients" element={
            <AppLayout>
              <Ingredients userData={userData} />
            </AppLayout>
          } />
          <Route path="/grocery-list" element={
            <AppLayout>
              <GroceryList userData={userData} />
            </AppLayout>
          } />
          <Route path="/settings" element={
            <AppLayout>
              <SettingsPage userData={userData} />
            </AppLayout>
          } />
        </Route>
        
        {/* Default Redirect */}
        <Route path="*" element={<Navigate to={checkAuthenticated() ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </Router>
  );
}

export default App;
