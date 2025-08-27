import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

const API_BASE_URL = 'http://localhost:4032/api';

// For testing - this will be used as a fallback when no user ID is available
const TEST_USER_ID = "00000000-0000-0000-0000-000000000001";

// Helper function for API calls
const apiRequest = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// Function to get user data from local storage
const getUserData = () => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
};

const QuickAdd = ({ onAddFood, onAddWater, userId, onDashboardUpdate }) => {
  // Tab state
  const [activeTab, setActiveTab] = useState('food');

  // Food form state
  const [foodName, setFoodName] = useState('');
  const [mealType, setMealType] = useState('breakfast');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState('serving');
  const [isAddingFood, setIsAddingFood] = useState(false);

  // Search results state
  const [searchResults, setSearchResults] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef(null);
  const searchContainerRef = useRef(null);

  // Water form state
  const [waterAmount, setWaterAmount] = useState(250);
  const [waterUnit, setWaterUnit] = useState('ml');
  const [isAddingWater, setIsAddingWater] = useState(false);

  // Weight form state
  const [weightValue, setWeightValue] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [isAddingWeight, setIsAddingWeight] = useState(false);

  // Function to get the effective user ID
  const getEffectiveUserId = () => {
    // Try to use the prop first
    if (userId) {
      return userId;
    }
    
    // Fall back to local storage
    const userData = getUserData();
    const userIdFromStorage = userData?.user_id || userData?.id;
    
    if (userIdFromStorage) {
      return userIdFromStorage;
    }
    
    // Last resort, use test user ID
    console.log("Using test user ID as no user ID was found from props or storage");
    return TEST_USER_ID;
  };

  // Function to search for food
  const searchFood = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    try {
      setIsSearching(true);
      const data = await apiRequest(`/ingredients?search=${encodeURIComponent(query)}&limit=10`);
      setSearchResults(data.ingredients || []);
      setShowResults(true);
    } catch (error) {
      console.error('Error searching for food:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Handle food name input changes with debounce
  const handleFoodNameChange = (e) => {
    const value = e.target.value;
    setFoodName(value);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      searchFood(value);
    }, 300);
  };

  // Handle food selection from search results
  const handleSelectFood = (food) => {
    setFoodName(food.name);
    setShowResults(false);
  };

  // Handle click outside search results
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Handle food form submission
  const handleAddFood = async () => {
    // Basic validation
    if (!foodName.trim()) {
      alert('Please enter a food name');
      return;
    }
    if (!quantity || isNaN(quantity) || Number(quantity) <= 0) {
      alert('Please enter a valid quantity');
      return;
    }

    // Get user ID
    const effectiveUserId = getEffectiveUserId();

    setIsAddingFood(true);
    
    try {
      // Get current date and time using local time
      const now = new Date();
      const mealDate = now.toLocaleDateString('en-CA'); // YYYY-MM-DD using local time
      const mealTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM
      
      // Create a food item object for the items array
      const foodItem = {
        name: foodName.trim(),
        quantity: Number(quantity),
        unit: unit,
        calories: 100, // Default calories - will be calculated by backend
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0
      };
      
      // If the food name matches an ingredient, calculate nutritional values
      const matchingIngredient = searchResults.find(ing => 
        ing.name.toLowerCase() === foodName.trim().toLowerCase()
      );
      
      if (matchingIngredient && matchingIngredient.kcal_per_100g !== undefined) {
        // Calculate nutritional values based on the ingredient
        const amount = Number(quantity);
        let grams = amount; // Default to grams
        
        // Convert to grams based on unit
        switch (unit) {
          case 'g':
            grams = amount;
            break;
          case '100g':
            grams = amount * 100;
            break;
          case 'oz':
            grams = amount * 28.35; // 1 oz = 28.35g
            break;
          case 'cup':
            grams = amount * 125; // Approximate, could be more specific per ingredient
            break;
          case 'tbsp':
            grams = amount * 15; // 1 tbsp = 15g
            break;
          case 'tsp':
            grams = amount * 5; // 1 tsp = 5g
            break;
          default: // 'serving' or other
            grams = amount * 100; // Default to 100g per serving
            break;
        }
        
        // Calculate nutritional values per 100g
        const factor = grams / 100;
        foodItem.calories = Math.round(matchingIngredient.kcal_per_100g * factor);
        foodItem.protein_g = matchingIngredient.protein_per_100g ? 
          Number((matchingIngredient.protein_per_100g * factor).toFixed(1)) : 0;
        foodItem.carbs_g = matchingIngredient.carbs_per_100g ? 
          Number((matchingIngredient.carbs_per_100g * factor).toFixed(1)) : 0;
        foodItem.fat_g = matchingIngredient.fat_per_100g ? 
          Number((matchingIngredient.fat_per_100g * factor).toFixed(1)) : 0;
      }
      
      // Format the meal request according to the backend Type.Meal model
      const mealData = {
        user_id: effectiveUserId,
        meal_type: mealType, // Send raw mealType value without capitalization
        food_items: [foodItem], // Changed from 'items' to 'food_items' to match backend model
        notes: ''
      };

      console.log('Sending meal data:', JSON.stringify(mealData));

      // Make API call to add meal
      await apiRequest('/meals', {
        method: 'POST',
        body: JSON.stringify(mealData),
      });

      // Call parent callback if provided
      if (onAddFood && typeof onAddFood === 'function') {
        await onAddFood(mealData);
      }

      // Trigger dashboard update
      if (onDashboardUpdate && typeof onDashboardUpdate === 'function') {
        await onDashboardUpdate();
      }

      // Reset food form after successful submission
      setFoodName('');
      setQuantity(1);
      setUnit('serving');
      
    } catch (error) {
      console.error('Error adding food:', error);
      alert('Failed to add food. Please try again.');
    } finally {
      setIsAddingFood(false);
    }
  };

  // Handle water form submission
  const handleAddWater = async () => {
    // Basic validation
    if (!waterAmount || isNaN(waterAmount) || Number(waterAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    // Get user ID
    const effectiveUserId = getEffectiveUserId();

    setIsAddingWater(true);

    try {
      // Get current date
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

      const waterData = {
        user_id: effectiveUserId,
        amount: Number(waterAmount),
        unit: waterUnit,
        on_date: today
      };

      console.log('Sending water data:', JSON.stringify(waterData));

      // Make API call to add water
      await apiRequest('/water', {
        method: 'POST',
        body: JSON.stringify(waterData),
      });

      // Call parent callback if provided
      if (onAddWater && typeof onAddWater === 'function') {
        await onAddWater(waterData);
      }

      // Trigger dashboard update
      if (onDashboardUpdate && typeof onDashboardUpdate === 'function') {
        await onDashboardUpdate();
      }

      // Reset water form after successful submission
      setWaterAmount(250);
      setWaterUnit('ml');

    } catch (error) {
      console.error('Error adding water:', error);
      alert('Failed to add water. Please try again.');
    } finally {
      setIsAddingWater(false);
    }
  };

  // Handle weight form submission
  const handleAddWeight = async () => {
    // Basic validation
    if (!weightValue || isNaN(weightValue) || Number(weightValue) <= 0) {
      alert('Please enter a valid weight');
      return;
    }

    // Get user ID
    const effectiveUserId = getEffectiveUserId();

    setIsAddingWeight(true);

    try {
      // Convert weight to kg based on unit
      let weightInKg = Number(weightValue);
      switch (weightUnit) {
        case 'lbs':
          weightInKg = weightInKg * 0.453592; // 1 lb = 0.453592 kg
          break;
        case 'oz':
          weightInKg = weightInKg * 0.0283495; // 1 oz = 0.0283495 kg
          break;
        case 'kg':
        default:
          // Already in kg
          break;
      }

      // Get current date using same logic as other forms
      const now = new Date();
      const weightDate = now.toLocaleDateString('en-CA'); // YYYY-MM-DD using local time

      const weightData = {
        user_id: effectiveUserId,
        weight: Number(weightInKg.toFixed(2)),
        unit: 'kg',
        on_date: weightDate
      };

      console.log('Sending weight data:', JSON.stringify(weightData));

      // Make API call to add weight
      await apiRequest('/weight', {
        method: 'POST',
        body: JSON.stringify(weightData),
      });

      // Trigger dashboard update
      if (onDashboardUpdate && typeof onDashboardUpdate === 'function') {
        await onDashboardUpdate();
      }

      // Reset weight form after successful submission
      setWeightValue('');

    } catch (error) {
      console.error('Error adding weight:', error);
      alert('Failed to add weight. Please try again.');
    } finally {
      setIsAddingWeight(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="heading text-lg font-semibold mb-4">Quick Add</h2>
      
      {/* Tab Navigation */}
      <div className="flex border-b border-gray-200 mb-4">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'food'
              ? 'border-b-2 border-emerald-500 text-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('food')}
        >
          Add Food
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'water'
              ? 'border-b-2 border-emerald-500 text-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('water')}
        >
          Add Water
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeTab === 'weight'
              ? 'border-b-2 border-emerald-500 text-emerald-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('weight')}
        >
          Add Weight
        </button>
      </div>
      
      {/* Food Tab Content */}
      {activeTab === 'food' && (
        <div>
          <div className="relative mb-4" ref={searchContainerRef}>
            <input
              type="text"
              placeholder="Search food..."
              value={foodName}
              onChange={handleFoodNameChange}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            <span className="absolute right-3 top-2 text-gray-400">
              {isSearching ? (
                <span className="w-5 h-5 block rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></span>
              ) : (
                <Search className="w-5 h-5" />
              )}
            </span>
            
            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((food) => (
                  <div
                    key={food.id}
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex justify-between"
                    onClick={() => handleSelectFood(food)}
                  >
                    <div>
                      <span className="font-medium">{food.name}</span>
                      {food.brand && <span className="text-gray-500 text-sm ml-2">({food.brand})</span>}
                    </div>
                    <span className="text-gray-500 text-sm">{food.calories_per_100g} kcal/100g</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-500 mb-1">Meal Type</label>
            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Quantity</label>
              <input
                type="number"
                placeholder="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min="0.1"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Unit</label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="serving">serving</option>
                <option value="100g">100g</option>
                <option value="g">g</option>
                <option value="oz">oz</option>
                <option value="cup">cup</option>
                <option value="tbsp">tbsp</option>
                <option value="tsp">tsp</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleAddFood}
              disabled={isAddingFood}
              className={`px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                isAddingFood
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {isAddingFood ? 'Adding...' : 'Add Food'}
            </button>
          </div>
        </div>
      )}
      
      {/* Water Tab Content */}
      {activeTab === 'water' && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Amount</label>
              <input
                type="number"
                placeholder="250"
                value={waterAmount}
                onChange={(e) => setWaterAmount(e.target.value)}
                min="1"
                step="1"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Unit</label>
              <select
                value={waterUnit}
                onChange={(e) => setWaterUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="ml">ml</option>
                <option value="l">l</option>
                <option value="oz">oz</option>
                <option value="cup">cup</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleAddWater}
              disabled={isAddingWater}
              className={`px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                isAddingWater
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {isAddingWater ? 'Adding...' : 'Add Water'}
            </button>
          </div>
        </div>
      )}

      {/* Weight Tab Content */}
      {activeTab === 'weight' && (
        <div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm text-gray-500 mb-1">Weight</label>
              <input
                type="number"
                placeholder="70.5"
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
                min="0.1"
                step="0.1"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-500 mb-1">Unit</label>
              <select
                value={weightUnit}
                onChange={(e) => setWeightUnit(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="kg">kg</option>
                <option value="lbs">lbs</option>
                <option value="oz">oz</option>
              </select>
            </div>
          </div>


          <div className="flex justify-end">
            <button
              onClick={handleAddWeight}
              disabled={isAddingWeight}
              className={`px-4 py-2 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                isAddingWeight
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600'
              }`}
            >
              {isAddingWeight ? 'Adding...' : 'Add Weight'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickAdd;