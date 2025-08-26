import React, { useState, useEffect, useRef } from 'react';
import { Target, Activity, Scale, Droplet } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { fetchDashboardData, getUserData } from '../utils/api';
import MacroBreakdown from './MacroBreakdown';

ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = ({ userData: propUserData, mealsData }) => {
  const progressRef = useRef(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [calculatedMacros, setCalculatedMacros] = useState(null);
  const [dataSource, setDataSource] = useState('default');

  // Default data if none provided - wrapped in useMemo to prevent infinite renders
  const defaultUserData = React.useMemo(() => ({
    dailyGoal: 2000,
    consumed: 1450,
    burned: 450,
    weight: 68.5,
    water: 1.8,
    macros: {
      protein: { grams: 85, percent: 34 },
      carbs: { grams: 120, percent: 48 },
      fat: { grams: 45, percent: 18 },
      other: { grams: 10, percent: 0 }
    }
  }), []); // Empty dependency array means this only runs once

  // Function to calculate macros from mealsData
  const calculateMacrosFromMeals = (meals) => {
    if (!meals || !Array.isArray(meals.mealTimeline?.breakfast?.items)) {
      console.log("No valid meal data available for macro calculation");
      return null;
    }

    console.log("Calculating macros from meals data");
    
    // Initialize macro totals
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalCalories = 0;
    
    // Process each meal type
    const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
    
    mealTypes.forEach(mealType => {
      const mealItems = meals.mealTimeline?.[mealType]?.items || [];
      
      // Sum up macros from each food item
      mealItems.forEach(item => {
        if (item.protein_g) totalProtein += item.protein_g;
        if (item.carbs_g) totalCarbs += item.carbs_g;
        if (item.fat_g) totalFat += item.fat_g;
        if (item.calories) totalCalories += item.calories;
      });
    });
    
    // If we have calorie data but no macro data, can't calculate percentages
    if (totalCalories === 0) {
      console.log("No calorie data available in meals");
      return null;
    }
    
    // Calculate macro percentages based on caloric values
    const proteinCalories = totalProtein * 4;
    const carbsCalories = totalCarbs * 4;
    const fatCalories = totalFat * 9;
    
    // Only calculate percentages if we have some macro data
    const hasAnyMacroData = totalProtein > 0 || totalCarbs > 0 || totalFat > 0;
    
    return {
      protein: {
        grams: Math.round(totalProtein),
        percent: hasAnyMacroData ? Math.round((proteinCalories / totalCalories) * 100) : 0
      },
      carbs: {
        grams: Math.round(totalCarbs),
        percent: hasAnyMacroData ? Math.round((carbsCalories / totalCalories) * 100) : 0
      },
      fat: {
        grams: Math.round(totalFat),
        percent: hasAnyMacroData ? Math.round((fatCalories / totalCalories) * 100) : 0
      },
      other: { grams: 0, percent: 0 }
    };
  };

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get user ID from local storage
        const storedUser = getUserData();
        const userId = storedUser?.user_id || storedUser?.id;
        
        if (!userId) {
          throw new Error('User ID not found. Please log in again.');
        }
        
        // Get current date in YYYY-MM-DD format
        const today = new Date();
        const dateStr = today.toISOString().split('T')[0];
        
        // Fetch data from API
        const data = await fetchDashboardData(userId, dateStr);
        setDashboardData(data);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Calculate macros from mealsData when available
  useEffect(() => {
    if (mealsData) {
      console.log("[Dashboard] Processing mealsData:", mealsData);
      const calculatedMacros = calculateMacrosFromMeals(mealsData);
      setCalculatedMacros(calculatedMacros);
      console.log("[Dashboard] Macros calculated from meals data:", calculatedMacros);
    }
  }, [mealsData]);

  // Determine macros and data source in a useEffect to prevent infinite render loops
  const [macros, setMacros] = useState(defaultUserData.macros);
  
  useEffect(() => {
    console.log("[Dashboard] Determining macro data source priority...");
    console.log("[Dashboard] API data available:", !!dashboardData?.macros?.protein?.grams);
    console.log("[Dashboard] Calculated macros available:", !!calculatedMacros);
    console.log("[Dashboard] Prop macros available:", !!propUserData?.macros?.protein?.grams);
    
    // Check if we have macros from API
    if (dashboardData?.macros?.protein?.grams) {
      setDataSource('api');
      console.log("[Dashboard] Using macro data from API:", dashboardData.macros);
      setMacros(dashboardData.macros);
    }
    // Check if we have calculated macros from meals
    else if (calculatedMacros) {
      setDataSource('calculated');
      console.log("[Dashboard] Using calculated macro data from meals:", calculatedMacros);
      setMacros(calculatedMacros);
    }
    // Check if we have macros from props
    else if (propUserData?.macros?.protein?.grams) {
      setDataSource('props');
      console.log("[Dashboard] Using macro data from props:", propUserData.macros);
      setMacros(propUserData.macros);
    }
    // Fall back to defaults as a last resort
    else {
      setDataSource('default');
      console.log("[Dashboard] Using default macro data:", defaultUserData.macros);
      setMacros(defaultUserData.macros);
    }
  }, [dashboardData, calculatedMacros, propUserData]); // Removed defaultUserData from deps
  
  // Build final data object with the properly prioritized macros
  // Using useMemo to prevent unnecessary recalculations on every render
  const data = React.useMemo(() => ({
    ...defaultUserData,
    ...(dashboardData || {}),
    ...propUserData,
    macros
  }), [defaultUserData, dashboardData, propUserData, macros]);
  
  // Add fallbacks for calculations
  const dailyGoal = data.dailyGoal || defaultUserData.dailyGoal;
  const consumed = data.consumed || 0;
  const burned = data.burned || 0;
  const remaining = dailyGoal - consumed;
  const net = consumed - burned;

  // Setup progress ring
  useEffect(() => {
    if (progressRef.current) {
      const circle = progressRef.current;
      const radius = 40;
      const circumference = 2 * Math.PI * radius;
      
      circle.style.strokeDasharray = `${circumference} ${circumference}`;
      circle.style.strokeDashoffset = circumference;
      
      const progress = consumed / dailyGoal;
      const offset = circumference - progress * circumference;
      circle.style.strokeDashoffset = offset;
      
      // Set color based on progress
      if (progress < 0.7) {
        circle.style.stroke = '#22C55E'; // green
      } else if (progress < 0.9) {
        circle.style.stroke = '#F59E0B'; // amber
      } else {
        circle.style.stroke = '#EF4444'; // red
      }
    }
  }, [consumed, dailyGoal]);


  // Trend and weight charts are handled in the TrendCharts component

  return (
    <>
      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-emerald-500"></div>
          <p className="ml-3 text-gray-600">Loading dashboard data...</p>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading dashboard data</h3>
              <p className="text-sm mt-1">{error}</p>
              <p className="text-sm mt-2">Showing default values instead.</p>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard content - hidden while loading */}
      {!isLoading && (
        <>
          {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
              <Target className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Daily Goal</p>
              <p className="font-semibold">{dailyGoal.toLocaleString()} kcal</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Activity</p>
              <p className="font-semibold">{burned} kcal</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
              <Scale className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Weight</p>
              <p className="font-semibold">{data.weight || 0} kg</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
              <Droplet className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Water</p>
              <p className="font-semibold">{data.water || 0} L</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today at a Glance */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="heading text-lg font-semibold mb-4">Today at a Glance</h2>
            <div className="flex flex-col md:flex-row items-center">
              <div className="relative w-48 h-48 mb-6 md:mb-0 md:mr-6">
                <svg className="w-full h-full" viewBox="0 0 100 100">
                  <circle 
                    className="text-gray-100" 
                    strokeWidth="8" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="40" 
                    cx="50" 
                    cy="50" 
                  />
                  <circle 
                    ref={progressRef}
                    className="progress-ring__circle text-emerald-500" 
                    strokeWidth="8" 
                    strokeLinecap="round" 
                    stroke="currentColor" 
                    fill="transparent" 
                    r="40" 
                    cx="50" 
                    cy="50" 
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold">{consumed.toLocaleString()}</span>
                  <span className="text-sm text-gray-500">kcal consumed</span>
                  <span className="text-emerald-600 font-medium mt-1">{remaining} remaining</span>
                </div>
              </div>
              <div className="flex-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Goal</p>
                    <p className="font-semibold">{dailyGoal.toLocaleString()} kcal</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Burned</p>
                    <p className="font-semibold">{burned} kcal</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Net</p>
                    <p className="font-semibold">{net.toLocaleString()} kcal</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <p className="font-semibold text-emerald-600">On track</p>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Protein</span>
                    <span className="text-sm font-medium">
                      {data.macros?.protein?.grams || 0}g ({data.macros?.protein?.percent || 0}%)
                      {dataSource === 'default' && <span className="text-xs text-gray-400 ml-1">(default)</span>}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full" style={{width: `${data.macros?.protein?.percent || 0}%`}}></div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Carbs</span>
                    <span className="text-sm font-medium">
                      {data.macros?.carbs?.grams || 0}g ({data.macros?.carbs?.percent || 0}%)
                      {dataSource === 'default' && <span className="text-xs text-gray-400 ml-1">(default)</span>}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-amber-500 h-2 rounded-full" style={{width: `${data.macros?.carbs?.percent || 0}%`}}></div>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-gray-500">Fat</span>
                    <span className="text-sm font-medium">
                      {data.macros?.fat?.grams || 0}g ({data.macros?.fat?.percent || 0}%)
                      {dataSource === 'default' && <span className="text-xs text-gray-400 ml-1">(default)</span>}
                    </span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full" style={{width: `${data.macros?.fat?.percent || 0}%`}}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Macro Breakdown - Now uses the MacroBreakdown component with proper data structure */}
          <MacroBreakdown mealsData={
            // Structure the data properly for MacroBreakdown
            mealsData?.mealTimeline ?
              // If we have meal timeline data, convert to the format MacroBreakdown expects
              {
                meals: [
                  ...(mealsData.mealTimeline.breakfast?.items ? [{ food_items: mealsData.mealTimeline.breakfast.items }] : []),
                  ...(mealsData.mealTimeline.lunch?.items ? [{ food_items: mealsData.mealTimeline.lunch.items }] : []),
                  ...(mealsData.mealTimeline.dinner?.items ? [{ food_items: mealsData.mealTimeline.dinner.items }] : []),
                  ...(mealsData.mealTimeline.snack?.items ? [{ food_items: mealsData.mealTimeline.snack.items }] : [])
                ]
              }
              : dashboardData?.macros ?
                // If we have macros directly, use those
                { macros: dashboardData.macros }
                :
                // Last resort: use calculated macros
                calculatedMacros ? { macros: calculatedMacros } : null
          } />
        </div>
      </div>
       </>
     )}
   </>
 );
};

export default Dashboard;
