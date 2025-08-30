import React, { useState } from 'react';
import { Calendar, Clock, Plus, ChefHat, Target, Utensils } from 'lucide-react';

const MealPlanner = () => {
  const [selectedWeek, setSelectedWeek] = useState('This Week');
  
  // Sample meal plan data
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mealTypes = ['Breakfast', 'Lunch', 'Dinner', 'Snacks'];
  
  const sampleMeals = {
    Monday: {
      Breakfast: { name: 'Oatmeal with berries', calories: 350, time: '8:00 AM' },
      Lunch: { name: 'Chicken salad', calories: 450, time: '12:30 PM' },
      Dinner: { name: 'Salmon with vegetables', calories: 600, time: '7:00 PM' },
      Snacks: { name: 'Greek yogurt', calories: 150, time: '3:00 PM' }
    },
    Tuesday: {
      Breakfast: { name: 'Scrambled eggs toast', calories: 400, time: '8:00 AM' },
      Lunch: { name: 'Turkey sandwich', calories: 380, time: '12:30 PM' },
      Dinner: { name: 'Beef stir-fry', calories: 550, time: '7:00 PM' },
      Snacks: { name: 'Apple slices', calories: 80, time: '3:00 PM' }
    }
  };

  return (
    <>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mr-3">
              <Calendar className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">This Week</p>
              <p className="font-semibold text-gray-900 dark:text-white">7 Days Planned</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
              <Target className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Daily Average</p>
              <p className="font-semibold text-gray-900 dark:text-white">1,850 kcal</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mr-3">
              <ChefHat className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Recipes</p>
              <p className="font-semibold text-gray-900 dark:text-white">28 Planned</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3">
              <Utensils className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Prep Time</p>
              <p className="font-semibold text-gray-900 dark:text-white">4.5 hrs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Week Selection */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading text-lg font-semibold text-gray-900 dark:text-white">Weekly Meal Planner</h2>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm bg-emerald-50 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400 rounded-lg">This Week</button>
              <button className="px-3 py-1 text-sm bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-lg">Next Week</button>
              <button className="px-4 py-2 text-sm bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg flex items-center hover:bg-emerald-700 dark:hover:bg-emerald-600">
                <Plus className="w-4 h-4 mr-1" />
                Add Meal
              </button>
            </div>
          </div>

          {/* Weekly Calendar Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {weekDays.map((day, dayIndex) => (
              <div key={day} className="border border-gray-200 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-800">
                <h3 className="font-semibold text-center mb-3 text-gray-700 dark:text-gray-300">{day}</h3>
                <div className="space-y-2">
                  {mealTypes.map((mealType) => {
                    const meal = sampleMeals[day]?.[mealType];
                    return (
                      <div key={mealType} className="border-l-4 border-emerald-400 dark:border-emerald-500 pl-2 py-1">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">{mealType}</p>
                        {meal ? (
                          <div className="mt-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{meal.name}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{meal.calories} kcal</p>
                            <div className="flex items-center mt-1">
                              <Clock className="w-3 h-3 mr-1 text-gray-400 dark:text-gray-500" />
                              <span className="text-xs text-gray-500 dark:text-gray-400">{meal.time}</span>
                            </div>
                          </div>
                        ) : (
                          <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 flex items-center mt-1">
                            <Plus className="w-3 h-3 mr-1" />
                            Add meal
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </>
  );
};

export default MealPlanner;