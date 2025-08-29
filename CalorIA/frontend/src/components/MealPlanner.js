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
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
              <Calendar className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">This Week</p>
              <p className="font-semibold">7 Days Planned</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <Target className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Daily Average</p>
              <p className="font-semibold">1,850 kcal</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
              <ChefHat className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Recipes</p>
              <p className="font-semibold">28 Planned</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
              <Utensils className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Prep Time</p>
              <p className="font-semibold">4.5 hrs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* Week Selection */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="heading text-lg font-semibold">Weekly Meal Planner</h2>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 text-sm bg-emerald-50 text-emerald-600 rounded-lg">This Week</button>
              <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg">Next Week</button>
              <button className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg flex items-center">
                <Plus className="w-4 h-4 mr-1" />
                Add Meal
              </button>
            </div>
          </div>

          {/* Weekly Calendar Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
            {weekDays.map((day, dayIndex) => (
              <div key={day} className="border rounded-lg p-3">
                <h3 className="font-semibold text-center mb-3 text-gray-700">{day}</h3>
                <div className="space-y-2">
                  {mealTypes.map((mealType) => {
                    const meal = sampleMeals[day]?.[mealType];
                    return (
                      <div key={mealType} className="border-l-4 border-emerald-400 pl-2 py-1">
                        <p className="text-xs font-medium text-gray-500 uppercase">{mealType}</p>
                        {meal ? (
                          <div className="mt-1">
                            <p className="text-sm font-medium">{meal.name}</p>
                            <p className="text-xs text-gray-500">{meal.calories} kcal</p>
                            <div className="flex items-center mt-1">
                              <Clock className="w-3 h-3 mr-1 text-gray-400" />
                              <span className="text-xs text-gray-500">{meal.time}</span>
                            </div>
                          </div>
                        ) : (
                          <button className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center mt-1">
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