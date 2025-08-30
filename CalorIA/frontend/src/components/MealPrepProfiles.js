import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, ChefHat, Target, Clock, DollarSign, Star, Edit, Trash2, Eye } from 'lucide-react';
import { getUserMealPrepProfiles, getMealPrepProfileCount, deleteMealPrepProfile, activateMealPrepProfile } from '../utils/api';

const MealPrepProfiles = () => {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    try {
      setLoading(true);
      const response = await getUserMealPrepProfiles();
      setProfiles(response.profiles || []);
    } catch (err) {
      console.error('Error fetching meal prep profiles:', err);
      setError('Failed to load meal prep profiles');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (profileId) => {
    if (window.confirm('Are you sure you want to delete this meal prep profile?')) {
      try {
        await deleteMealPrepProfile(profileId);
        setProfiles(profiles.filter(profile => profile.id !== profileId));
      } catch (err) {
        console.error('Error deleting profile:', err);
        alert('Failed to delete profile');
      }
    }
  };

  const handleActivateProfile = async (profileId) => {
    try {
      await activateMealPrepProfile(profileId);
      // Refresh profiles to show updated active status
      await fetchProfiles();
    } catch (err) {
      console.error('Error activating profile:', err);
      alert('Failed to activate profile');
    }
  };

  const handleTakeSurvey = () => {
    navigate('/meal-prep-survey');
  };

  const handleViewProfile = (profileId) => {
    // Navigate to AI assistant page with profile ID
    navigate(`/meal-prep/ai-assistant/${profileId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading meal prep profiles...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchProfiles}
            className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // No profiles - show survey prompt
  if (profiles.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-16">
          <div className="mb-8">
            <ChefHat className="w-24 h-24 text-emerald-600 dark:text-emerald-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to Create Your Meal Prep Profile?
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
              Take our comprehensive survey to create a personalized meal preparation profile.
              We'll help you build the perfect meal plan based on your goals, preferences, and lifestyle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-gray-200 dark:border-slate-600">
              <Target className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Personalized Goals</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Set your fitness goals and we'll tailor your meal plan accordingly
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-gray-200 dark:border-slate-600">
              <Clock className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Time-Saving Plans</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Get meal prep strategies that fit your schedule and cooking time
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow border border-gray-200 dark:border-slate-600">
              <DollarSign className="w-8 h-8 text-emerald-600 dark:text-emerald-400 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Budget-Friendly</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Optimize your grocery spending with smart ingredient choices
              </p>
            </div>
          </div>

          <button
            onClick={handleTakeSurvey}
            className="px-8 py-4 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg text-lg font-semibold hover:bg-emerald-700 dark:hover:bg-emerald-600 shadow-lg transform hover:scale-105 transition-all duration-200"
          >
            <Plus className="w-5 h-5 inline mr-2" />
            Take the Survey
          </button>
        </div>
      </div>
    );
  }

  // Has profiles - show them
  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Meal Prep Profiles</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2">
            Manage your meal preparation profiles and access AI-powered meal planning
          </p>
        </div>
        <button
          onClick={handleTakeSurvey}
          className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Profile
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className={`bg-white dark:bg-slate-800 rounded-lg shadow border p-6 ${
              profile.is_active
                ? 'border-emerald-300 dark:border-emerald-600 ring-2 ring-emerald-100 dark:ring-emerald-900'
                : 'border-gray-200 dark:border-slate-600'
            }`}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                  {profile.profile_name}
                </h3>
                {profile.is_active && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200">
                    <Star className="w-3 h-3 mr-1" />
                    Active
                  </span>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleViewProfile(profile.id)}
                  className="p-1 text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                  title="View with AI Assistant"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteProfile(profile.id)}
                  className="p-1 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  title="Delete Profile"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {profile.goal && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Target className="w-4 h-4 mr-2" />
                  Goal: {profile.goal}
                </div>
              )}
              {profile.meals_per_day && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <Clock className="w-4 h-4 mr-2" />
                  {profile.meals_per_day} meals/day
                </div>
              )}
              {profile.weekly_budget && (
                <div className="flex items-center text-sm text-gray-600 dark:text-gray-300">
                  <DollarSign className="w-4 h-4 mr-2" />
                  ${profile.weekly_budget}/week
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              {!profile.is_active && (
                <button
                  onClick={() => handleActivateProfile(profile.id)}
                  className="flex-1 px-3 py-2 bg-emerald-600 dark:bg-emerald-700 text-white text-sm rounded hover:bg-emerald-700 dark:hover:bg-emerald-600"
                >
                  Set Active
                </button>
              )}
              <button
                onClick={() => handleViewProfile(profile.id)}
                className="flex-1 px-3 py-2 bg-blue-600 dark:bg-blue-700 text-white text-sm rounded hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                AI Assistant
              </button>
            </div>

            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
              Created: {new Date(profile.created_at).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-2">
          🚀 AI-Powered Meal Planning
        </h3>
        <p className="text-blue-800 dark:text-blue-300">
          Click "AI Assistant" on any profile to get personalized meal recommendations,
          recipe suggestions, and shopping lists tailored to your preferences.
        </p>
      </div>
    </div>
  );
};

export default MealPrepProfiles;