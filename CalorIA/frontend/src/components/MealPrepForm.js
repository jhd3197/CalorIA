import React, { useState, useEffect, useRef } from 'react';
import { apiRequest } from '../utils/api';

const MealPrepForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState({});
  const [ingredients, setIngredients] = useState([]);
  const [popularIngredients, setPopularIngredients] = useState([]);
  const [ratedIngredients, setRatedIngredients] = useState(new Set());
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('');
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  const [showIngredientDropdown, setShowIngredientDropdown] = useState(false);
  const [selectedAllergies, setSelectedAllergies] = useState([]);
  const [selectedExcludedIngredients, setSelectedExcludedIngredients] = useState([]);
  const [selectedLikesDislikes, setSelectedLikesDislikes] = useState({});
  const searchTimeoutRef = useRef(null);
  const [nextPage, setNextPage] = useState(2);
  const [formData, setFormData] = useState({
    // Step 1: Welcome
    started: false,
    // Step 2: Goal & Profile
    goal: '',
    weight: '',
    weightUnit: 'kg',
    height: '',
    heightUnit: 'cm',
    age: '',
    activityLevel: '',
    mealsPerDay: '',
    // Step 3: Dietary restrictions & preferences
    allergies: [],
    otherAllergy: '',
    intolerances: [],
    dietaryPreference: '',
    // Step 4: Ingredient likes/dislikes
    ingredientPreferences: {}, // {ingredient: 'like'/'neutral'/'dislike'}
    excludedIngredients: [], // Array of excluded ingredient names
    // Step 5: Meals you love/hate
    lovedMeals: ['', '', ''],
    hatedMeals: ['', '', ''],
    // Step 6: Cooking constraints & style
    cookingTime: '',
    batchCooking: '',
    kitchenEquipment: [],
    skillLevel: '',
    // Step 7: Meal timing & schedule
    mealTimes: {
      breakfast: '',
      lunch: '',
      dinner: ''
    },
    wantSnacks: '',
    snackCount: '',
    timingRules: [],
    // Step 8: Portions, calories & macros
    calculateCalories: '',
    targetCalories: '',
    macroPreference: {
      protein: 125, // grams
      fat: 55,      // grams
      carbs: 200    // grams
    },
    // Step 9: Budget & shopping preferences
    weeklyBudget: '',
    budgetPreference: 50, // slider 0-100
    shoppingFormat: '',
    // Step 10: Supplements & medications
    supplements: [],
    medications: '',
    // Step 11: Review & exclusions summary
    exclusionsConfirmed: false,
    // Step 12: Plan type & add-ons
    planFormat: '',
    addOns: [],
    // Step 13: Preview & tweak
    previewAccepted: false,
    // Step 14: Save profile & delivery options
    profileName: '',
    notifications: [],
    deliveryOption: ''
  });

  const validateStep = (step) => {
    const errors = {};

    switch (step) {
      case 2:
        if (!formData.goal) errors.goal = 'Please select your main goal';
        if (!formData.weight) errors.weight = 'Please enter your current weight';
        if (!formData.height) errors.height = 'Please enter your height';
        if (!formData.age) errors.age = 'Please enter your age';
        if (!formData.activityLevel) errors.activityLevel = 'Please select your activity level';
        if (!formData.mealsPerDay) errors.mealsPerDay = 'Please select meals per day preference';
        break;

      case 3:
        if (!formData.dietaryPreference) errors.dietaryPreference = 'Please select your dietary preference';
        if (selectedAllergies.length === 0) errors.allergies = 'Please select at least one allergy or indicate none';
        break;

      case 4:
        if (Object.keys(formData.ingredientPreferences || {}).length === 0) errors.ingredientPreferences = 'Please rate at least a few ingredients';
        break;

      case 6:
        if (!formData.cookingTime) errors.cookingTime = 'Please select cooking time preference';
        if (!formData.batchCooking) errors.batchCooking = 'Please select batch cooking preference';
        if (formData.kitchenEquipment.length === 0) errors.kitchenEquipment = 'Please select at least one kitchen equipment';
        break;

      case 8:
        if (!formData.calculateCalories) errors.calculateCalories = 'Please select calorie calculation preference';
        if (formData.calculateCalories === 'Manual' && !formData.targetCalories) {
          errors.targetCalories = 'Please enter your target daily calories';
        }
        break;

      case 9:
        // Step 9 (Budget & Shopping Preferences) - no required fields
        break;

      case 10:
        // Step 10 (Supplements & Medications) - no required fields
        break;

      case 11:
        if (!formData.exclusionsConfirmed) errors.exclusionsConfirmed = 'Please confirm the exclusions';
        break;

      case 12:
        if (!formData.previewAccepted) errors.previewAccepted = 'Please accept the preview to continue';
        break;

      case 13:
        if (!formData.profileName) errors.profileName = 'Please enter a profile name';
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = () => {
    console.log('Form submitted:', formData);
    // Here you would typically send the data to your backend
    alert('Meal prep profile saved successfully!');
  };

  const updateFormData = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const updateNestedFormData = (parent, field, value) => {
    setFormData({
      ...formData,
      [parent]: { ...formData[parent], [field]: value }
    });
  };

  const toggleArrayField = (field, value) => {
    const currentArray = formData[field];
    if (currentArray.includes(value)) {
      updateFormData(field, currentArray.filter(item => item !== value));
    } else {
      updateFormData(field, [...currentArray, value]);
    }
  };

  const renderError = (fieldName) => {
    if (validationErrors[fieldName]) {
      return (
        <p className="text-red-500 text-sm mt-1">{validationErrors[fieldName]}</p>
      );
    }
    return null;
  };

  // Helper functions for macro calculations
  const calculateCaloriesFromMacros = (protein, fat, carbs) => {
    // 1g protein = 4 calories, 1g fat = 9 calories, 1g carbs = 4 calories
    return (protein * 4) + (fat * 9) + (carbs * 4);
  };

  const calculateMacroPercentage = (macroGrams, totalCalories) => {
    if (totalCalories === 0) return 0;
    const macroCalories = macroGrams * (macroGrams === formData.macroPreference.fat ? 9 : 4);
    return Math.round((macroCalories / totalCalories) * 100);
  };

  const getEstimatedTotalCalories = () => {
    const { protein, fat, carbs } = formData.macroPreference;
    return calculateCaloriesFromMacros(protein, fat, carbs);
  };

  const updateMacroGrams = (macro, grams) => {
    const newMacros = { ...formData.macroPreference, [macro]: parseInt(grams) || 0 };
    updateFormData('macroPreference', newMacros);
  };

  const calculateSuggestedMacros = (targetCalories) => {
    // Standard macro split: 40% carbs, 30% protein, 30% fat
    const calories = parseInt(targetCalories);
    if (isNaN(calories) || calories <= 0) return;

    const carbCalories = calories * 0.4;
    const proteinCalories = calories * 0.3;
    const fatCalories = calories * 0.3;

    return {
      carbs: Math.round(carbCalories / 4), // 4 calories per gram
      protein: Math.round(proteinCalories / 4), // 4 calories per gram
      fat: Math.round(fatCalories / 9) // 9 calories per gram
    };
  };

  const applySuggestedMacros = () => {
    if (formData.calculateCalories === 'Manual' && formData.targetCalories) {
      const suggested = calculateSuggestedMacros(formData.targetCalories);
      if (suggested) {
        updateFormData('macroPreference', suggested);
      }
    }
  };

  // Fetch ingredients from API
  const fetchIngredients = async (searchTerm = '', page = 1, limit = 20) => {
    try {
      setIsLoadingIngredients(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await apiRequest(`/ingredients?${params.toString()}`);
      return response.ingredients || [];
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      return [];
    } finally {
      setIsLoadingIngredients(false);
    }
  };

  // Debounced search function
  const handleIngredientSearch = (searchTerm) => {
    setIngredientSearchTerm(searchTerm);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        const results = await fetchIngredients(searchTerm);
        setIngredients(results);
        setShowIngredientDropdown(true);
      } else {
        // When search is cleared, show popular ingredients again
        setIngredients(popularIngredients);
        setShowIngredientDropdown(false);
      }
    }, 300);
  };

  // Handle allergy selection
  const handleAllergyToggle = (ingredient) => {
    const allergyName = ingredient.name;
    if (selectedAllergies.includes(allergyName)) {
      setSelectedAllergies(selectedAllergies.filter(name => name !== allergyName));
      updateFormData('allergies', formData.allergies.filter(name => name !== allergyName));
    } else {
      setSelectedAllergies([...selectedAllergies, allergyName]);
      updateFormData('allergies', [...formData.allergies, allergyName]);
    }
  };

  // Handle excluded ingredients selection
  const handleExcludeIngredientToggle = (ingredient) => {
    const ingredientName = ingredient.name;
    if (selectedExcludedIngredients.includes(ingredientName)) {
      setSelectedExcludedIngredients(selectedExcludedIngredients.filter(name => name !== ingredientName));
      updateFormData('excludedIngredients', formData.excludedIngredients.filter(name => name !== ingredientName));
    } else {
      setSelectedExcludedIngredients([...selectedExcludedIngredients, ingredientName]);
      updateFormData('excludedIngredients', [...formData.excludedIngredients, ingredientName]);
    }
  };

  // Handle ingredient like/dislike
  const handleIngredientPreference = async (ingredient, preference) => {
    const ingredientName = ingredient.name;
    const currentPreferences = formData.ingredientPreferences || {};
    const newPreferences = { ...currentPreferences };

    if (newPreferences[ingredientName] === preference) {
      // If clicking the same preference, remove it
      delete newPreferences[ingredientName];
    } else {
      // Set the new preference
      newPreferences[ingredientName] = preference;

      // If this ingredient was in the popular list, replace it with a new one
      if (popularIngredients.some(popular => popular.id === ingredient.id)) {
        await replaceRatedIngredient(ingredient.id);
      }
    }

    // Update formData with the complete preferences object
    const updatedFormData = {
      ...formData,
      ingredientPreferences: newPreferences
    };
    setFormData(updatedFormData);
  };

  // Load more popular ingredients to replace rated ones
  const loadMorePopularIngredients = async (count = 5) => {
    try {
      const newIngredients = await fetchIngredients('', nextPage, count * 3); // Load more to account for filtering
      setNextPage(prev => prev + 1);

      // Filter out already rated ingredients, remove duplicates, and sort by popularity
      const availableIngredients = newIngredients
        .filter((ingredient, index, self) =>
          // Remove duplicates by ID
          index === self.findIndex(i => i.id === ingredient.id) &&
          // Remove already rated ingredients
          !ratedIngredients.has(ingredient.id) &&
          // Remove ingredients already in popular list
          !popularIngredients.some(popular => popular.id === ingredient.id)
        )
        .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));

      return availableIngredients.slice(0, count);
    } catch (error) {
      console.error('Error loading more popular ingredients:', error);
      return [];
    }
  };

  // Replace a rated ingredient with a new popular one
  const replaceRatedIngredient = async (ratedIngredientId) => {
    // Mark ingredient as rated
    setRatedIngredients(prev => new Set([...prev, ratedIngredientId]));

    // Remove from popular ingredients and add replacement in one update
    setPopularIngredients(prev => {
      const filtered = prev.filter(ingredient => ingredient.id !== ratedIngredientId);

      // Load replacement ingredient synchronously (we'll handle this differently)
      // For now, just remove the rated ingredient
      return filtered;
    });

    // Load replacement ingredient asynchronously
    const replacements = await loadMorePopularIngredients(1);
    if (replacements.length > 0) {
      setPopularIngredients(prev => {
        // Only add if we don't already have this ingredient
        const exists = prev.some(ingredient => ingredient.id === replacements[0].id);
        if (!exists) {
          return [...prev, replacements[0]];
        }
        return prev;
      });
    }
  };

  // Load popular ingredients on component mount
  useEffect(() => {
    const loadPopularIngredients = async () => {
      const popularIngredients = await fetchIngredients('', 1, 50);
      // Remove duplicates by ID, sort by popularity score
      const uniqueIngredients = popularIngredients
        .filter((ingredient, index, self) =>
          index === self.findIndex(i => i.id === ingredient.id)
        )
        .sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0))
        .slice(0, 20); // Show top 20 popular ingredients

      setPopularIngredients(uniqueIngredients);
      setIngredients(uniqueIngredients); // Also set for search functionality
    };

    loadPopularIngredients();
  }, []);

  // Filter out rated ingredients from popular ingredients whenever ratedIngredients changes
  useEffect(() => {
    setPopularIngredients(prev =>
      prev.filter(ingredient => !ratedIngredients.has(ingredient.id))
    );
  }, [ratedIngredients]);

  // Auto-suggest macros when switching to manual calorie calculation
  useEffect(() => {
    if (formData.calculateCalories === 'Manual' && formData.targetCalories && formData.macroPreference.protein === 125) {
      // Only auto-apply if macros are still at default values (125g protein is the default)
      const suggested = calculateSuggestedMacros(formData.targetCalories);
      if (suggested) {
        updateFormData('macroPreference', suggested);
      }
    }
  }, [formData.calculateCalories, formData.targetCalories, formData.macroPreference.protein]);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold mb-4">Ready to start your meal prep journey?</h2>
            <p className="text-gray-600 mb-8">Let's create a personalized meal plan that fits your lifestyle and goals.</p>
            <button
              onClick={() => {
                updateFormData('started', true);
                handleNext();
              }}
              className="px-8 py-3 bg-emerald-600 text-white rounded-lg text-lg font-semibold hover:bg-emerald-700"
            >
              Start
            </button>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Goal & Profile</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">What's your main goal? *</label>
                <div className={`grid grid-cols-2 gap-3 ${validationErrors.goal ? 'border border-red-300 rounded-lg p-2' : ''}`}>
                  {['Lose', 'Maintain', 'Gain', 'Performance'].map(goal => (
                    <label key={goal} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="goal"
                        value={goal}
                        checked={formData.goal === goal}
                        onChange={(e) => updateFormData('goal', e.target.value)}
                        className="mr-3"
                      />
                      {goal}
                    </label>
                  ))}
                </div>
                {renderError('goal')}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Current weight *</label>
                  <div className={`flex ${validationErrors.weight ? 'border border-red-300 rounded-lg' : ''}`}>
                    <input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => updateFormData('weight', e.target.value)}
                      className={`flex-1 p-2 border rounded-l-lg ${validationErrors.weight ? 'border-red-300' : ''}`}
                      placeholder="Weight"
                    />
                    <select
                      value={formData.weightUnit}
                      onChange={(e) => updateFormData('weightUnit', e.target.value)}
                      className={`p-2 border-t border-r border-b rounded-r-lg ${validationErrors.weight ? 'border-red-300' : ''}`}
                    >
                      <option value="kg">kg</option>
                      <option value="lbs">lbs</option>
                    </select>
                  </div>
                  {renderError('weight')}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Height *</label>
                  <div className={`flex ${validationErrors.height ? 'border border-red-300 rounded-lg' : ''}`}>
                    <input
                      type="number"
                      value={formData.height}
                      onChange={(e) => updateFormData('height', e.target.value)}
                      className={`flex-1 p-2 border rounded-l-lg ${validationErrors.height ? 'border-red-300' : ''}`}
                      placeholder="Height"
                    />
                    <select
                      value={formData.heightUnit}
                      onChange={(e) => updateFormData('heightUnit', e.target.value)}
                      className={`p-2 border-t border-r border-b rounded-r-lg ${validationErrors.height ? 'border-red-300' : ''}`}
                    >
                      <option value="cm">cm</option>
                      <option value="ft-in">ft-in</option>
                    </select>
                  </div>
                  {renderError('height')}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Age *</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => updateFormData('age', e.target.value)}
                  className={`w-full p-2 border rounded-lg ${validationErrors.age ? 'border-red-300' : ''}`}
                  placeholder="Your age"
                />
                {renderError('age')}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Activity level *</label>
                <select
                  value={formData.activityLevel}
                  onChange={(e) => updateFormData('activityLevel', e.target.value)}
                  className={`w-full p-2 border rounded-lg ${validationErrors.activityLevel ? 'border-red-300' : ''}`}
                >
                  <option value="">Select activity level</option>
                  <option value="Sedentary">Sedentary</option>
                  <option value="Light">Light</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Very active">Very active</option>
                  <option value="Athlete">Athlete</option>
                </select>
                {renderError('activityLevel')}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Meals per day preference *</label>
                <div className={`grid grid-cols-4 gap-3 ${validationErrors.mealsPerDay ? 'border border-red-300 rounded-lg p-2' : ''}`}>
                  {['2', '3', '4', '5+'].map(meals => (
                    <label key={meals} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="mealsPerDay"
                        value={meals}
                        checked={formData.mealsPerDay === meals}
                        onChange={(e) => updateFormData('mealsPerDay', e.target.value)}
                        className="mr-3"
                      />
                      {meals}
                    </label>
                  ))}
                </div>
                {renderError('mealsPerDay')}
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Dietary Restrictions & Preferences</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Any food allergies? *</label>

                {/* Selected allergies tags */}
                {selectedAllergies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedAllergies.map(allergy => (
                      <span
                        key={allergy}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 text-red-800"
                      >
                        {allergy}
                        <button
                          onClick={() => handleAllergyToggle({ name: allergy })}
                          className="ml-2 text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search input */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for ingredients (e.g., peanuts, milk, eggs)..."
                    className={`w-full p-2 border rounded-lg ${validationErrors.allergies ? 'border-red-300' : ''}`}
                    value={ingredientSearchTerm}
                    onChange={(e) => handleIngredientSearch(e.target.value)}
                    onFocus={() => {
                      if (ingredients.length > 0) {
                        setShowIngredientDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding dropdown to allow for clicks
                      setTimeout(() => setShowIngredientDropdown(false), 200);
                    }}
                  />

                  {/* Loading indicator */}
                  {isLoadingIngredients && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                    </div>
                  )}

                  {/* Dropdown with suggestions */}
                  {showIngredientDropdown && ingredients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {ingredients.map(ingredient => (
                        <div
                          key={ingredient.id}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleAllergyToggle(ingredient)}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{ingredient.name}</div>
                            {ingredient.category && (
                              <div className="text-sm text-gray-500">{ingredient.category}</div>
                            )}
                          </div>
                          <div className="flex items-center">
                            {ingredient.popularity_score && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                                {Math.round(ingredient.popularity_score)}%
                              </span>
                            )}
                            <input
                              type="checkbox"
                              checked={selectedAllergies.includes(ingredient.name)}
                              onChange={() => {}} // Handled by onClick
                              className="mr-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular ingredients suggestions when no search */}
                {ingredientSearchTerm === '' && popularIngredients.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Popular ingredients:</p>
                    <div className="flex flex-wrap gap-2">
                      {popularIngredients
                        .filter(ingredient => !ratedIngredients.has(ingredient.id))
                        .slice(0, 10)
                        .map(ingredient => (
                        <button
                          key={ingredient.id}
                          onClick={() => handleAllergyToggle(ingredient)}
                          className={`px-3 py-1 rounded-full text-sm border ${
                            selectedAllergies.includes(ingredient.name)
                              ? 'bg-red-100 border-red-300 text-red-800'
                              : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {ingredient.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {renderError('allergies')}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Any intolerances?</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Lactose', 'FODMAP', 'Gluten', 'Histamine', 'Salicylates', 'Oxalates'].map(intolerance => (
                    <label key={intolerance} className="flex items-center p-2">
                      <input
                        type="checkbox"
                        checked={formData.intolerances.includes(intolerance)}
                        onChange={() => toggleArrayField('intolerances', intolerance)}
                        className="mr-3"
                      />
                      {intolerance}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Dietary preference *</label>
                <div className={`grid grid-cols-2 gap-3 ${validationErrors.dietaryPreference ? 'border border-red-300 rounded-lg p-2' : ''}`}>
                  {['Omnivore', 'Pescatarian', 'Vegetarian', 'Vegan', 'Keto', 'Other'].map(pref => (
                    <label key={pref} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="dietaryPreference"
                        value={pref}
                        checked={formData.dietaryPreference === pref}
                        onChange={(e) => updateFormData('dietaryPreference', e.target.value)}
                        className="mr-3"
                      />
                      {pref}
                    </label>
                  ))}
                </div>
                {renderError('dietaryPreference')}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Ingredient Likes / Dislikes</h2>
            <div className="space-y-6">
              <div>
                {/* Popular ingredients for quick selection - AT TOP */}
                {ingredientSearchTerm === '' && popularIngredients.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Popular ingredients to rate:</h4>
                    <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                      {popularIngredients
                        .filter(ingredient => !ratedIngredients.has(ingredient.id))
                        .slice(0, 20)
                        .map(ingredient => (
                        <div key={ingredient.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate">{ingredient.name}</span>
                            {ingredient.category && (
                              <div className="text-xs text-gray-500 truncate">{ingredient.category}</div>
                            )}
                          </div>
                          <div className="flex space-x-1 ml-2">
                            {['Like', 'Neutral', 'Dislike'].map(status => (
                              <button
                                key={status}
                                onClick={() => handleIngredientPreference(ingredient, status.toLowerCase())}
                                className={`px-2 py-1 text-xs rounded ${
                                  (formData.ingredientPreferences || {})[ingredient.name] === status.toLowerCase()
                                    ? status === 'Like' ? 'bg-green-600 text-white'
                                    : status === 'Dislike' ? 'bg-red-600 text-white'
                                    : 'bg-yellow-600 text-white'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                              >
                                {status.charAt(0)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Search input for ingredient preferences */}
                <label className="block text-sm font-medium mb-2">From this ingredient list, mark items you dislike *</label>
                <p className="text-sm text-gray-500 mb-4">Search and select ingredients to mark as Like, Neutral, or Dislike</p>
                <div className="relative mb-4">
                  <input
                    type="text"
                    placeholder="Search for ingredients to rate..."
                    className="w-full p-2 border rounded-lg"
                    value={ingredientSearchTerm}
                    onChange={(e) => handleIngredientSearch(e.target.value)}
                    onFocus={() => {
                      if (popularIngredients.length > 0) {
                        setShowIngredientDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowIngredientDropdown(false), 200);
                    }}
                  />

                  {isLoadingIngredients && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                    </div>
                  )}

                  {/* Dropdown with ingredient suggestions */}
                  {showIngredientDropdown && popularIngredients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {popularIngredients
                        .filter(ingredient => !ratedIngredients.has(ingredient.id))
                        .map(ingredient => (
                        <div
                          key={ingredient.id}
                          className="p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{ingredient.name}</div>
                              {ingredient.category && (
                                <div className="text-sm text-gray-500">{ingredient.category}</div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {ingredient.popularity_score && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                                  {Math.round(ingredient.popularity_score)}%
                                </span>
                              )}
                              <div className="flex space-x-1">
                                {['Like', 'Neutral', 'Dislike'].map(status => (
                                  <button
                                    key={status}
                                    onClick={() => handleIngredientPreference(ingredient, status.toLowerCase())}
                                    className={`px-2 py-1 text-xs rounded ${
                                      (formData.ingredientPreferences || {})[ingredient.name] === status.toLowerCase()
                                        ? status === 'Like' ? 'bg-green-600 text-white'
                                        : status === 'Dislike' ? 'bg-red-600 text-white'
                                        : 'bg-yellow-600 text-white'
                                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    }`}
                                  >
                                    {status}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {renderError('ingredientPreferences')}
                </div>

                {/* Display selected ingredient preferences */}
                {Object.keys(formData.ingredientPreferences || {}).length > 0 ? (
                  <div className="border rounded-lg p-4 mb-6 bg-blue-50">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Your ingredient preferences: ({Object.keys(formData.ingredientPreferences || {}).length} rated)
                    </h4>
                    <div className="max-h-96 overflow-y-auto">
                      {Object.entries(formData.ingredientPreferences || {}).map(([ingredientName, preference]) => (
                        <div key={ingredientName} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
                          <span className="font-medium">{ingredientName}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              preference === 'like' ? 'bg-green-100 text-green-800'
                              : preference === 'dislike' ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {preference.charAt(0).toUpperCase() + preference.slice(1)}
                            </span>
                            <button
                              onClick={() => handleIngredientPreference({ name: ingredientName }, preference)}
                              className="text-red-500 hover:text-red-700 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border rounded-lg p-4 mb-6 bg-gray-50">
                    <h4 className="font-medium text-gray-900 mb-3">Your ingredient preferences:</h4>
                    <p className="text-gray-600 text-sm">Rate some ingredients above to see them appear here!</p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Any ingredients you must exclude?</label>

                {/* Selected excluded ingredients tags */}
                {selectedExcludedIngredients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedExcludedIngredients.map(ingredient => (
                      <span
                        key={ingredient}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-orange-100 text-orange-800"
                      >
                        {ingredient}
                        <button
                          onClick={() => handleExcludeIngredientToggle({ name: ingredient })}
                          className="ml-2 text-orange-600 hover:text-orange-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Search input for excluded ingredients */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search for ingredients to exclude..."
                    className="w-full p-2 border rounded-lg"
                    value={ingredientSearchTerm}
                    onChange={(e) => handleIngredientSearch(e.target.value)}
                    onFocus={() => {
                      if (popularIngredients.length > 0) {
                        setShowIngredientDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowIngredientDropdown(false), 200);
                    }}
                  />

                  {isLoadingIngredients && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                    </div>
                  )}

                  {/* Dropdown with ingredient suggestions for exclusion */}
                  {showIngredientDropdown && popularIngredients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {popularIngredients
                        .filter(ingredient => !ratedIngredients.has(ingredient.id))
                        .map(ingredient => (
                        <div
                          key={ingredient.id}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          onClick={() => handleExcludeIngredientToggle(ingredient)}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{ingredient.name}</div>
                            {ingredient.category && (
                              <div className="text-sm text-gray-500">{ingredient.category}</div>
                            )}
                          </div>
                          <div className="flex items-center">
                            {ingredient.popularity_score && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">
                                {Math.round(ingredient.popularity_score)}%
                              </span>
                            )}
                            <input
                              type="checkbox"
                              checked={selectedExcludedIngredients.includes(ingredient.name)}
                              onChange={() => {}} // Handled by onClick
                              className="mr-2"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Popular ingredients suggestions for exclusion */}
                {ingredientSearchTerm === '' && popularIngredients.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm text-gray-600 mb-2">Popular ingredients to exclude:</p>
                    <div className="flex flex-wrap gap-2">
                      {popularIngredients
                        .filter(ingredient => !ratedIngredients.has(ingredient.id))
                        .slice(0, 8)
                        .map(ingredient => (
                        <button
                          key={ingredient.id}
                          onClick={() => handleExcludeIngredientToggle(ingredient)}
                          className={`px-3 py-1 rounded-full text-sm border ${
                            selectedExcludedIngredients.includes(ingredient.name)
                              ? 'bg-orange-100 border-orange-300 text-orange-800'
                              : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {ingredient.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Meals You Love / Hate</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">List 1-3 meals you love</label>
                {[0, 1, 2].map(index => (
                  <input
                    key={index}
                    type="text"
                    value={formData.lovedMeals[index]}
                    onChange={(e) => {
                      const newLovedMeals = [...formData.lovedMeals];
                      newLovedMeals[index] = e.target.value;
                      updateFormData('lovedMeals', newLovedMeals);
                    }}
                    className="w-full p-2 border rounded-lg mb-2"
                    placeholder={`Meal ${index + 1} you love`}
                  />
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">List 1-3 meals you hate / never want</label>
                {[0, 1, 2].map(index => (
                  <input
                    key={index}
                    type="text"
                    value={formData.hatedMeals[index]}
                    onChange={(e) => {
                      const newHatedMeals = [...formData.hatedMeals];
                      newHatedMeals[index] = e.target.value;
                      updateFormData('hatedMeals', newHatedMeals);
                    }}
                    className="w-full p-2 border rounded-lg mb-2"
                    placeholder={`Meal ${index + 1} you hate`}
                  />
                ))}
              </div>
            </div>
          </div>
        );

      case 6:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Cooking Constraints & Style</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">How much time to cook per day? *</label>
                <div className={`grid grid-cols-2 gap-3 ${validationErrors.cookingTime ? 'border border-red-300 rounded-lg p-2' : ''}`}>
                  {['10-20m', '20-40m', '40-60m', '60m+'].map(time => (
                    <label key={time} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="cookingTime"
                        value={time}
                        checked={formData.cookingTime === time}
                        onChange={(e) => updateFormData('cookingTime', e.target.value)}
                        className="mr-3"
                      />
                      {time}
                    </label>
                  ))}
                </div>
                {renderError('cookingTime')}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Do you want batch-cooking? *</label>
                <div className={`flex space-x-6 ${validationErrors.batchCooking ? 'border border-red-300 rounded-lg p-2' : ''}`}>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="batchCooking"
                      value="Yes"
                      checked={formData.batchCooking === 'Yes'}
                      onChange={(e) => updateFormData('batchCooking', e.target.value)}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="batchCooking"
                      value="No"
                      checked={formData.batchCooking === 'No'}
                      onChange={(e) => updateFormData('batchCooking', e.target.value)}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                {renderError('batchCooking')}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Kitchen equipment available *</label>
                <div className={`grid grid-cols-2 gap-3 ${validationErrors.kitchenEquipment ? 'border border-red-300 rounded-lg p-2' : ''}`}>
                  {['Oven', 'Air fryer', 'Stove', 'Instant Pot', 'Blender', 'Grill', 'Microwave', 'Slow cooker'].map(equipment => (
                    <label key={equipment} className="flex items-center p-2">
                      <input
                        type="checkbox"
                        checked={formData.kitchenEquipment.includes(equipment)}
                        onChange={() => toggleArrayField('kitchenEquipment', equipment)}
                        className="mr-3"
                      />
                      {equipment}
                    </label>
                  ))}
                </div>
                {renderError('kitchenEquipment')}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Skill level</label>
                <select
                  value={formData.skillLevel}
                  onChange={(e) => updateFormData('skillLevel', e.target.value)}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">Select skill level</option>
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 7:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Meal Timing & Schedule</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Typical meal times</label>
                <div className="grid grid-cols-3 gap-4">
                  {['breakfast', 'lunch', 'dinner'].map(meal => (
                    <div key={meal}>
                      <label className="block text-sm font-medium mb-1 capitalize">{meal}</label>
                      <input
                        type="time"
                        value={formData.mealTimes[meal]}
                        onChange={(e) => updateNestedFormData('mealTimes', meal, e.target.value)}
                        className="w-full p-2 border rounded-lg"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Want snacks?</label>
                <div className="flex items-center space-x-6">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="wantSnacks"
                      value="Yes"
                      checked={formData.wantSnacks === 'Yes'}
                      onChange={(e) => updateFormData('wantSnacks', e.target.value)}
                      className="mr-2"
                    />
                    Yes
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="wantSnacks"
                      value="No"
                      checked={formData.wantSnacks === 'No'}
                      onChange={(e) => updateFormData('wantSnacks', e.target.value)}
                      className="mr-2"
                    />
                    No
                  </label>
                </div>
                {formData.wantSnacks === 'Yes' && (
                  <input
                    type="number"
                    value={formData.snackCount}
                    onChange={(e) => updateFormData('snackCount', e.target.value)}
                    className="w-full p-2 border rounded-lg mt-2"
                    placeholder="How many snacks per day?"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Any timing rules?</label>
                <div className="space-y-2">
                  {['No food after 9pm', 'Pre-workout meal only', 'Fasting mornings', 'Late dinner'].map(rule => (
                    <label key={rule} className="flex items-center p-2">
                      <input
                        type="checkbox"
                        checked={formData.timingRules.includes(rule)}
                        onChange={() => toggleArrayField('timingRules', rule)}
                        className="mr-3"
                      />
                      {rule}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 8:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Portions, Calories & Macros</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Do you want us to calculate calories? *</label>
                <div className={`flex space-x-6 ${validationErrors.calculateCalories ? 'border border-red-300 rounded-lg p-2' : ''}`}>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="calculateCalories"
                      value="Auto"
                      checked={formData.calculateCalories === 'Auto'}
                      onChange={(e) => updateFormData('calculateCalories', e.target.value)}
                      className="mr-2"
                    />
                    Auto calculate
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="calculateCalories"
                      value="Manual"
                      checked={formData.calculateCalories === 'Manual'}
                      onChange={(e) => updateFormData('calculateCalories', e.target.value)}
                      className="mr-2"
                    />
                    I'll set my own
                  </label>
                </div>
                {renderError('calculateCalories')}
              </div>

              {formData.calculateCalories === 'Manual' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Target daily calories *</label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      value={formData.targetCalories}
                      onChange={(e) => updateFormData('targetCalories', e.target.value)}
                      className={`flex-1 p-2 border rounded-lg ${validationErrors.targetCalories ? 'border-red-300' : ''}`}
                      placeholder="Target calories"
                    />
                    <button
                      onClick={applySuggestedMacros}
                      className="px-3 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
                      disabled={!formData.targetCalories}
                    >
                      Apply
                    </button>
                  </div>
                  {formData.targetCalories && (
                    <p className="text-xs text-gray-500 mt-1">
                      Click "Apply" to auto-calculate macro grams based on your target calories
                    </p>
                  )}
                  {renderError('targetCalories')}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-4">Macro preference (grams per day)</label>

                {/* Summary */}
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <div className="text-sm text-gray-600">
                    <strong>Estimated total:</strong> {getEstimatedTotalCalories()} calories
                    {formData.calculateCalories === 'Manual' && formData.targetCalories && (
                      <span className={getEstimatedTotalCalories() > parseInt(formData.targetCalories) ? 'text-red-600' : 'text-green-600'}>
                        {' '}(vs target: {formData.targetCalories} cal)
                      </span>
                    )}
                  </div>
                </div>

                {/* Macro inputs */}
                <div className="space-y-4">
                  {[
                    { name: 'Protein', key: 'protein', caloriesPerGram: 4, color: 'bg-blue-500' },
                    { name: 'Fat', key: 'fat', caloriesPerGram: 9, color: 'bg-yellow-500' },
                    { name: 'Carbs', key: 'carbs', caloriesPerGram: 4, color: 'bg-green-500' }
                  ].map(macro => {
                    const grams = formData.macroPreference[macro.key];
                    const percentage = formData.calculateCalories === 'Manual' && formData.targetCalories
                      ? calculateMacroPercentage(grams, parseInt(formData.targetCalories))
                      : Math.round((grams * macro.caloriesPerGram / getEstimatedTotalCalories()) * 100);

                    return (
                      <div key={macro.key} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <label className="font-medium text-sm">{macro.name}</label>
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              min="0"
                              max="500"
                              value={grams}
                              onChange={(e) => updateMacroGrams(macro.key, e.target.value)}
                              className="w-20 px-2 py-1 text-sm border rounded"
                              placeholder="g"
                            />
                            <span className="text-sm text-gray-500">g</span>
                            {formData.calculateCalories === 'Manual' && formData.targetCalories && (
                              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                {percentage}%
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Visual bar */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full ${macro.color}`}
                            style={{
                              width: `${Math.min((grams / 300) * 100, 100)}%`
                            }}
                          ></div>
                        </div>

                        {/* Quick preset buttons */}
                        <div className="flex space-x-1">
                          {[50, 100, 150, 200].map(preset => (
                            <button
                              key={preset}
                              onClick={() => updateMacroGrams(macro.key, preset)}
                              className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                            >
                              {preset}g
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Helper text */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>How to use:</strong> Enter your desired grams for each macronutrient.
                    {formData.calculateCalories === 'Manual' && formData.targetCalories && (
                      <> The percentages show how this fits with your target calories of {formData.targetCalories}.</>
                    )}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Protein & Carbs: 4 calories per gram | Fat: 9 calories per gram
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 9:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Budget & Shopping Preferences</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Weekly food budget</label>
                <input
                  type="number"
                  value={formData.weeklyBudget}
                  onChange={(e) => updateFormData('weeklyBudget', e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Budget amount"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Prefer budget ↔ premium options?</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={formData.budgetPreference}
                  onChange={(e) => updateFormData('budgetPreference', e.target.value)}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Budget</span>
                  <span>Premium</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Shopping list format</label>
                <div className="grid grid-cols-1 gap-3">
                  {['Printable', 'Grocery app', 'Delivery format'].map(format => (
                    <label key={format} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="shoppingFormat"
                        value={format}
                        checked={formData.shoppingFormat === format}
                        onChange={(e) => updateFormData('shoppingFormat', e.target.value)}
                        className="mr-3"
                      />
                      {format}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );

      case 10:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Supplements & Medications</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Do you take supplements?</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Creatine', 'Omega-3', 'Multivitamin', 'Protein powder', 'Vitamin D', 'Calcium', 'Iron', 'Magnesium'].map(supplement => (
                    <label key={supplement} className="flex items-center p-2">
                      <input
                        type="checkbox"
                        checked={formData.supplements.includes(supplement)}
                        onChange={() => toggleArrayField('supplements', supplement)}
                        className="mr-3"
                      />
                      {supplement}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Any medications?</label>
                <textarea
                  value={formData.medications}
                  onChange={(e) => updateFormData('medications', e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  rows="3"
                  placeholder="List any medications you're taking"
                />
              </div>
            </div>
          </div>
        );

      case 11:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Review & Exclusions Summary</h2>
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Auto-generated exclusions based on your preferences:</h3>
                <div className="space-y-2">
                  {selectedAllergies.length > 0 && (
                    <p><strong>Allergies:</strong> {selectedAllergies.join(', ')}</p>
                  )}
                  {formData.intolerances.length > 0 && (
                    <p><strong>Intolerances:</strong> {formData.intolerances.join(', ')}</p>
                  )}
                  {selectedExcludedIngredients.length > 0 && (
                    <p><strong>Excluded ingredients:</strong> {selectedExcludedIngredients.join(', ')}</p>
                  )}
                  {Object.entries(formData.ingredientPreferences || {}).filter(([_, preference]) => preference === 'dislike').length > 0 && (
                    <p><strong>Disliked ingredients:</strong> {Object.entries(formData.ingredientPreferences || {}).filter(([_, preference]) => preference === 'dislike').map(([name, _]) => name).join(', ')}</p>
                  )}
                  {formData.hatedMeals.filter(meal => meal).length > 0 && (
                    <p><strong>Meals to avoid:</strong> {formData.hatedMeals.filter(meal => meal).join(', ')}</p>
                  )}
                  {selectedAllergies.length === 0 && formData.intolerances.length === 0 && selectedExcludedIngredients.length === 0 && Object.entries(formData.ingredientPreferences || {}).filter(([_, preference]) => preference === 'dislike').length === 0 && formData.hatedMeals.filter(meal => meal).length === 0 && (
                    <p className="text-gray-600 italic">No exclusions specified</p>
                  )}
                </div>
              </div>

              <div>
                <label className={`flex items-center ${validationErrors.exclusionsConfirmed ? 'border border-red-300 rounded-lg p-2' : ''}`}>
                  <input
                    type="checkbox"
                    checked={formData.exclusionsConfirmed}
                    onChange={(e) => updateFormData('exclusionsConfirmed', e.target.checked)}
                    className="mr-3"
                  />
                  I confirm these exclusions and understand they will be applied to my meal plan
                </label>
                {renderError('exclusionsConfirmed')}
              </div>
            </div>
          </div>
        );


      case 12:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Preview & Tweak</h2>
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-3">Sample Day Preview:</h3>
                <div className="space-y-2">
                  <p><strong>Breakfast:</strong> Oatmeal with berries and nuts</p>
                  <p><strong>Lunch:</strong> Grilled chicken salad</p>
                  <p><strong>Dinner:</strong> Baked salmon with vegetables</p>
                  {formData.wantSnacks === 'Yes' && <p><strong>Snacks:</strong> Greek yogurt, apple</p>}
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-600 mb-4">You can swap ingredients or adjust portions in your final plan</p>
                <label className={`flex items-center ${validationErrors.previewAccepted ? 'border border-red-300 rounded-lg p-2' : ''}`}>
                  <input
                    type="checkbox"
                    checked={formData.previewAccepted}
                    onChange={(e) => updateFormData('previewAccepted', e.target.checked)}
                    className="mr-3"
                  />
                  I accept this sample and want to proceed
                </label>
                {renderError('previewAccepted')}
              </div>
            </div>
          </div>
        );

      case 13:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6">Save Profile</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2">Profile name *</label>
                <input
                  type="text"
                  value={formData.profileName}
                  onChange={(e) => updateFormData('profileName', e.target.value)}
                  className={`w-full p-2 border rounded-lg ${validationErrors.profileName ? 'border-red-300' : ''}`}
                  placeholder="Name your meal prep profile"
                />
                {renderError('profileName')}
              </div>
            </div>
          </div>
        );

      default:
        return <div>Step not found</div>;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Meal Prep Setup</h1>
          <span className="text-sm text-gray-500">Step {currentStep} of 13</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-emerald-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 13) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {renderStep()}
      </div>

      <div className="flex justify-between mt-6">
        {currentStep > 1 && (
          <button
            onClick={handlePrev}
            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Previous
          </button>
        )}
        {currentStep < 13 ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 ml-auto"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 ml-auto"
          >
            Complete Setup
          </button>
        )}
      </div>
    </div>
  );
};

export default MealPrepForm;