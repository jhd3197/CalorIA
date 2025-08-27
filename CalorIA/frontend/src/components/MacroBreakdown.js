import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const MacroBreakdown = ({ mealsData }) => {
  const [macros, setMacros] = useState({
    protein: { grams: 0, percent: 0 },
    carbs: { grams: 0, percent: 0 },
    fat: { grams: 0, percent: 0 },
    other: { grams: 0, percent: 0 }
  });
  
  // Calculate macros from meal food items - based on backend implementation
  const calculateMacrosFromMeals = (meals) => {
    console.log("[MacroBreakdown] Calculating macros from meals:", meals);
    
    // Handle case where meals is an object with a meals property (API response format)
    if (meals && !Array.isArray(meals) && Array.isArray(meals.meals)) {
      meals = meals.meals;
    }
    
    if (!meals || !Array.isArray(meals)) {
      console.error("[MacroBreakdown] Invalid meals data format:", meals);
      return null;
    }
    
    // Initialize macro totals (matching backend structure)
    let totalCalories = 0;
    let totalProteinG = 0;
    let totalCarbsG = 0;
    let totalFatG = 0;
    
    // Process each meal - directly mirroring backend logic
    for (const meal of meals) {
      if (!meal.food_items || !Array.isArray(meal.food_items)) {
        console.warn("[MacroBreakdown] Meal missing food_items:", meal);
        continue; // Skip this meal but continue processing others
      }
      
      // Sum up nutrition from each food item (directly matching backend approach)
      for (const item of meal.food_items) {
        // Update daily totals - always add the value (or 0 if undefined)
        totalCalories += item.calories || 0;
        totalProteinG += item.protein_g || item.protein || 0;
        totalCarbsG += item.carbs_g || item.carbs || 0;
        totalFatG += item.fat_g || item.fat || 0;
      }
    }
    
    // Calculate macro percentages if there are calories
    let proteinPercent = 0;
    let carbsPercent = 0;
    let fatPercent = 0;
    
    if (totalCalories > 0) {
      // Calculate calories from each macro
      const proteinCalories = totalProteinG * 4; // 4 calories per gram
      const carbsCalories = totalCarbsG * 4;     // 4 calories per gram
      const fatCalories = totalFatG * 9;         // 9 calories per gram
      
      // Calculate percentages using total calories as denominator (matching backend)
      proteinPercent = Math.round((proteinCalories / totalCalories) * 100);
      carbsPercent = Math.round((carbsCalories / totalCalories) * 100);
      fatPercent = Math.round((fatCalories / totalCalories) * 100);
    }
    
    // Create result object - structure expected by component
    const calculatedMacros = {
      protein: { grams: Math.round(totalProteinG), percent: proteinPercent },
      carbs: { grams: Math.round(totalCarbsG), percent: carbsPercent },
      fat: { grams: Math.round(totalFatG), percent: fatPercent },
      other: { grams: 0, percent: 0 } // Other is simplified as backend doesn't use it
    };
    
    console.log("[MacroBreakdown] Calculated macros:", calculatedMacros);
    return calculatedMacros;
  };
  
  // Process mealsData prop if it's provided directly - simplified to match backend approach
  useEffect(() => {
    if (!mealsData) return;
    
    console.log("[MacroBreakdown] Received mealsData prop:", mealsData);
    
    // Check if mealsData has a meals array (standard format)
    if (mealsData.meals && Array.isArray(mealsData.meals)) {
      console.log("[MacroBreakdown] Processing meals array");
      const calculatedMacros = calculateMacrosFromMeals(mealsData);
      if (calculatedMacros) {
        setMacros(calculatedMacros);
      }
    }
    // Handle case where mealsData already contains processed macros
    else if (mealsData.macros) {
      console.log("[MacroBreakdown] Using provided macros data");
      setMacros(mealsData.macros);
    }
    // Handle mealTimeline format
    else if (mealsData.mealTimeline) {
      console.log("[MacroBreakdown] Converting mealTimeline format");
      
      // Create an array of food items from all meal types
      const allItems = [];
      const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'];
      
      for (const type of mealTypes) {
        const items = mealsData.mealTimeline[type]?.items;
        if (items && Array.isArray(items)) {
          // Add all items regardless of whether array is empty
          allItems.push(...items);
        }
      }
      
      // Create a temporary meal structure matching the expected format
      const tempMeals = { meals: [{ food_items: allItems }] };
      const calculatedMacros = calculateMacrosFromMeals(tempMeals);
      
      if (calculatedMacros) {
        setMacros(calculatedMacros);
      }
    }
  }, [mealsData]);
  
  // Prepare chart data - Always use the grams value directly without conditionals
  const macroChartData = {
    labels: ['Protein', 'Carbs', 'Fat'],  // Removed 'Other' category to match backend
    datasets: [{
      data: [
        macros.protein.grams,
        macros.carbs.grams,
        macros.fat.grams
        // 'Other' category removed as it's not used in backend calculations
      ],
      backgroundColor: ['#3B82F6', '#F59E0B', '#8B5CF6'],
      borderWidth: 0
    }]
  };
  
  const macroChartOptions = {
    cutout: '70%',
    plugins: {
      legend: { display: false }
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="heading text-lg font-semibold">Macro Breakdown</h2>
      </div>

      <div className="flex flex-col md:flex-row items-center">
        <div className="w-48 h-48 mb-6 md:mb-0 md:mr-6">
          <Doughnut data={macroChartData} options={macroChartOptions} />
        </div>
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-emerald-50 p-3 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
              <span className="text-sm font-medium">Protein</span>
            </div>
            <p className="text-xl font-bold mt-1">{macros.protein.grams}g</p>
            <p className="text-sm text-gray-500">{macros.protein.percent}% of total</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-amber-500 mr-2"></div>
              <span className="text-sm font-medium">Carbs</span>
            </div>
            <p className="text-xl font-bold mt-1">{macros.carbs.grams}g</p>
            <p className="text-sm text-gray-500">{macros.carbs.percent}% of total</p>
          </div>
          <div className="bg-emerald-50 p-3 rounded-lg">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
              <span className="text-sm font-medium">Fat</span>
            </div>
            <p className="text-xl font-bold mt-1">{macros.fat.grams}g</p>
            <p className="text-sm text-gray-500">{macros.fat.percent}% of total</p>
          </div>
          {/* Other category removed to match backend approach */}
        </div>
      </div>
    </div>
  );
};

export default MacroBreakdown;