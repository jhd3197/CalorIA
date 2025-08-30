import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ChefHat,
  Target,
  Clock,
  DollarSign,
  Star,
  Sparkles,
  ShoppingCart,
  BookOpen,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Lightbulb,
  TrendingUp
} from 'lucide-react';
import { getMealPrepProfileById, getAIMealRecommendations, getAIShoppingList, getAIMealPlanOverview, getAIInsights, regenerateAIMealRecommendations, getLatestAIResponses, generateBasicMeals, generateMealRecipes, generateMealShoppingList } from '../utils/api';

const MealPrepAIAssistant = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [mealRecommendations, setMealRecommendations] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [generatingRecommendations, setGeneratingRecommendations] = useState(false);
  const [generatingShoppingList, setGeneratingShoppingList] = useState(false);
  const [generatingInsights, setGeneratingInsights] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [showRecipeModal, setShowRecipeModal] = useState(false);

  // Progress tracking state
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [currentStep, setCurrentStep] = useState('');
  const [progressMessages, setProgressMessages] = useState([]);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, [profileId]);

  useEffect(() => {
    if (profile) {
      loadLatestAIResponses();
    }
  }, [profile]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getMealPrepProfileById(profileId);
      setProfile(response.profile || response);
    } catch (err) {
      console.error('Error fetching meal prep profile:', err);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToProfiles = () => {
    navigate('/meal-prep');
  };

  const fetchMealRecommendations = async () => {
    try {
      setGeneratingRecommendations(true);
      const response = await getAIMealRecommendations(profileId);
      setMealRecommendations(response.recommendations || []);
    } catch (err) {
      console.error('Error fetching meal recommendations:', err);
      // Keep existing recommendations or show error
    } finally {
      setGeneratingRecommendations(false);
    }
  };

  const fetchShoppingList = async () => {
    try {
      setGeneratingShoppingList(true);
      const response = await getAIShoppingList(profileId, null, mealRecommendations.length > 0 ? mealRecommendations : null);
      setShoppingList(response.shopping_list || []);
    } catch (err) {
      console.error('Error fetching shopping list:', err);
      // Keep existing shopping list or show error
    } finally {
      setGeneratingShoppingList(false);
    }
  };

  const fetchAIInsights = async () => {
    try {
      setGeneratingInsights(true);
      const response = await getAIInsights(profileId);
      setAiInsights(response.insights || []);
    } catch (err) {
      console.error('Error fetching AI insights:', err);
      // Keep existing insights or show error
    } finally {
      setGeneratingInsights(false);
    }
  };

  const loadLatestAIResponses = async () => {
    try {
      const response = await getLatestAIResponses(profileId);
      const latestResponses = response.latest_responses || {};

      // Restore meal recommendations if available
      if (latestResponses.meal_recommendations) {
        try {
          const recommendations = JSON.parse(latestResponses.meal_recommendations.ai_response);
          setMealRecommendations(recommendations);
        } catch (e) {
          console.error('Error parsing saved meal recommendations:', e);
        }
      }

      // Restore shopping list if available
      if (latestResponses.shopping_list) {
        try {
          const shoppingList = JSON.parse(latestResponses.shopping_list.ai_response);
          setShoppingList(shoppingList);
        } catch (e) {
          console.error('Error parsing saved shopping list:', e);
        }
      }

      // Restore AI insights if available
      if (latestResponses.ai_insights) {
        try {
          const insights = JSON.parse(latestResponses.ai_insights.ai_response);
          setAiInsights(insights);
        } catch (e) {
          console.error('Error parsing saved AI insights:', e);
        }
      }

    } catch (err) {
      console.error('Error loading latest AI responses:', err);
      // Don't show error to user, just continue with empty state
    }
  };

  const addProgressMessage = (message) => {
    setProgressMessages(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleGenerateAll = async () => {
    setIsGeneratingAll(true);
    setShowProgressModal(true);
    setProgressMessages([]);
    setCurrentStep('Initializing...');

    try {
      const userData = JSON.parse(localStorage.getItem('user'));
      const userId = userData?.user_id || userData?.id;

      if (!userId) {
        throw new Error('User ID not found');
      }

      // Step 1: Generate basic meals
      setCurrentStep('Step 1/3: Generating meal structure...');
      addProgressMessage('Starting meal generation process');

      const basicMealsResponse = await generateBasicMeals(profileId, userId);
      setMealRecommendations(basicMealsResponse.meals || []);
      addProgressMessage(`✅ Generated ${basicMealsResponse.total_meals} basic meals`);

      // Step 2: Generate recipes for meals
      setCurrentStep('Step 2/3: Creating detailed recipes...');
      addProgressMessage('Generating detailed recipes for each meal');

      const recipesResponse = await generateMealRecipes(profileId, basicMealsResponse.meals, userId);
      setMealRecommendations(recipesResponse.meals || []);
      addProgressMessage(`✅ Added recipes to ${recipesResponse.total_meals} meals`);

      // Step 3: Generate shopping list
      setCurrentStep('Step 3/3: Building shopping list...');
      addProgressMessage('Creating optimized shopping list');

      const shoppingResponse = await generateMealShoppingList(profileId, recipesResponse.meals, userId);
      setShoppingList(shoppingResponse.shopping_list || []);
      addProgressMessage(`✅ Generated shopping list with ${shoppingResponse.total_categories} categories`);

      // Success
      setCurrentStep('Complete! 🎉');
      addProgressMessage('Meal plan generation completed successfully');

      // Auto-close progress modal after a delay
      setTimeout(() => {
        setShowProgressModal(false);
      }, 2000);

    } catch (error) {
      console.error('Error in modular generation:', error);
      addProgressMessage(`❌ Error: ${error.message}`);
      setCurrentStep('Error occurred');
    } finally {
      setIsGeneratingAll(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    await fetchMealRecommendations();
  };

  const handleGenerateShoppingList = async () => {
    await fetchShoppingList();
  };

  const handleGenerateInsights = async () => {
    await fetchAIInsights();
  };

  const handleViewRecipe = (meal) => {
    setSelectedMeal(meal);
    setShowRecipeModal(true);
  };

  const handleAddToCollection = (meal) => {
    // TODO: Implement add to collection functionality
    console.log('Adding meal to collection:', meal.name);
    // You could add a toast notification here
  };

  const checkIngredientInShoppingList = (ingredientName) => {
    if (!shoppingList.length) return false;
    return shoppingList.some(category =>
      category.items && category.items.some(item =>
        item.toLowerCase().includes(ingredientName.toLowerCase())
      )
    );
  };


  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-400 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Loading AI Assistant...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
            <div className="space-x-4">
              <button
                onClick={fetchProfile}
                className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600"
              >
                Try Again
              </button>
              <button
                onClick={handleBackToProfiles}
                className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
              >
                Back to Profiles
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-300">Profile not found</p>
            <button
              onClick={handleBackToProfiles}
              className="mt-4 px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600"
            >
              Back to Profiles
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={handleBackToProfiles}
          className="flex items-center text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Meal Prep Profiles
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              AI Assistant
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              Personalized meal planning for <span className="font-semibold text-emerald-600 dark:text-emerald-400">{profile.profile_name}</span>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Sparkles className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
      </div>

      {/* Profile Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mr-4">
              <Target className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Goal</p>
              <p className="font-semibold text-gray-900 dark:text-white">{profile.goal || 'Not specified'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-4">
              <Clock className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Meals per Day</p>
              <p className="font-semibold text-gray-900 dark:text-white">{profile.meals_per_day || 'Not specified'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mr-4">
              <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Weekly Budget</p>
              <p className="font-semibold text-gray-900 dark:text-white">${profile.weekly_budget || 'Not specified'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-4">
              <Star className="w-6 h-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Status</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {profile.is_active ? 'Active' : 'Inactive'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Generate All Button */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Generate Meal Plan & Shopping List
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              {(parseInt(profile?.meals_per_day) >= 5 || profile?.meals_per_day === '5+')
                ? "Generate a complete 7-day meal plan with categorized meals and shopping list"
                : "Generate personalized meal recommendations and shopping list"
              }
            </p>
          </div>
          <button
            onClick={handleGenerateAll}
            disabled={isGeneratingAll}
            className="flex items-center px-6 py-3 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGeneratingAll ? (
              <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
            ) : (
              <Sparkles className="w-5 h-5 mr-2" />
            )}
            {isGeneratingAll ? 'Generating...' : 'Generate All'}
          </button>
        </div>
      </div>

      {/* AI Features Tabs */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow mb-8">
        <div className="border-b border-gray-200 dark:border-slate-600">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'overview'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('recommendations')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'recommendations'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Meal Recommendations
            </button>
            <button
              onClick={() => setActiveTab('shopping')}
              className={`px-6 py-4 text-sm font-medium border-b-2 ${
                activeTab === 'shopping'
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Shopping List
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <Sparkles className="w-16 h-16 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  AI-Powered Meal Planning
                </h3>
                <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                  Your personalized AI assistant analyzes your profile preferences, goals, and constraints
                  to create the perfect meal plan tailored just for you.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 p-6 rounded-lg">
                  <Lightbulb className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mb-3" />
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Recommendations</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    AI analyzes your nutritional needs and preferences to suggest optimal meals
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 rounded-lg">
                  <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400 mb-3" />
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Progress Tracking</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Monitor your meal prep progress and adjust recommendations based on your results
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-6 rounded-lg">
                  <ShoppingCart className="w-8 h-8 text-purple-600 dark:text-purple-400 mb-3" />
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Shopping</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Generate optimized shopping lists based on your meal plan and budget
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {(parseInt(profile?.meals_per_day) >= 5 || profile?.meals_per_day === '5+') ? '7-Day Meal Plan' : 'AI Meal Recommendations'}
                </h3>
              </div>

              {mealRecommendations.length > 0 ? (
                (parseInt(profile?.meals_per_day) >= 5 || profile?.meals_per_day === '5+') ? (
                  // Multi-day plan view
                  <div className="space-y-8">
                    {[1, 2, 3, 4, 5, 6, 7].map(day => {
                      const dayMeals = mealRecommendations.filter(meal => meal.day === day);
                      if (dayMeals.length === 0) return null;

                      return (
                        <div key={day} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                            Day {day}
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {dayMeals.map((meal, index) => (
                              <div key={index} className="bg-white dark:bg-slate-600 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center mb-2">
                                      <span className={`inline-block px-2 py-1 text-xs rounded-full mr-2 ${
                                        meal.meal_type === 'Breakfast' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                                        meal.meal_type === 'Lunch' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                                        meal.meal_type === 'Dinner' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                      }`}>
                                        {meal.meal_type}
                                      </span>
                                    </div>
                                    <h5 className="font-semibold text-gray-900 dark:text-white mb-1">{meal.name}</h5>
                                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                                      <Clock className="w-3 h-3 mr-1" />
                                      {meal.prepTime || meal.prep_time} min
                                    </div>
                                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                                      meal.difficulty === 'Easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                                      meal.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                                      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                    }`}>
                                      {meal.difficulty}
                                    </span>
                                  </div>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => handleViewRecipe(meal)}
                                      className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                                      title="View Recipe"
                                    >
                                      <BookOpen className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleAddToCollection(meal)}
                                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                                      title="Add to Collection"
                                    >
                                      <CheckCircle className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>

                                <div className="space-y-1 mb-3 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Calories:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{meal.calories} kcal</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400">Protein:</span>
                                    <span className="font-medium text-gray-900 dark:text-white">{meal.protein}g</span>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-1">
                                  {meal.tags && meal.tags.map((tag, tagIndex) => (
                                    <span key={tagIndex} className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded">
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  // Single day view (existing logic)
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {mealRecommendations.map((meal, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{meal.name}</h4>
                            <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                              <Clock className="w-4 h-4 mr-1" />
                              {meal.prepTime || meal.prep_time} min
                            </div>
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              meal.difficulty === 'Easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              meal.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {meal.difficulty}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleViewRecipe(meal)}
                              className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                              title="View Recipe"
                            >
                              <BookOpen className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAddToCollection(meal)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                              title="Add to Collection"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Calories:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{meal.calories} kcal</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Protein:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{meal.protein}g</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Carbs:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{meal.carbs}g</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Fat:</span>
                            <span className="font-medium text-gray-900 dark:text-white">{meal.fat}g</span>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          {meal.tags && meal.tags.map((tag, tagIndex) => (
                            <span key={tagIndex} className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400 mb-4">No meal recommendations yet</p>
                  <button
                    onClick={handleGenerateRecommendations}
                    disabled={generatingRecommendations}
                    className="px-6 py-3 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingRecommendations ? 'Generating...' : 'Generate Recommendations'}
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'shopping' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Smart Shopping List
                </h3>
                <button
                  onClick={handleGenerateShoppingList}
                  disabled={generatingShoppingList}
                  className="flex items-center px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingShoppingList ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {generatingShoppingList ? 'Generating...' : 'Regenerate'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {shoppingList.length > 0 ? shoppingList.map((category, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <ShoppingCart className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                      {category.category}
                    </h4>
                    <ul className="space-y-2">
                      {category.items && category.items.map((item, itemIndex) => (
                        <li key={itemIndex} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <input
                            type="checkbox"
                            className="mr-3 rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )) : (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 mb-4">No shopping list generated yet</p>
                    <button
                      onClick={handleGenerateShoppingList}
                      disabled={generatingShoppingList}
                      className="px-6 py-3 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingShoppingList ? 'Generating...' : 'Generate Shopping List'}
                    </button>
                  </div>
                )}
              </div>

              {profile?.weekly_budget && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 p-6 rounded-lg">
                  <div className="flex items-center">
                    <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-emerald-400 mr-3" />
                    <div>
                      <h4 className="font-semibold text-emerald-800 dark:text-emerald-200">Budget Optimized</h4>
                      <p className="text-sm text-emerald-700 dark:text-emerald-300">
                        This shopping list is optimized for your ${profile.weekly_budget} weekly budget,
                        prioritizing cost-effective ingredients while maintaining nutritional value.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Progress Modal */}
      {showProgressModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Generating Meal Plan
                </h3>
                {!isGeneratingAll && (
                  <button
                    onClick={() => setShowProgressModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <span className="text-2xl">&times;</span>
                  </button>
                )}
              </div>

              <div className="mb-6">
                <div className="flex items-center mb-2">
                  <RefreshCw className={`w-5 h-5 mr-3 ${isGeneratingAll ? 'animate-spin text-emerald-600 dark:text-emerald-400' : 'text-green-600 dark:text-green-400'}`} />
                  <span className="text-lg font-medium text-gray-900 dark:text-white">
                    {currentStep}
                  </span>
                </div>

                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      currentStep.includes('Complete') ? 'bg-green-600' :
                      currentStep.includes('Error') ? 'bg-red-600' :
                      'bg-emerald-600'
                    }`}
                    style={{
                      width: currentStep.includes('Step 1') ? '33%' :
                             currentStep.includes('Step 2') ? '66%' :
                             currentStep.includes('Step 3') || currentStep.includes('Complete') ? '100%' : '0%'
                    }}
                  ></div>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 max-h-60 overflow-y-auto">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Progress Log:</h4>
                <div className="space-y-1">
                  {progressMessages.map((message, index) => (
                    <div key={index} className="text-sm text-gray-600 dark:text-gray-400 font-mono">
                      {message}
                    </div>
                  ))}
                </div>
              </div>

              {!isGeneratingAll && (
                <div className="flex justify-end mt-6">
                  <button
                    onClick={() => setShowProgressModal(false)}
                    className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600"
                  >
                    View Results
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {showRecipeModal && selectedMeal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedMeal.name}
                </h3>
                <button
                  onClick={() => setShowRecipeModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <span className="text-2xl">&times;</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Calories</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedMeal.calories} kcal</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Prep Time</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedMeal.prepTime || selectedMeal.prep_time} min</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Difficulty</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedMeal.difficulty}</p>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Meal Type</span>
                  <p className="font-semibold text-gray-900 dark:text-white">{selectedMeal.meal_type || 'General'}</p>
                </div>
                {selectedMeal.servings && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Servings</span>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedMeal.servings}</p>
                  </div>
                )}
                {selectedMeal.day && (
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Day</span>
                    <p className="font-semibold text-gray-900 dark:text-white">{selectedMeal.day}</p>
                  </div>
                )}
              </div>

              {selectedMeal.ingredients && selectedMeal.ingredients.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Ingredients</h4>
                  <ul className="space-y-2">
                    {selectedMeal.ingredients.map((ingredient, index) => (
                      <li key={index} className="flex items-center text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          className="mr-3 rounded border-gray-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className={checkIngredientInShoppingList(ingredient.name) ? 'line-through text-green-600 dark:text-green-400' : ''}>
                          {ingredient.quantity} {ingredient.name}
                        </span>
                        {checkIngredientInShoppingList(ingredient.name) && (
                          <span className="ml-2 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-2 py-1 rounded">
                            In shopping list
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedMeal.instructions && (
                <div className="mb-6">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Instructions</h4>
                  <ol className="list-decimal list-inside text-gray-700 dark:text-gray-300 space-y-2">
                    {Array.isArray(selectedMeal.instructions)
                      ? selectedMeal.instructions.map((instruction, index) => (
                          <li key={index} className="leading-relaxed">{instruction}</li>
                        ))
                      : <li className="leading-relaxed whitespace-pre-line">{selectedMeal.instructions}</li>
                    }
                  </ol>
                </div>
              )}

              <div className="flex flex-wrap gap-2 mb-4">
                {selectedMeal.tags && selectedMeal.tags.map((tag, tagIndex) => (
                  <span key={tagIndex} className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => handleAddToCollection(selectedMeal)}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  Add to Collection
                </button>
                <button
                  onClick={() => setShowRecipeModal(false)}
                  className="px-4 py-2 bg-gray-600 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MealPrepAIAssistant;