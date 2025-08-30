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
import { getMealPrepProfileById } from '../utils/api';

const AIAssistant = () => {
  const { profileId } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchProfile();
  }, [profileId]);

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

  // Mock AI recommendations - in a real app, these would come from an AI service
  const mockMealRecommendations = [
    {
      id: 1,
      name: 'High-Protein Chicken Stir Fry',
      calories: 450,
      protein: 35,
      carbs: 25,
      fat: 15,
      prepTime: 20,
      difficulty: 'Easy',
      tags: ['High Protein', 'Quick', 'Asian']
    },
    {
      id: 2,
      name: 'Quinoa Buddha Bowl',
      calories: 380,
      protein: 18,
      carbs: 45,
      fat: 12,
      prepTime: 15,
      difficulty: 'Easy',
      tags: ['Vegetarian', 'Healthy', 'Quick']
    },
    {
      id: 3,
      name: 'Salmon with Roasted Vegetables',
      calories: 520,
      protein: 42,
      carbs: 20,
      fat: 28,
      prepTime: 30,
      difficulty: 'Medium',
      tags: ['Omega-3', 'Healthy', 'Mediterranean']
    }
  ];

  const mockShoppingList = [
    { category: 'Proteins', items: ['Chicken breast (1.5 lbs)', 'Salmon fillets (0.75 lbs)', 'Greek yogurt (32 oz)', 'Eggs (12 count)'] },
    { category: 'Vegetables', items: ['Broccoli (2 heads)', 'Bell peppers (4)', 'Spinach (10 oz)', 'Carrots (1 lb)', 'Sweet potatoes (3)'] },
    { category: 'Grains', items: ['Quinoa (1 lb)', 'Brown rice (2 lbs)', 'Whole grain bread (1 loaf)'] },
    { category: 'Pantry', items: ['Olive oil', 'Soy sauce', 'Garlic', 'Herbs and spices'] }
  ];

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
                  AI Meal Recommendations
                </h3>
                <button className="flex items-center px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Generate New
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mockMealRecommendations.map((meal) => (
                  <div key={meal.id} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">{meal.name}</h4>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mb-2">
                          <Clock className="w-4 h-4 mr-1" />
                          {meal.prepTime} min
                        </div>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                          meal.difficulty === 'Easy' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          meal.difficulty === 'Medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        }`}>
                          {meal.difficulty}
                        </span>
                      </div>
                      <button className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300">
                        <CheckCircle className="w-5 h-5" />
                      </button>
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
                      {meal.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'shopping' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Smart Shopping List
                </h3>
                <button className="flex items-center px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {mockShoppingList.map((category, index) => (
                  <div key={index} className="bg-gray-50 dark:bg-slate-700 rounded-lg p-6">
                    <h4 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <ShoppingCart className="w-5 h-5 mr-2 text-emerald-600 dark:text-emerald-400" />
                      {category.category}
                    </h4>
                    <ul className="space-y-2">
                      {category.items.map((item, itemIndex) => (
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
                ))}
              </div>

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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;