import React, { useState } from 'react';
import { Search, Camera } from 'lucide-react';

const QuickAdd = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [calories, setCalories] = useState('');
  const [portion, setPortion] = useState('1 serving');

  const handleAddFood = () => {
    // This will be connected to the backend API later
    console.log('Adding food:', { searchTerm, calories, portion });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="heading text-lg font-semibold mb-4">Quick Add</h2>
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search food..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
        <button className="absolute right-3 top-2 text-gray-400 hover:text-emerald-600">
          <Search className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-sm text-gray-500 mb-1">Calories</label>
          <input
            type="number"
            placeholder="kcal"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-500 mb-1">Portion</label>
          <select
            value={portion}
            onChange={(e) => setPortion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          >
            <option>1 serving</option>
            <option>100g</option>
            <option>Custom...</option>
          </select>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <button className="flex items-center text-sm text-emerald-600 hover:text-emerald-700">
          <Camera className="w-4 h-4 mr-1" />
          <span>Scan barcode</span>
        </button>
        <button
          onClick={handleAddFood}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        >
          Add Food
        </button>
      </div>
    </div>
  );
};

export default QuickAdd;