import React, { useState } from 'react';
import { Search, Camera } from 'lucide-react';

const QuickAdd = ({ onAddFood }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [calories, setCalories] = useState('');
  const [portion, setPortion] = useState('1 serving');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddFood = async () => {
    // Basic validation
    if (!searchTerm.trim()) {
      alert('Please enter a food name');
      return;
    }
    if (!calories || isNaN(calories) || Number(calories) <= 0) {
      alert('Please enter valid calories');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const foodData = {
        name: searchTerm.trim(),
        calories: Number(calories),
        portion: portion || '1 serving'
      };

      // Call parent callback if provided, otherwise log
      if (onAddFood && typeof onAddFood === 'function') {
        await onAddFood(foodData);
      } else {
        console.log('Adding food:', foodData);
      }

      // Reset form after successful submission
      setSearchTerm('');
      setCalories('');
      setPortion('1 serving');
    } catch (error) {
      console.error('Error adding food:', error);
      alert('Failed to add food. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
          disabled={isSubmitting}
          className={`px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
            isSubmitting
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-emerald-500 hover:bg-emerald-600'
          }`}
        >
          {isSubmitting ? 'Adding...' : 'Add Food'}
        </button>
      </div>
    </div>
  );
};

export default QuickAdd;