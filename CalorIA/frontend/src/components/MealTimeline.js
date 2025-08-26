import React, { useState, useEffect } from 'react';
import { Sun, Clock, Moon, Smile, Coffee, Egg, Sandwich, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { fetchDashboardData, fetchMeals, getUserData } from '../utils/api';

const MealTimeline = ({ mealsData }) => {
  const [expandedMeals, setExpandedMeals] = useState({ breakfast: true });
  const [apiMeals, setApiMeals] = useState(null);
  const [transformedPropData, setTransformedPropData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Transform API data from /api/user/{user_id}/meals to match component expected format
  const transformApiMealsData = (apiResponse) => {
    console.log("[MealTimeline] Starting API meals data transformation");
    
    if (!apiResponse || !apiResponse.meals || !Array.isArray(apiResponse.meals)) {
      console.error("[MealTimeline] Invalid or missing meals data in API response:", apiResponse);
      return null;
    }
    
    console.log("[MealTimeline] API response contains", apiResponse.meals.length, "meals");
    
    // Initialize result with empty meal types
    const result = {
      breakfast: { items: [], totalCalories: 0 },
      lunch: { items: [], totalCalories: 0 },
      dinner: { items: [], totalCalories: 0 },
      snacks: { items: [], totalCalories: 0 }
    };
    
    // Process each meal from the API response
    apiResponse.meals.forEach((meal, mealIndex) => {
      // Standardize meal type (ensure "snack" becomes "snacks" to match component)
      let componentMealType = meal.meal_type;
      if (componentMealType === 'snack') {
        componentMealType = 'snacks';
      }
      
      // Skip if not a recognized meal type
      if (!result[componentMealType]) {
        console.warn(`[MealTimeline] Unknown meal type: ${meal.meal_type}, skipping`);
        return;
      }
      
      console.log(`[MealTimeline] Processing ${meal.food_items.length} food items for meal type: ${componentMealType}`);
      
      // Process each food item in the meal
      meal.food_items.forEach((item, itemIndex) => {
        const transformedItem = {
          id: `${componentMealType}-${itemIndex}`,
          name: item.name,
          portion: item.portion_size || '1 serving',
          calories: item.calories,
          icon: getMealIcon(componentMealType)
        };
        
        // Add to result and update calorie total
        result[componentMealType].items.push(transformedItem);
        result[componentMealType].totalCalories += item.calories;
      });
    });
    
    console.log("[MealTimeline] Transformation complete. Result:", result);
    return result;
  };

  // Transform dashboard data to match component expected format
  const transformMealData = (mealTimelineData) => {
    const result = {};
    
    // Process each meal type (breakfast, lunch, dinner, snack)
    Object.entries(mealTimelineData).forEach(([mealType, mealData]) => {
      // Map "snack" to "snacks" to match component expectations
      const componentMealType = mealType === 'snack' ? 'snacks' : mealType;
      
      // Map items and convert "quantity" to "portion"
      const transformedItems = Array.isArray(mealData.items) ? mealData.items.map((item, index) => ({
        id: `${componentMealType}-${index}`, // Generate unique ID
        name: item.name,
        portion: item.quantity, // Map quantity to portion
        calories: item.calories,
        icon: getMealIcon(componentMealType) // Use existing icon getter
      })) : [];
      
      // Create transformed meal data structure
      result[componentMealType] = {
        items: transformedItems,
        totalCalories: mealData.totalCalories || 0
      };
    });
    
    return result;
  };
// Check if data is in raw API format (has count, meals array, and user_id)
const isRawApiFormat = (data) => {
  return data &&
         typeof data === 'object' &&
         data.hasOwnProperty('count') &&
         data.hasOwnProperty('meals') &&
         Array.isArray(data.meals) &&
         data.hasOwnProperty('user_id');
};

// Process mealsData prop if it's in raw API format
useEffect(() => {
  if (!mealsData) return;
  
  if (isRawApiFormat(mealsData)) {
    // Prop data is in raw API format, needs transformation
    console.log("[MealTimeline] Detected raw API format in prop data, transforming...");
    const transformed = transformApiMealsData(mealsData);
    setTransformedPropData(transformed);
    console.log("[MealTimeline] Prop data transformed:", transformed);
  } else {
    // Prop data is already in component format
    console.log("[MealTimeline] Prop data is already in component format, using directly");
    setTransformedPropData(null);
  }
}, [mealsData]);

// Fetch data on component mount
useEffect(() => {
  // Skip API call if mealsData is provided as prop
  if (mealsData) return;
  
    
    const fetchMealsData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Get user data to get user ID
        const userData = getUserData();
        console.log("[MealTimeline] User data:", userData);
        
        if (!userData || !userData.id) {
          // User not logged in, silently fail and use default meals
          console.log("[MealTimeline] No user data available, using default meals");
          setLoading(false);
          return;
        }
        
        try {
          // First try to fetch meals from dedicated meals endpoint
          console.log("[MealTimeline] Fetching meals data for user ID:", userData.id);
          const mealsResponse = await fetchMeals(userData.id);
          console.log("[MealTimeline] Raw API response:", mealsResponse);
          
          if (mealsResponse && mealsResponse.meals) {
            console.log("[MealTimeline] Meals data received, transforming...");
            const transformedApiMeals = transformApiMealsData(mealsResponse);
            console.log("[MealTimeline] Transformed meals data:", transformedApiMeals);
            setApiMeals(transformedApiMeals);
          } else {
            console.warn("[MealTimeline] Meals endpoint returned invalid data structure:", mealsResponse);
          }
        } catch (mealsError) {
          console.warn('[MealTimeline] Could not fetch from meals endpoint, trying dashboard fallback:', mealsError);
          
          // Fallback to dashboard data if meals endpoint fails
          console.log("[MealTimeline] Attempting to fetch dashboard data as fallback");
          const dashboardData = await fetchDashboardData(userData.id);
          console.log("[MealTimeline] Dashboard data received:", dashboardData);
          
          if (dashboardData && dashboardData.mealTimeline) {
            console.log("[MealTimeline] Using mealTimeline from dashboard data");
            const transformedMeals = transformMealData(dashboardData.mealTimeline);
            console.log("[MealTimeline] Transformed dashboard meals data:", transformedMeals);
            setApiMeals(transformedMeals);
          } else {
            console.warn("[MealTimeline] Dashboard data missing mealTimeline property");
          }
        }
        
        setLoading(false);
      } catch (err) {
        console.error('[MealTimeline] Error fetching meal timeline data:', err);
        console.error('[MealTimeline] Error details:', err.message);
        setError('Failed to load meal data');
        setLoading(false);
      }
    };
    
    fetchMealsData();
  }, [mealsData]);

  // Default meals data if none provided
  const defaultMeals = {
    breakfast: {
      items: [
        { id: 1, name: 'Coffee with milk', portion: '1 cup (240ml)', calories: 50, icon: Coffee },
        { id: 2, name: 'Scrambled eggs', portion: '2 large eggs', calories: 140, icon: Egg },
        { id: 3, name: 'Whole wheat toast', portion: '2 slices', calories: 230, icon: Sandwich }
      ],
      totalCalories: 420
    },
    lunch: {
      items: [
        { id: 4, name: 'Grilled chicken', portion: '150g', calories: 330, icon: Sandwich },
        { id: 5, name: 'Quinoa salad', portion: '1 cup', calories: 350, icon: Sandwich }
      ],
      totalCalories: 680
    },
    dinner: {
      items: [
        { id: 6, name: 'Salmon fillet', portion: '120g', calories: 350, icon: Sandwich }
      ],
      totalCalories: 350
    },
    snacks: {
      items: [
        { id: 7, name: 'Apple', portion: '1 medium', calories: 120, icon: Sandwich }
      ],
      totalCalories: 120
    }
  };

  // Use transformed prop data if available, or mealsData if it's already in component format,
  // otherwise use API data, fall back to default meals
  const meals = transformedPropData ||
                (mealsData && !isRawApiFormat(mealsData) ? mealsData : null) ||
                apiMeals ||
                defaultMeals;
  
  // Log which data source is being used
  useEffect(() => {
    if (transformedPropData) {
      console.log("[MealTimeline] Using transformed prop data");
    } else if (mealsData && !isRawApiFormat(mealsData)) {
      console.log("[MealTimeline] Using provided pre-formatted prop data:", mealsData);
    } else if (apiMeals) {
      console.log("[MealTimeline] Using API fetched data");
    } else {
      console.log("[MealTimeline] Using default meal data");
    }
  }, [mealsData, apiMeals]);

  const toggleMealSection = (mealType) => {
    setExpandedMeals(prev => ({
      ...prev,
      [mealType]: !prev[mealType]
    }));
  };

  const getMealIcon = (mealType) => {
    switch (mealType) {
      case 'breakfast': return Sun;
      case 'lunch': return Clock;
      case 'dinner': return Moon;
      case 'snacks': return Smile;
      default: return Sun;
    }
  };

  const MealSection = ({ mealType, mealData, title }) => {
    const IconComponent = getMealIcon(mealType);
    const isExpanded = expandedMeals[mealType];

    // Ensure mealData has expected structure with fallbacks
    const safeItems = mealData?.items || [];
    const safeCalories = mealData?.totalCalories || 0;

    return (
      <div className="p-6">
        <div
          className="flex items-center justify-between cursor-pointer"
          onClick={() => toggleMealSection(mealType)}
        >
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mr-3">
              <IconComponent className="w-4 h-4 text-amber-600" />
            </div>
            <h3 className="font-medium">{title}</h3>
            <span className="ml-2 text-sm text-gray-500">({safeItems.length} items)</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">{safeCalories} kcal</span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 space-y-3">
            {safeItems.length > 0 ? safeItems.map((item) => {
              const ItemIcon = item.icon || Sandwich;
              return (
                <div key={item.id} className="food-item flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                      <ItemIcon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.portion}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <span className="font-medium mr-4">{item.calories} kcal</span>
                    <div className="food-actions opacity-0 flex space-x-2">
                      <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-emerald-600">
                        <Edit className="w-3 h-3" />
                      </button>
                      <button className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-red-600">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center text-gray-500 py-4">
                <p>No items added yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 pb-4">
        <h2 className="heading text-lg font-semibold mb-4">Meal Timeline</h2>
        {loading && <p className="text-gray-500 text-center py-2">Loading meal data...</p>}
        {error && <p className="text-red-500 text-center py-2">{error}</p>}
      </div>
      <div className="divide-y divide-gray-100">
        <MealSection mealType="breakfast" mealData={meals?.breakfast || {}} title="Breakfast" />
        <MealSection mealType="lunch" mealData={meals?.lunch || {}} title="Lunch" />
        <MealSection mealType="dinner" mealData={meals?.dinner || {}} title="Dinner" />
        <MealSection mealType="snacks" mealData={meals?.snacks || {}} title="Snacks" />
      </div>
    </div>
  );
};

export default MealTimeline;