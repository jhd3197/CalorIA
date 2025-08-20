import React, { useState } from 'react';
import { Sun, Clock, Moon, Smile, Coffee, Egg, Sandwich, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const MealTimeline = ({ mealsData }) => {
  const [expandedMeals, setExpandedMeals] = useState({ breakfast: true });

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

  const meals = mealsData || defaultMeals;

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
            <span className="ml-2 text-sm text-gray-500">({mealData.items.length} items)</span>
          </div>
          <div className="flex items-center">
            <span className="text-sm font-medium mr-2">{mealData.totalCalories} kcal</span>
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            )}
          </div>
        </div>
        
        {isExpanded && (
          <div className="mt-4 space-y-3">
            {mealData.items.map((item) => {
              const ItemIcon = item.icon;
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
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 pb-4">
        <h2 className="heading text-lg font-semibold mb-4">Meal Timeline</h2>
      </div>
      <div className="divide-y divide-gray-100">
        <MealSection mealType="breakfast" mealData={meals.breakfast} title="Breakfast" />
        <MealSection mealType="lunch" mealData={meals.lunch} title="Lunch" />
        <MealSection mealType="dinner" mealData={meals.dinner} title="Dinner" />
        <MealSection mealType="snacks" mealData={meals.snacks} title="Snacks" />
      </div>
    </div>
  );
};

export default MealTimeline;