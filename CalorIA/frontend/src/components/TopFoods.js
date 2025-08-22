import React from 'react';
import { Coffee, Sandwich, Apple } from 'lucide-react';

const TopFoods = ({ topFoodsData }) => {
  // Default foods data if none provided
  const defaultFoods = [
    { name: 'Coffee with milk', frequency: '5 times', calories: 250, icon: Coffee },
    { name: 'Grilled chicken', frequency: '4 times', calories: 1320, icon: Sandwich },
    { name: 'Quinoa salad', frequency: '3 times', calories: 1050, icon: Sandwich },
    { name: 'Apple', frequency: '3 times', calories: 360, icon: Apple },
    { name: 'Whole wheat toast', frequency: '3 times', calories: 690, icon: Sandwich }
  ];

  // Use provided data or fallback to default, ensure it's an array
  const topFoods = Array.isArray(topFoodsData) ? topFoodsData : defaultFoods;

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="heading text-lg font-semibold mb-4">Top Foods This Week</h2>
      <div className="space-y-3">
        {topFoods.length > 0 ? topFoods.map((food, index) => {
          // Ensure food object has expected structure
          const safeName = food?.name || 'Unknown food';
          const safeFrequency = food?.frequency || '0 times';
          const safeCalories = food?.calories || 0;
          const IconComponent = food?.icon || Sandwich;
          
          return (
            <div key={index} className="flex items-center">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
                <IconComponent className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium">{safeName}</p>
                <p className="text-sm text-gray-500">{safeFrequency}</p>
              </div>
              <span className="font-medium">{safeCalories} kcal</span>
            </div>
          );
        }) : (
          <div className="text-center text-gray-500 py-4">
            <p>No food data available</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopFoods;