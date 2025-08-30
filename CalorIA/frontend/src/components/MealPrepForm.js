import React, { useState, useEffect, useRef } from 'react';
import { Heart, Minus, X } from 'lucide-react';
import { apiRequest, getCurrentUser, getUserData, createMealPrepProfile } from '../utils/api';

const MealPrepForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [validationErrors, setValidationErrors] = useState({});
  const [ingredients, setIngredients] = useState([]);
  const [allergiesIngredients, setAllergiesIngredients] = useState([]);
  const [excludeIngredients, setExcludeIngredients] = useState([]);
  const [popularIngredients, setPopularIngredients] = useState([]);
  const [ratedIngredients, setRatedIngredients] = useState(new Set());
  const [ingredientSearchTerm, setIngredientSearchTerm] = useState('');
  const [allergiesSearchTerm, setAllergiesSearchTerm] = useState('');
  const [excludeSearchTerm, setExcludeSearchTerm] = useState('');
  const [isLoadingIngredients, setIsLoadingIngredients] = useState(false);
  const [showIngredientDropdown, setShowIngredientDropdown] = useState(false);
  const [showExcludeDropdown, setShowExcludeDropdown] = useState(false);
  const [showAllergiesDropdown, setShowAllergiesDropdown] = useState(false);
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
    heightFeet: '',
    heightInches: '',
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
        if (formData.heightUnit === 'ft-in') {
          if (!formData.heightFeet || !formData.heightInches) {
            errors.height = 'Please enter both feet and inches';
          }
        } else {
          if (!formData.height) errors.height = 'Please enter your height';
        }
        if (!formData.age) errors.age = 'Please enter your age';
        if (!formData.activityLevel) errors.activityLevel = 'Please select your activity level';
        if (!formData.mealsPerDay) errors.mealsPerDay = 'Please select meals per day preference';
        break;

      case 3:
        // Dietary preference is now optional
        // Allergies are now optional - users can skip if they have none
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
        if (!formData.exclusionsConfirmed) errors.exclusionsConfirmed = 'Please confirm the review and proceed';
        break;

      case 12:
        if (!formData.profileName) errors.profileName = 'Please enter a profile name';
        break;

      case 13:
        // Step 13 (Final step) - no required fields
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

  const handleSubmit = async () => {
    try {
      // Get current user data for user_id
      const userData = getUserData();
      if (!userData || !userData.user_id) {
        alert('User not authenticated. Please log in again.');
        return;
      }

      // Prepare the data to send to backend
      const profileData = {
        user_id: userData.user_id,
        profile_name: formData.profileName,
        goal: formData.goal,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        weight_unit: formData.weightUnit,
        height: formData.height ? parseFloat(formData.height) : null,
        height_feet: formData.heightFeet ? parseInt(formData.heightFeet) : null,
        height_inches: formData.heightInches ? parseInt(formData.heightInches) : null,
        height_unit: formData.heightUnit,
        age: formData.age ? parseInt(formData.age) : null,
        activity_level: formData.activityLevel,
        meals_per_day: formData.mealsPerDay,
        allergies: formData.allergies,
        other_allergy: formData.otherAllergy,
        intolerances: formData.intolerances,
        dietary_preference: formData.dietaryPreference,
        ingredient_preferences: formData.ingredientPreferences,
        excluded_ingredients: formData.excludedIngredients,
        loved_meals: formData.lovedMeals,
        hated_meals: formData.hatedMeals,
        cooking_time: formData.cookingTime,
        batch_cooking: formData.batchCooking,
        kitchen_equipment: formData.kitchenEquipment,
        skill_level: formData.skillLevel,
        meal_times: formData.mealTimes,
        want_snacks: formData.wantSnacks,
        snack_count: formData.snackCount ? parseInt(formData.snackCount) : null,
        timing_rules: formData.timingRules,
        calculate_calories: formData.calculateCalories,
        target_calories: formData.targetCalories ? parseInt(formData.targetCalories) : null,
        macro_preference: formData.macroPreference,
        weekly_budget: formData.weeklyBudget ? parseFloat(formData.weeklyBudget) : null,
        budget_preference: formData.budgetPreference,
        shopping_format: formData.shoppingFormat,
        supplements: formData.supplements,
        medications: formData.medications
      };

      // Save to backend
      const response = await createMealPrepProfile(profileData);

      if (response && response.message) {
        alert('Meal prep profile saved successfully!');
        console.log('Profile saved:', response.profile);

        // Optionally redirect to profiles page or reset form
        // You could add navigation logic here
      }
    } catch (error) {
      console.error('Error saving meal prep profile:', error);
      alert('Failed to save meal prep profile. Please try again.');
    }
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

  // Debounced search function for likes/dislikes field
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

  // Debounced search function for allergies field
  const handleAllergiesSearch = (searchTerm) => {
    setAllergiesSearchTerm(searchTerm);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        const results = await fetchIngredients(searchTerm);
        setAllergiesIngredients(results);
        setShowAllergiesDropdown(true);
      } else {
        // When search is cleared, show popular ingredients again
        setAllergiesIngredients(popularIngredients);
        setShowAllergiesDropdown(false);
      }
    }, 300);
  };

  // Debounced search function for exclude ingredients field
  const handleExcludeSearch = (searchTerm) => {
    setExcludeSearchTerm(searchTerm);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      if (searchTerm.length >= 2) {
        const results = await fetchIngredients(searchTerm);
        setExcludeIngredients(results);
        setShowExcludeDropdown(true);
      } else {
        // When search is cleared, show popular ingredients again
        setExcludeIngredients(popularIngredients);
        setShowExcludeDropdown(false);
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

  // Fetch and pre-fill user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        // Fetch fresh user data from server to ensure latest_weight is available
        const response = await getCurrentUser();
        const userData = response.user || getUserData(); // Fallback to localStorage if API fails

        if (userData && userData.preferences) {
          // Pre-fill form with user data
          const updates = {};

          // Calculate age from date_of_birth
          if (userData.date_of_birth) {
            const birthDate = new Date(userData.date_of_birth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            updates.age = age.toString();
          }

          // Set measurement units based on measurement_system
          const isImperial = userData.preferences.measurement_system === 'imperial';
          updates.weightUnit = isImperial ? 'lbs' : 'kg';
          updates.heightUnit = isImperial ? 'ft-in' : 'cm';

          // Handle height
          if (userData.preferences.height) {
            if (isImperial) {
              // Convert cm to feet and inches
              const cm = userData.preferences.height;
              const feet = Math.floor(cm / 30.48);
              const inches = Math.round((cm % 30.48) / 2.54);
              updates.heightFeet = feet.toString();
              updates.heightInches = inches.toString();
            } else {
              updates.height = userData.preferences.height.toString();
            }
          }

          // Handle latest weight
          if (userData.latest_weight) {
            const weightValue = userData.latest_weight.weight;
            const weightUnit = userData.latest_weight.unit;

            if (isImperial && weightUnit === 'kg') {
              // Convert kg to lbs for imperial users
              updates.weight = (weightValue * 2.20462).toFixed(1);
            } else if (!isImperial && weightUnit === 'lbs') {
              // Convert lbs to kg for metric users
              updates.weight = (weightValue / 2.20462).toFixed(1);
            } else {
              // Same unit, no conversion needed
              updates.weight = weightValue.toString();
            }
          }

          // Set goal from preferences
          if (userData.preferences.goal_type) {
            updates.goal = userData.preferences.goal_type.charAt(0).toUpperCase() + userData.preferences.goal_type.slice(1);
          }

          // Set activity level from preferences
          if (userData.preferences.activity_level) {
            updates.activityLevel = userData.preferences.activity_level.charAt(0).toUpperCase() + userData.preferences.activity_level.slice(1);
          }

          // Set target calories if available (for manual mode)
          if (userData.preferences.daily_calorie_goal) {
            updates.targetCalories = userData.preferences.daily_calorie_goal.toString();
            updates.calculateCalories = 'Manual';
          }

          if (Object.keys(updates).length > 0) {
            setFormData(prev => ({ ...prev, ...updates }));
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        // Fallback to localStorage data if API fails
        const userData = getUserData();
        if (userData && userData.preferences) {
          // Same logic as above for fallback
          const updates = {};

          // Calculate age from date_of_birth
          if (userData.date_of_birth) {
            const birthDate = new Date(userData.date_of_birth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
              age--;
            }
            updates.age = age.toString();
          }

          // Set measurement units based on measurement_system
          const isImperial = userData.preferences.measurement_system === 'imperial';
          updates.weightUnit = isImperial ? 'lbs' : 'kg';
          updates.heightUnit = isImperial ? 'ft-in' : 'cm';

          // Handle height
          if (userData.preferences.height) {
            if (isImperial) {
              // Convert cm to feet and inches
              const cm = userData.preferences.height;
              const feet = Math.floor(cm / 30.48);
              const inches = Math.round((cm % 30.48) / 2.54);
              updates.heightFeet = feet.toString();
              updates.heightInches = inches.toString();
            } else {
              updates.height = userData.preferences.height.toString();
            }
          }

          // Handle latest weight
          if (userData.latest_weight) {
            const weightValue = userData.latest_weight.weight;
            const weightUnit = userData.latest_weight.unit;

            if (isImperial && weightUnit === 'kg') {
              // Convert kg to lbs for imperial users
              updates.weight = (weightValue * 2.20462).toFixed(1);
            } else if (!isImperial && weightUnit === 'lbs') {
              // Convert lbs to kg for metric users
              updates.weight = (weightValue / 2.20462).toFixed(1);
            } else {
              // Same unit, no conversion needed
              updates.weight = weightValue.toString();
            }
          }

          // Set goal from preferences
          if (userData.preferences.goal_type) {
            updates.goal = userData.preferences.goal_type.charAt(0).toUpperCase() + userData.preferences.goal_type.slice(1);
          }

          // Set activity level from preferences
          if (userData.preferences.activity_level) {
            updates.activityLevel = userData.preferences.activity_level.charAt(0).toUpperCase() + userData.preferences.activity_level.slice(1);
          }

          // Set target calories if available (for manual mode)
          if (userData.preferences.daily_calorie_goal) {
            updates.targetCalories = userData.preferences.daily_calorie_goal.toString();
            updates.calculateCalories = 'Manual';
          }

          if (Object.keys(updates).length > 0) {
            setFormData(prev => ({ ...prev, ...updates }));
          }
        }
      }
    };

    fetchUserData();
  }, []);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="text-center py-12">
            <h2 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Ready to start your meal prep journey?</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-8">Let's create a personalized meal plan that fits your lifestyle and goals.</p>
            <button
              onClick={() => {
                updateFormData('started', true);
                handleNext();
              }}
              className="px-8 py-3 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg text-lg font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              Start
            </button>
          </div>
        );

      case 2:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Goal & Profile</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">What's your main goal? *</label>
                <div className={`grid grid-cols-2 gap-3 ${validationErrors.goal ? 'border border-red-300 dark:border-red-600 rounded-lg p-2' : ''}`}>
                  {['Lose', 'Maintain', 'Gain', 'Performance'].map(goal => (
                    <label key={goal} className="flex items-center p-3 border border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800">
                      <input
                        type="radio"
                        name="goal"
                        value={goal}
                        checked={formData.goal === goal}
                        onChange={(e) => updateFormData('goal', e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-gray-900 dark:text-white">{goal}</span>
                    </label>
                  ))}
                </div>
                {renderError('goal')}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Current weight *</label>
                  <div className={`flex ${validationErrors.weight ? 'border border-red-300 dark:border-red-600 rounded-lg' : ''}`}>
                    <input
                      type="number"
                      value={formData.weight}
                      onChange={(e) => updateFormData('weight', e.target.value)}
                      className={`flex-1 p-2 border border-gray-300 dark:border-slate-600 rounded-l-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${validationErrors.weight ? 'border-red-300 dark:border-red-600' : ''}`}
                      placeholder="Weight"
                    />
                    <select
                      value={formData.weightUnit}
                      onChange={(e) => updateFormData('weightUnit', e.target.value)}
                      className={`p-2 border-t border-r border-b border-gray-300 dark:border-slate-600 rounded-r-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${validationErrors.weight ? 'border-red-300 dark:border-red-600' : ''}`}
                    >
                      <option value="kg">kg</option>
                      <option value="lbs">lbs</option>
                    </select>
                  </div>
                  {renderError('weight')}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Height *</label>
                  <div className={`flex ${validationErrors.height ? 'border border-red-300 dark:border-red-600 rounded-lg' : ''}`}>
                    {formData.heightUnit === 'ft-in' ? (
                      <>
                        <input
                          type="number"
                          value={formData.heightFeet}
                          onChange={(e) => updateFormData('heightFeet', e.target.value)}
                          className={`flex-1 p-2 border border-gray-300 dark:border-slate-600 rounded-l-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${validationErrors.height ? 'border-red-300 dark:border-red-600' : ''}`}
                          placeholder="Feet"
                          min="0"
                          max="8"
                        />
                        <span className="px-2 py-2 bg-gray-100 dark:bg-slate-600 border-t border-b border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300">ft</span>
                        <input
                          type="number"
                          value={formData.heightInches}
                          onChange={(e) => updateFormData('heightInches', e.target.value)}
                          className={`flex-1 p-2 border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${validationErrors.height ? 'border-red-300 dark:border-red-600' : ''}`}
                          placeholder="Inches"
                          min="0"
                          max="11"
                        />
                        <span className="px-2 py-2 bg-gray-100 dark:bg-slate-600 border-t border-b border-gray-300 dark:border-slate-600 text-gray-600 dark:text-gray-300">in</span>
                        <select
                          value={formData.heightUnit}
                          onChange={(e) => updateFormData('heightUnit', e.target.value)}
                          className={`p-2 border-t border-r border-b border-gray-300 dark:border-slate-600 rounded-r-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${validationErrors.height ? 'border-red-300 dark:border-red-600' : ''}`}
                        >
                          <option value="cm">cm</option>
                          <option value="ft-in">ft-in</option>
                        </select>
                      </>
                    ) : (
                      <>
                        <input
                          type="number"
                          value={formData.height}
                          onChange={(e) => updateFormData('height', e.target.value)}
                          className={`flex-1 p-2 border border-gray-300 dark:border-slate-600 rounded-l-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${validationErrors.height ? 'border-red-300 dark:border-red-600' : ''}`}
                          placeholder="Height"
                        />
                        <select
                          value={formData.heightUnit}
                          onChange={(e) => updateFormData('heightUnit', e.target.value)}
                          className={`p-2 border-t border-r border-b border-gray-300 dark:border-slate-600 rounded-r-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${validationErrors.height ? 'border-red-300 dark:border-red-600' : ''}`}
                        >
                          <option value="cm">cm</option>
                          <option value="ft-in">ft-in</option>
                        </select>
                      </>
                    )}
                  </div>
                  {renderError('height')}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Age *</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => updateFormData('age', e.target.value)}
                  className={`w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${validationErrors.age ? 'border-red-300 dark:border-red-600' : ''}`}
                  placeholder="Your age"
                />
                {renderError('age')}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Activity level *</label>
                <select
                  value={formData.activityLevel}
                  onChange={(e) => updateFormData('activityLevel', e.target.value)}
                  className={`w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${validationErrors.activityLevel ? 'border-red-300 dark:border-red-600' : ''}`}
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Meals per day preference *</label>
                <div className={`grid grid-cols-4 gap-3 ${validationErrors.mealsPerDay ? 'border border-red-300 dark:border-red-600 rounded-lg p-2' : ''}`}>
                  {['2', '3', '4', '5+'].map(meals => (
                    <label key={meals} className="flex items-center p-3 border border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800">
                      <input
                        type="radio"
                        name="mealsPerDay"
                        value={meals}
                        checked={formData.mealsPerDay === meals}
                        onChange={(e) => updateFormData('mealsPerDay', e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-gray-900 dark:text-white">{meals}</span>
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
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Dietary Restrictions & Preferences</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Any food allergies? (optional)</label>

                {/* Selected allergies tags */}
                {selectedAllergies.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {selectedAllergies.map(allergy => (
                      <span
                        key={allergy}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200"
                      >
                        {allergy}
                        <button
                          onClick={() => handleAllergyToggle({ name: allergy })}
                          className="ml-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
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
                    className={`w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${validationErrors.allergies ? 'border-red-300 dark:border-red-600' : ''}`}
                    value={allergiesSearchTerm}
                    onChange={(e) => {
                      setAllergiesSearchTerm(e.target.value);
                      handleAllergiesSearch(e.target.value);
                    }}
                    onFocus={() => {
                      if (ingredients.length > 0) {
                        setShowAllergiesDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      // Delay hiding dropdown to allow for clicks
                      setTimeout(() => setShowAllergiesDropdown(false), 200);
                    }}
                  />

                  {/* Loading indicator */}
                  {isLoadingIngredients && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                    </div>
                  )}

                  {/* Dropdown with suggestions */}
                  {showAllergiesDropdown && allergiesIngredients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {allergiesIngredients.map(ingredient => (
                        <div
                          key={ingredient.id}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-100 dark:border-slate-600 last:border-b-0"
                          onClick={() => handleAllergyToggle(ingredient)}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">{ingredient.name}</div>
                            {ingredient.category && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{ingredient.category}</div>
                            )}
                          </div>
                          <div className="flex items-center">
                            {ingredient.popularity_score && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded mr-2">
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
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Popular ingredients:</p>
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
                              ? 'bg-red-100 dark:bg-red-900 border-red-300 dark:border-red-600 text-red-800 dark:text-red-200'
                              : 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Any intolerances?</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Lactose', 'FODMAP', 'Gluten', 'Histamine', 'Salicylates', 'Oxalates'].map(intolerance => (
                    <label key={intolerance} className="flex items-center p-2 text-gray-900 dark:text-white">
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Dietary preference (optional)</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Omnivore', 'Pescatarian', 'Vegetarian', 'Vegan', 'Keto', 'Flexible'].map(pref => (
                    <label key={pref} className="flex items-center p-3 border border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800">
                      <input
                        type="radio"
                        name="dietaryPreference"
                        value={pref}
                        checked={formData.dietaryPreference === pref}
                        onChange={(e) => updateFormData('dietaryPreference', e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-gray-900 dark:text-white">{pref}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Select your preferred diet or choose "Flexible" if you're open to various options</p>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Ingredient Likes / Dislikes</h2>
            <div className="space-y-6">
              <div>
                {/* Popular ingredients for quick selection - AT TOP */}
                {ingredientSearchTerm === '' && popularIngredients.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Popular ingredients to rate:</h4>
                    <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
                      {popularIngredients
                        .filter(ingredient => !ratedIngredients.has(ingredient.id))
                        .slice(0, 20)
                        .map(ingredient => (
                        <div key={ingredient.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-slate-600 rounded hover:bg-gray-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800">
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium truncate text-gray-900 dark:text-white">{ingredient.name}</span>
                            {ingredient.category && (
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{ingredient.category}</div>
                            )}
                          </div>
                          <div className="flex space-x-1 ml-2">
                            <button
                              onClick={() => handleIngredientPreference(ingredient, 'like')}
                              className={`p-1.5 rounded ${
                                (formData.ingredientPreferences || {})[ingredient.name] === 'like'
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              title="Like"
                            >
                              <Heart className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleIngredientPreference(ingredient, 'neutral')}
                              className={`p-1.5 rounded ${
                                (formData.ingredientPreferences || {})[ingredient.name] === 'neutral'
                                  ? 'bg-yellow-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              title="Neutral"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleIngredientPreference(ingredient, 'dislike')}
                              className={`p-1.5 rounded ${
                                (formData.ingredientPreferences || {})[ingredient.name] === 'dislike'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                              }`}
                              title="Dislike"
                            >
                              <X className="w-3 h-3" />
                            </button>
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
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    value={ingredientSearchTerm}
                    onChange={(e) => {
                      setIngredientSearchTerm(e.target.value);
                      handleIngredientSearch(e.target.value);
                    }}
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
                    <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {popularIngredients
                        .filter(ingredient => !ratedIngredients.has(ingredient.id))
                        .map(ingredient => (
                        <div
                          key={ingredient.id}
                          className="p-3 hover:bg-gray-50 dark:hover:bg-slate-700 border-b border-gray-100 dark:border-slate-600 last:border-b-0"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900 dark:text-white">{ingredient.name}</div>
                              {ingredient.category && (
                                <div className="text-sm text-gray-500 dark:text-gray-400">{ingredient.category}</div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {ingredient.popularity_score && (
                                <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded mr-2">
                                  {Math.round(ingredient.popularity_score)}%
                                </span>
                              )}
                              <div className="flex space-x-1">
                                <button
                                  onClick={() => handleIngredientPreference(ingredient, 'like')}
                                  className={`p-1.5 rounded ${
                                    (formData.ingredientPreferences || {})[ingredient.name] === 'like'
                                      ? 'bg-green-600 text-white'
                                      : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500'
                                  }`}
                                  title="Like"
                                >
                                  <Heart className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleIngredientPreference(ingredient, 'neutral')}
                                  className={`p-1.5 rounded ${
                                    (formData.ingredientPreferences || {})[ingredient.name] === 'neutral'
                                      ? 'bg-yellow-600 text-white'
                                      : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500'
                                  }`}
                                  title="Neutral"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleIngredientPreference(ingredient, 'dislike')}
                                  className={`p-1.5 rounded ${
                                    (formData.ingredientPreferences || {})[ingredient.name] === 'dislike'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-slate-500'
                                  }`}
                                  title="Dislike"
                                >
                                  <X className="w-3 h-3" />
                                </button>
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
                  <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 mb-6 bg-blue-50 dark:bg-blue-900/20">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                      Your ingredient preferences: ({Object.keys(formData.ingredientPreferences || {}).length} rated)
                    </h4>
                    <div className="max-h-96 overflow-y-auto">
                      {Object.entries(formData.ingredientPreferences || {}).map(([ingredientName, preference]) => (
                        <div key={ingredientName} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-slate-600 last:border-b-0">
                          <span className="font-medium text-gray-900 dark:text-white">{ingredientName}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 text-xs rounded ${
                              preference === 'like' ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : preference === 'dislike' ? 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                              : 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200'
                            }`}>
                              {preference.charAt(0).toUpperCase() + preference.slice(1)}
                            </span>
                            <button
                              onClick={() => handleIngredientPreference({ name: ingredientName }, preference)}
                              className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border border-gray-200 dark:border-slate-600 rounded-lg p-4 mb-6 bg-gray-50 dark:bg-slate-700">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Your ingredient preferences:</h4>
                    <p className="text-gray-600 dark:text-gray-300 text-sm">Rate some ingredients above to see them appear here!</p>
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
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    value={excludeSearchTerm}
                    onChange={(e) => {
                      setExcludeSearchTerm(e.target.value);
                      handleExcludeSearch(e.target.value);
                    }}
                    onFocus={() => {
                      if (popularIngredients.length > 0) {
                        setShowExcludeDropdown(true);
                      }
                    }}
                    onBlur={() => {
                      setTimeout(() => setShowExcludeDropdown(false), 200);
                    }}
                  />

                  {isLoadingIngredients && (
                    <div className="absolute right-3 top-3">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-600"></div>
                    </div>
                  )}

                  {/* Dropdown with ingredient suggestions for exclusion */}
                  {showExcludeDropdown && excludeIngredients.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                      {excludeIngredients
                        .filter(ingredient => !ratedIngredients.has(ingredient.id))
                        .map(ingredient => (
                        <div
                          key={ingredient.id}
                          className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-slate-700 cursor-pointer border-b border-gray-100 dark:border-slate-600 last:border-b-0"
                          onClick={() => handleExcludeIngredientToggle(ingredient)}
                        >
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 dark:text-white">{ingredient.name}</div>
                            {ingredient.category && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">{ingredient.category}</div>
                            )}
                          </div>
                          <div className="flex items-center">
                            {ingredient.popularity_score && (
                              <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded mr-2">
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
                {excludeSearchTerm === '' && popularIngredients.length > 0 && (
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
                              ? 'bg-orange-100 dark:bg-orange-900 border-orange-300 dark:border-orange-600 text-orange-800 dark:text-orange-200'
                              : 'bg-gray-100 dark:bg-slate-700 border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
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
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Meals You Love / Hate</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">List 1-3 meals you love</label>
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
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg mb-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder={`Meal ${index + 1} you love`}
                  />
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">List 1-3 meals you hate / never want</label>
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
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg mb-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
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
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Cooking Constraints & Style</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">How much time to cook per day? *</label>
                <div className={`grid grid-cols-2 gap-3 ${validationErrors.cookingTime ? 'border border-red-300 dark:border-red-600 rounded-lg p-2' : ''}`}>
                  {['10-20m', '20-40m', '40-60m', '60m+'].map(time => (
                    <label key={time} className="flex items-center p-3 border border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700 bg-white dark:bg-slate-800">
                      <input
                        type="radio"
                        name="cookingTime"
                        value={time}
                        checked={formData.cookingTime === time}
                        onChange={(e) => updateFormData('cookingTime', e.target.value)}
                        className="mr-3"
                      />
                      <span className="text-gray-900 dark:text-white">{time}</span>
                    </label>
                  ))}
                </div>
                {renderError('cookingTime')}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Do you want batch-cooking? *</label>
                <div className={`flex space-x-6 ${validationErrors.batchCooking ? 'border border-red-300 dark:border-red-600 rounded-lg p-2' : ''}`}>
                  <label className="flex items-center text-gray-900 dark:text-white">
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
                  <label className="flex items-center text-gray-900 dark:text-white">
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Kitchen equipment available *</label>
                <div className={`grid grid-cols-2 gap-3 ${validationErrors.kitchenEquipment ? 'border border-red-300 dark:border-red-600 rounded-lg p-2' : ''}`}>
                  {['Oven', 'Air fryer', 'Stove', 'Instant Pot', 'Blender', 'Grill', 'Microwave', 'Slow cooker'].map(equipment => (
                    <label key={equipment} className="flex items-center p-2 text-gray-900 dark:text-white">
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Skill level</label>
                <select
                  value={formData.skillLevel}
                  onChange={(e) => updateFormData('skillLevel', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
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
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Meal Timing & Schedule</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Typical meal times</label>
                <div className="grid grid-cols-3 gap-4">
                  {['breakfast', 'lunch', 'dinner'].map(meal => (
                    <div key={meal}>
                      <label className="block text-sm font-medium mb-1 capitalize text-gray-700 dark:text-gray-300">{meal}</label>
                      <input
                        type="time"
                        value={formData.mealTimes[meal]}
                        onChange={(e) => updateNestedFormData('mealTimes', meal, e.target.value)}
                        className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
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
                    className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg mt-2 bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    placeholder="How many snacks per day?"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Any timing rules?</label>
                <div className="space-y-2">
                  {['No food after 9pm', 'Pre-workout meal only', 'Fasting mornings', 'Late dinner'].map(rule => (
                    <label key={rule} className="flex items-center p-2 text-gray-900 dark:text-white">
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
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Portions, Calories & Macros</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Do you want us to calculate calories? *</label>
                <div className={`flex space-x-6 ${validationErrors.calculateCalories ? 'border border-red-300 dark:border-red-600 rounded-lg p-2' : ''}`}>
                  <label className="flex items-center text-gray-900 dark:text-white">
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
                  <label className="flex items-center text-gray-900 dark:text-white">
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
                      className={`flex-1 p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${validationErrors.targetCalories ? 'border-red-300 dark:border-red-600' : ''}`}
                      placeholder="Target calories"
                    />
                    <button
                      onClick={applySuggestedMacros}
                      className="px-3 py-2 bg-emerald-600 dark:bg-emerald-700 text-white text-sm rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600"
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
                              className="w-20 px-2 py-1 text-sm border border-gray-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
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
                              className="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-900 dark:text-white rounded"
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
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Budget & Shopping Preferences</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Weekly food budget</label>
                <input
                  type="number"
                  value={formData.weeklyBudget}
                  onChange={(e) => updateFormData('weeklyBudget', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
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

            </div>
          </div>
        );

      case 10:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Supplements & Medications</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Do you take supplements?</label>
                <div className="grid grid-cols-2 gap-3">
                  {['Creatine', 'Omega-3', 'Multivitamin', 'Protein powder', 'Vitamin D', 'Calcium', 'Iron', 'Magnesium'].map(supplement => (
                    <label key={supplement} className="flex items-center p-2 text-gray-900 dark:text-white">
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
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Any medications?</label>
                <textarea
                  value={formData.medications}
                  onChange={(e) => updateFormData('medications', e.target.value)}
                  className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
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
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Complete Review & Preview</h2>
            <div className="space-y-8">
              {/* Profile Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 text-blue-900 dark:text-blue-200">📋 Your Profile Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900 dark:text-white">
                  <div>
                    <p><strong>Goal:</strong> {formData.goal || 'Not specified'}</p>
                    <p><strong>Weight:</strong> {formData.weight} {formData.weightUnit}</p>
                    <p><strong>Height:</strong> {
                      formData.heightUnit === 'ft-in'
                        ? `${formData.heightFeet || 0}'${formData.heightInches || 0}"`
                        : `${formData.height} ${formData.heightUnit}`
                    }</p>
                    <p><strong>Age:</strong> {formData.age} years</p>
                  </div>
                  <div>
                    <p><strong>Activity Level:</strong> {formData.activityLevel || 'Not specified'}</p>
                    <p><strong>Meals per Day:</strong> {formData.mealsPerDay || 'Not specified'}</p>
                    <p><strong>Dietary Preference:</strong> {formData.dietaryPreference || 'Not specified'}</p>
                    <p><strong>Cooking Time:</strong> {formData.cookingTime || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Nutritional Goals */}
              <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 text-green-900 dark:text-green-200">🎯 Nutritional Goals</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900 dark:text-white">
                  <div>
                    <p><strong>Calorie Calculation:</strong> {formData.calculateCalories === 'Auto' ? 'Auto-calculated' : 'Manual'}</p>
                    {formData.calculateCalories === 'Manual' && formData.targetCalories && (
                      <p><strong>Target Calories:</strong> {formData.targetCalories} kcal/day</p>
                    )}
                  </div>
                  <div>
                    <p><strong>Protein:</strong> {formData.macroPreference.protein}g</p>
                    <p><strong>Fat:</strong> {formData.macroPreference.fat}g</p>
                    <p><strong>Carbs:</strong> {formData.macroPreference.carbs}g</p>
                  </div>
                </div>
              </div>

              {/* Exclusions Summary */}
              <div className="bg-gray-50 dark:bg-slate-700 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">🚫 Auto-generated Exclusions</h3>
                <div className="space-y-3">
                  {selectedAllergies.length > 0 && (
                    <div className="flex items-start">
                      <span className="text-red-500 dark:text-red-400 mr-2">⚠️</span>
                      <div>
                        <p className="font-medium text-red-800 dark:text-red-300">Allergies to avoid:</p>
                        <p className="text-sm text-red-700 dark:text-red-400">{selectedAllergies.join(', ')}</p>
                      </div>
                    </div>
                  )}
                  {formData.intolerances.length > 0 && (
                    <div className="flex items-start">
                      <span className="text-orange-500 dark:text-orange-400 mr-2">⚠️</span>
                      <div>
                        <p className="font-medium text-orange-800 dark:text-orange-300">Intolerances to avoid:</p>
                        <p className="text-sm text-orange-700 dark:text-orange-400">{formData.intolerances.join(', ')}</p>
                      </div>
                    </div>
                  )}
                  {selectedExcludedIngredients.length > 0 && (
                    <div className="flex items-start">
                      <span className="text-gray-500 dark:text-gray-400 mr-2">🚫</span>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-300">Manually excluded ingredients:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-400">{selectedExcludedIngredients.join(', ')}</p>
                      </div>
                    </div>
                  )}
                  {Object.entries(formData.ingredientPreferences || {}).filter(([_, preference]) => preference === 'dislike').length > 0 && (
                    <div className="flex items-start">
                      <span className="text-gray-500 dark:text-gray-400 mr-2">👎</span>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-300">Disliked ingredients:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-400">
                          {Object.entries(formData.ingredientPreferences || {})
                            .filter(([_, preference]) => preference === 'dislike')
                            .map(([name, _]) => name)
                            .join(', ')}
                        </p>
                      </div>
                    </div>
                  )}
                  {formData.hatedMeals.filter(meal => meal).length > 0 && (
                    <div className="flex items-start">
                      <span className="text-gray-500 dark:text-gray-400 mr-2">😖</span>
                      <div>
                        <p className="font-medium text-gray-800 dark:text-gray-300">Meals to avoid:</p>
                        <p className="text-sm text-gray-700 dark:text-gray-400">{formData.hatedMeals.filter(meal => meal).join(', ')}</p>
                      </div>
                    </div>
                  )}
                  {selectedAllergies.length === 0 && formData.intolerances.length === 0 &&
                   selectedExcludedIngredients.length === 0 &&
                   Object.entries(formData.ingredientPreferences || {}).filter(([_, preference]) => preference === 'dislike').length === 0 &&
                   formData.hatedMeals.filter(meal => meal).length === 0 && (
                    <div className="flex items-center">
                      <span className="text-green-500 dark:text-green-400 mr-2">✅</span>
                      <p className="text-green-700 dark:text-green-400 italic">No exclusions specified - you can enjoy a wide variety of foods!</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Sample Day Preview */}
              <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 text-amber-900 dark:text-amber-200">👀 Sample Day Preview</h3>
                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-amber-200 dark:border-amber-700">
                  <h4 className="font-medium mb-3 text-gray-800 dark:text-white">Your typical day might look like:</h4>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <span className="w-20 text-sm font-medium text-amber-700 dark:text-amber-300">Breakfast:</span>
                      <span className="text-sm text-gray-900 dark:text-white">Oatmeal with berries and nuts ({Math.round((formData.macroPreference.carbs * 0.3) + (formData.macroPreference.protein * 0.2))}g carbs, {Math.round(formData.macroPreference.protein * 0.2)}g protein)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-20 text-sm font-medium text-amber-700 dark:text-amber-300">Lunch:</span>
                      <span className="text-sm text-gray-900 dark:text-white">Grilled chicken salad with mixed vegetables ({Math.round((formData.macroPreference.carbs * 0.3) + (formData.macroPreference.protein * 0.4))}g carbs, {Math.round(formData.macroPreference.protein * 0.4)}g protein)</span>
                    </div>
                    <div className="flex items-center">
                      <span className="w-20 text-sm font-medium text-amber-700 dark:text-amber-300">Dinner:</span>
                      <span className="text-sm text-gray-900 dark:text-white">Baked salmon with vegetables ({Math.round((formData.macroPreference.carbs * 0.4) + (formData.macroPreference.protein * 0.4))}g carbs, {Math.round(formData.macroPreference.protein * 0.4)}g protein)</span>
                    </div>
                    {formData.wantSnacks === 'Yes' && (
                      <div className="flex items-center">
                        <span className="w-20 text-sm font-medium text-amber-700 dark:text-amber-300">Snacks:</span>
                        <span className="text-sm text-gray-900 dark:text-white">Greek yogurt and apple ({Math.round(formData.macroPreference.carbs * 0.1)}g carbs, {Math.round(formData.macroPreference.protein * 0.1)}g protein)</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-3 border-t border-amber-200 dark:border-amber-700">
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      <strong>Estimated daily totals:</strong> {getEstimatedTotalCalories()} calories, {formData.macroPreference.protein}g protein, {formData.macroPreference.fat}g fat, {formData.macroPreference.carbs}g carbs
                    </p>
                  </div>
                </div>
              </div>

              {/* Preferences Summary */}
              <div className="bg-purple-50 dark:bg-purple-900/20 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 text-purple-900 dark:text-purple-200">⚙️ Cooking & Shopping Preferences</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-900 dark:text-white">
                  <div>
                    <p><strong>Batch Cooking:</strong> {formData.batchCooking || 'Not specified'}</p>
                    <p><strong>Cooking Time:</strong> {formData.cookingTime || 'Not specified'}</p>
                    <p><strong>Kitchen Equipment:</strong> {formData.kitchenEquipment.length > 0 ? formData.kitchenEquipment.join(', ') : 'None specified'}</p>
                  </div>
                  <div>
                    <p><strong>Weekly Budget:</strong> {formData.weeklyBudget ? `$${formData.weeklyBudget}` : 'Not specified'}</p>
                    <p><strong>Budget Preference:</strong> {formData.budgetPreference < 33 ? 'Budget-friendly' : formData.budgetPreference > 66 ? 'Premium' : 'Balanced'}</p>
                    <p><strong>Meal Timing:</strong> {formData.mealTimes.breakfast ? 'Custom times' : 'Flexible'}</p>
                  </div>
                </div>
              </div>

              {/* Final Confirmation */}
              <div className="bg-white dark:bg-slate-800 border-2 border-gray-200 dark:border-slate-600 p-6 rounded-lg">
                <h3 className="font-semibold text-lg mb-4 text-gray-900 dark:text-white">🎉 Ready to Create Your Meal Plan?</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-4">
                  This comprehensive review shows everything we've collected about your preferences.
                  Your personalized meal plan will be generated based on this information.
                </p>
                <div className="space-y-3">
                  <label className={`flex items-start ${validationErrors.exclusionsConfirmed ? 'border border-red-300 dark:border-red-600 rounded-lg p-3' : ''}`}>
                    <input
                      type="checkbox"
                      checked={formData.exclusionsConfirmed}
                      onChange={(e) => updateFormData('exclusionsConfirmed', e.target.checked)}
                      className="mr-3 mt-1"
                    />
                    <span className="text-sm text-gray-900 dark:text-white">
                      I confirm that all the information above is accurate and I understand that my meal plan will be generated based on these preferences and restrictions.
                    </span>
                  </label>
                  {renderError('exclusionsConfirmed')}
                </div>
              </div>
            </div>
          </div>
        );

      case 12:
        return (
          <div>
            <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Save Profile</h2>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Profile name *</label>
                <input
                  type="text"
                  value={formData.profileName}
                  onChange={(e) => updateFormData('profileName', e.target.value)}
                  className={`w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 ${validationErrors.profileName ? 'border-red-300 dark:border-red-600' : ''}`}
                  placeholder="Name your meal prep profile"
                />
                {renderError('profileName')}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Meal Prep Setup</h1>
          <span className="text-sm text-gray-500 dark:text-gray-400">Step {currentStep} of 13</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-emerald-600 dark:bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / 13) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        {renderStep()}
      </div>

      <div className="flex justify-between mt-6">
        {currentStep > 1 && (
          <button
            onClick={handlePrev}
            className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            Previous
          </button>
        )}
        {currentStep < 13 ? (
          <button
            onClick={handleNext}
            className="px-6 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 ml-auto"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 ml-auto"
          >
            Complete Setup
          </button>
        )}
      </div>
    </div>
  );
};

export default MealPrepForm;