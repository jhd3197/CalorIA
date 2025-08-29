import React, { useState, useEffect } from 'react';
import { ChefHat, Clock, Users, Star, Heart, Search, Filter, Plus, BookOpen } from 'lucide-react';
import apiUtils from '../utils/api';

const Recipes = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch recipes from API
  const fetchRecipes = async (category = null, search = null) => {
    try {
      setLoading(true);
      setError(null);

      let url = '/recipes?';
      if (category && category !== 'All') {
        url += `category=${encodeURIComponent(category)}&`;
      }
      if (search) {
        url += `search=${encodeURIComponent(search)}&`;
      }

      const response = await apiUtils.apiRequest(url.slice(0, -1)); // Remove trailing &
      setRecipes(response.recipes || []);
    } catch (err) {
      console.error('Error fetching recipes:', err);
      setError('Failed to load recipes. Please try again.');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch recipe categories
  const fetchCategories = async () => {
    try {
      const response = await apiUtils.apiRequest('/recipes/categories');
      setCategories(['All', ...response.categories]);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Keep default categories if API fails
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCategories();
    fetchRecipes();
  }, []);

  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    fetchRecipes(category, searchTerm);
  };

  // Handle search
  const handleSearch = (search) => {
    setSearchTerm(search);
    fetchRecipes(selectedCategory, search);
  };

  // Recipes are already filtered by API, so we just use them as-is
  const filteredRecipes = recipes;

  // For now, we'll consider all recipes as "favorites" until we implement favoriting
  const favoriteRecipes = recipes.slice(0, 3);

  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const toggleFavorite = (recipeId) => {
    // This would normally update the recipe in state/database
    console.log('Toggle favorite for recipe:', recipeId);
  };

  return (
    <>
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
              <ChefHat className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Recipes</p>
              <p className="font-semibold">{recipes.length} recipes</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
              <Heart className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Favorites</p>
              <p className="font-semibold">{favoriteRecipes.length} saved</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Prep Time</p>
              <p className="font-semibold">{recipes.length > 0 ? Math.round(recipes.reduce((acc, r) => acc + r.prep_time_minutes + (r.cook_time_minutes || 0), 0) / recipes.length) : 0} min</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
              <BookOpen className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Categories</p>
              <p className="font-semibold">{categories.length - 1} types</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search recipes, ingredients, or tags..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <select
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <button className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center">
              <Plus className="w-4 h-4 mr-1" />
              Add Recipe
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recipe Grid */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="heading text-lg font-semibold">
                {selectedCategory === 'All' ? 'All Recipes' : `${selectedCategory} Recipes`}
                <span className="text-gray-500 font-normal ml-2">({filteredRecipes.length})</span>
              </h2>
              <div className="flex items-center space-x-2">
                <button className="px-3 py-1 text-sm bg-emerald-50 text-emerald-600 rounded-lg">Grid</button>
                <button className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-lg">List</button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-gray-500">Loading recipes...</div>
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-red-500">{error}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredRecipes.map((recipe) => (
                  <div key={recipe.id} className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                    <div className="relative">
                      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                        <ChefHat className="w-12 h-12 text-gray-400" />
                      </div>
                      <button
                        onClick={() => toggleFavorite(recipe.id)}
                        className="absolute top-2 right-2 p-2 rounded-full bg-white text-gray-400 hover:scale-110 transition-transform"
                      >
                        <Heart className="w-4 h-4" />
                      </button>
                      <span className={`absolute top-2 left-2 px-2 py-1 text-xs rounded-full ${getDifficultyColor(recipe.difficulty)}`}>
                        {recipe.difficulty}
                      </span>
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold mb-2">{recipe.name}</h3>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                        <div className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          <span>{recipe.prep_time_minutes + (recipe.cook_time_minutes || 0)} min</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="w-4 h-4 mr-1" />
                          <span>{recipe.servings} servings</span>
                        </div>
                        <div className="flex items-center">
                          <Star className="w-4 h-4 mr-1 text-yellow-500" />
                          <span>4.5</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold text-emerald-600">{Math.round(recipe.calories_per_serving || 0)} kcal/serving</span>
                        <button className="px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100">
                          View Recipe
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-3">
                        {recipe.tags.slice(0, 2).map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            {tag}
                          </span>
                        ))}
                        {recipe.tags.length > 2 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                            +{recipe.tags.length - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Favorite Recipes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading text-lg font-semibold">Favorite Recipes</h2>
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div className="space-y-3">
              {favoriteRecipes.slice(0, 3).map((recipe) => (
                <div key={recipe.id} className="flex items-center p-2 bg-red-50 rounded-lg">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                    <ChefHat className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{recipe.name}</p>
                    <div className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>{recipe.prep_time_minutes + (recipe.cook_time_minutes || 0)} min</span>
                      <span className="mx-2">•</span>
                      <span>{Math.round(recipe.calories_per_serving || 0)} kcal/serving</span>
                    </div>
                  </div>
                </div>
              ))}
              {favoriteRecipes.length > 3 && (
                <button className="w-full text-sm text-red-600 hover:text-red-700 font-medium">
                  View All Favorites →
                </button>
              )}
            </div>
          </div>

          {/* Quick Categories */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="heading text-lg font-semibold mb-4">Recipe Categories</h2>
            <div className="space-y-2">
              {categories.slice(1).map((category) => {
                const categoryCount = recipes.filter(r => r.category === category).length;
                return (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCategory === category
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{category}</span>
                      <span className="text-sm text-gray-500">{categoryCount}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="heading text-lg font-semibold mb-4">Recipe Stats</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Most Popular</span>
                <span className="text-sm font-medium">Mediterranean Bowl</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Quickest Recipe</span>
                <span className="text-sm font-medium">Green Smoothie (8 min)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Lowest Calorie</span>
                <span className="text-sm font-medium">Green Smoothie (240 kcal)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Highest Rated</span>
                <span className="text-sm font-medium">Grilled Salmon (4.9★)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Recipes;