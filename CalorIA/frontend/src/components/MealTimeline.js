import React, { useState, useEffect } from 'react';
import { Sun, Clock, Moon, Smile, Coffee, Egg, Sandwich, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const MealTimeline = ({ mealsData }) => {
  const [expandedMeals, setExpandedMeals] = useState({ breakfast: true });


// Process mealsData prop - now only handles properly formatted data from Dashboard
useEffect(() => {
  if (!mealsData) return;

  console.log("[MealTimeline] Received mealsData prop:", mealsData);
}, [mealsData]);

  // Default meals data if none provided
  const defaultMeals = {
    breakfast: {
      items: [],
      totalCalories: 0
    },
    lunch: {
      items: [],
      totalCalories: 0
    },
    dinner: {
      items: [],
      totalCalories: 0
    },
    snacks: {
      items: [],
      totalCalories: 0
    }
  };

  // Use mealsData from props (now properly formatted by Dashboard), fall back to default meals
  const meals = mealsData || defaultMeals;

  // Log which data source is being used
  useEffect(() => {
    if (mealsData) {
      console.log("[MealTimeline] Using mealsData from Dashboard:", mealsData);
    } else {
      console.log("[MealTimeline] Using default meal data");
    }
  }, [mealsData]);

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
                <div key={item.id} className="food-item flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                      <ItemIcon className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{item.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{item.portion}</p>
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
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">
                <p>No items added yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow">
      <div className="p-6 pb-4">
        <h2 className="heading text-lg font-semibold mb-4 text-gray-900 dark:text-white">Meal Timeline</h2>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-slate-600">
        <MealSection mealType="breakfast" mealData={meals?.breakfast || {}} title="Breakfast" />
        <MealSection mealType="lunch" mealData={meals?.lunch || {}} title="Lunch" />
        <MealSection mealType="dinner" mealData={meals?.dinner || {}} title="Dinner" />
        <MealSection mealType="snacks" mealData={meals?.snacks || {}} title="Snacks" />
      </div>
    </div>
  );
};

export default MealTimeline;