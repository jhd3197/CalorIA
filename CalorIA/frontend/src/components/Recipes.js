import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChefHat, Clock, Users, Star, Heart, Search, Filter, Plus, BookOpen, Grid, List } from 'lucide-react';
import apiUtils, { getUserFavorites, addToFavorites, removeFromFavorites } from '../utils/api';
import AddRecipeModal from './AddRecipeModal';

const Recipes = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize state from URL parameters
  const getInitialCategory = () => {
    const params = new URLSearchParams(location.search);
    return params.get('category') || 'All';
  };

  const getInitialSearch = () => {
    const params = new URLSearchParams(location.search);
    return params.get('search') || '';
  };

  const [selectedCategory, setSelectedCategory] = useState(getInitialCategory());
  const [searchTerm, setSearchTerm] = useState(getInitialSearch());
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [favorites, setFavorites] = useState(new Set()); // Track favorite recipe IDs
  const [showAddModal, setShowAddModal] = useState(false);

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
      const recipesData = response.recipes || [];

      // Populate category objects for recipes
      const populatedRecipes = recipesData.map(recipe => {
        let populatedRecipe = { ...recipe };

        // Try to populate category object if category_id exists
        if (recipe.category_id && categoryObjects.length > 0) {
          const categoryObj = categoryObjects.find(cat =>
            cat.id === recipe.category_id || cat.id === recipe.category_id.toString()
          );
          if (categoryObj) {
            populatedRecipe.category = categoryObj;
          }
        }
        // If category is a string, try to find matching category object
        else if (typeof recipe.category === 'string' && categoryObjects.length > 0) {
          const categoryObj = categoryObjects.find(cat => cat.name === recipe.category);
          if (categoryObj) {
            populatedRecipe.category = categoryObj;
          }
        }

        return populatedRecipe;
      });

      console.log('Fetched recipes:', populatedRecipes.length);
      console.log('Categories available:', categoryObjects.length);
      setRecipes(populatedRecipes);
    } catch (err) {
      console.error('Error fetching recipes:', err);
      setError('Failed to load recipes. Please try again.');
      setRecipes([]);
    } finally {
      setLoading(false);
    }
  };

  // Store full category objects for reference
  const [categoryObjects, setCategoryObjects] = useState([]);

  // Update URL with current filter parameters
  const updateURL = (category, search) => {
    const params = new URLSearchParams();

    if (category && category !== 'All') {
      params.set('category', category);
    }

    if (search && search.trim()) {
      params.set('search', search.trim());
    }

    const newSearch = params.toString();
    const newURL = newSearch ? `${location.pathname}?${newSearch}` : location.pathname;

    // Use replace to avoid adding to history stack for filter changes
    navigate(newURL, { replace: true });
  };

  // Fetch recipe categories
  const fetchCategories = async () => {
    try {
      const response = await apiUtils.apiRequest('/recipes/categories');
      // Store full category objects for reference
      setCategoryObjects(response.categories || []);
      // Extract category names for the dropdown
      const categoryNames = response.categories.map(cat => typeof cat === 'string' ? cat : cat.name);
      setCategories(['All', ...categoryNames]);

      // Recipes will be fetched by the useEffect hook
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Keep default categories if API fails
    }
  };

  // Load favorites from backend
  const loadFavorites = async () => {
    try {
      const userData = apiUtils.getUserData();
      if (userData?.user_id) {
        const response = await getUserFavorites(userData.user_id);
        setFavorites(new Set(response.favorite_recipe_ids || []));
      }
    } catch (err) {
      console.error('Error loading favorites:', err);
      // Keep empty favorites set if API fails
      setFavorites(new Set());
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchCategories();
    loadFavorites();
    // Fetch recipes with initial URL parameters
    fetchRecipes(selectedCategory, searchTerm);
  }, []); // Empty dependency array since we only want this on mount

  // Handle category change with toggle functionality
  const handleCategoryChange = (category) => {
    // If clicking the same category that's already selected, toggle back to "All"
    const newCategory = (selectedCategory === category) ? 'All' : category;
    setSelectedCategory(newCategory);
    updateURL(newCategory, searchTerm);
    fetchRecipes(newCategory, searchTerm);
  };

  // Handle search
  const handleSearch = (search) => {
    setSearchTerm(search);
    updateURL(selectedCategory, search);
    fetchRecipes(selectedCategory, search);
  };

  // Recipes are already filtered by API, so we just use them as-is
  const filteredRecipes = recipes;

  // Get actual favorite recipes
  const favoriteRecipes = recipes.filter(recipe => favorites.has(recipe.id));

  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const toggleFavorite = async (recipeId, event) => {
    // Prevent event bubbling to avoid triggering card click
    event.stopPropagation();

    try {
      const userData = apiUtils.getUserData();
      if (!userData?.user_id) {
        console.error('No user ID found');
        return;
      }

      const isCurrentlyFavorited = favorites.has(recipeId);

      if (isCurrentlyFavorited) {
        // Remove from favorites
        await removeFromFavorites(userData.user_id, recipeId);
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(recipeId);
          return newFavorites;
        });
      } else {
        // Add to favorites
        await addToFavorites(userData.user_id, recipeId);
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.add(recipeId);
          return newFavorites;
        });
      }
    } catch (err) {
      console.error('Error toggling favorite:', err);
      // Optionally show user feedback here
    }
  };

  const handleViewRecipe = (recipeId) => {
    navigate(`/recipes/${recipeId}`);
  };

  const toggleViewMode = (mode) => {
    setViewMode(mode);
  };

  const handleAddRecipe = () => {
    setShowAddModal(true);
  };

  const handleRecipeCreated = (newRecipe) => {
    // Add the new recipe to the current list
    setRecipes(prev => [newRecipe, ...prev]);
    // Navigate to the new recipe's edit page
    navigate(`/recipes/${newRecipe.id}/edit`);
  };

  // Skeleton loading component for grid view
  const RecipeGridSkeleton = () => (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
        <div className="w-12 h-12 bg-gray-300 rounded animate-pulse"></div>
      </div>
      <div className="p-4">
        <div className="h-6 bg-gray-300 rounded mb-2 animate-pulse"></div>
        <div className="flex items-center justify-between text-sm mb-3">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-300 rounded mr-1 animate-pulse"></div>
            <div className="w-12 h-4 bg-gray-300 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-300 rounded mr-1 animate-pulse"></div>
            <div className="w-16 h-4 bg-gray-300 rounded animate-pulse"></div>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-gray-300 rounded mr-1 animate-pulse"></div>
            <div className="w-8 h-4 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="w-24 h-6 bg-gray-300 rounded animate-pulse"></div>
        </div>
        <div className="flex gap-1 mt-3">
          <div className="w-12 h-5 bg-gray-300 rounded animate-pulse"></div>
          <div className="w-16 h-5 bg-gray-300 rounded animate-pulse"></div>
        </div>
      </div>
    </div>
  );

  // Skeleton loading component for list view
  const RecipeListSkeleton = () => (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center flex-1">
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
            <div className="w-8 h-8 bg-gray-300 rounded animate-pulse"></div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-48 h-6 bg-gray-300 rounded animate-pulse"></div>
              <div className="w-16 h-5 bg-gray-300 rounded-full animate-pulse"></div>
            </div>
            <div className="flex items-center gap-6 text-sm mb-2">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-300 rounded mr-1 animate-pulse"></div>
                <div className="w-12 h-4 bg-gray-300 rounded animate-pulse"></div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-300 rounded mr-1 animate-pulse"></div>
                <div className="w-16 h-4 bg-gray-300 rounded animate-pulse"></div>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-gray-300 rounded mr-1 animate-pulse"></div>
                <div className="w-8 h-4 bg-gray-300 rounded animate-pulse"></div>
              </div>
              <div className="w-24 h-5 bg-gray-300 rounded animate-pulse"></div>
            </div>
            <div className="flex gap-1">
              <div className="w-12 h-5 bg-gray-300 rounded animate-pulse"></div>
              <div className="w-16 h-5 bg-gray-300 rounded animate-pulse"></div>
              <div className="w-14 h-5 bg-gray-300 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-300 rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );

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
              <p className="font-semibold">{favorites.size} saved</p>
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
            <button
              onClick={handleAddRecipe}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center"
            >
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
                <button
                  onClick={() => toggleViewMode('grid')}
                  className={`px-3 py-1 text-sm rounded-lg flex items-center ${
                    viewMode === 'grid'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <Grid className="w-4 h-4 mr-1" />
                  Grid
                </button>
                <button
                  onClick={() => toggleViewMode('list')}
                  className={`px-3 py-1 text-sm rounded-lg flex items-center ${
                    viewMode === 'list'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <List className="w-4 h-4 mr-1" />
                  List
                </button>
              </div>
            </div>

            {loading ? (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                {[...Array(6)].map((_, index) => (
                  viewMode === 'grid' ? (
                    <RecipeGridSkeleton key={index} />
                  ) : (
                    <RecipeListSkeleton key={index} />
                  )
                ))}
              </div>
            ) : error ? (
              <div className="flex justify-center items-center py-12">
                <div className="text-red-500">{error}</div>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 gap-4" : "space-y-4"}>
                {filteredRecipes.map((recipe) => (
                  viewMode === 'grid' ? (
                    // Grid View
                    <div
                      key={recipe.id}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewRecipe(recipe.id)}
                    >
                      <div className="relative">
                        <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                          <ChefHat className="w-12 h-12 text-gray-400" />
                        </div>
                        <button
                          onClick={(e) => toggleFavorite(recipe.id, e)}
                          className={`absolute top-2 right-2 p-2 rounded-full bg-white hover:scale-110 transition-transform ${
                            favorites.has(recipe.id) ? 'text-red-500' : 'text-gray-400'
                          }`}
                        >
                          <Heart className={`w-4 h-4 ${favorites.has(recipe.id) ? 'fill-current' : ''}`} />
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
                          <span className="text-lg font-bold text-emerald-600">
                            {recipe.calories_per_serving_stored && recipe.calories_per_serving_stored > 0
                              ? `${Math.round(recipe.calories_per_serving_stored || 0)} kcal/serving`
                              : 'Nutrition pending'
                            }
                          </span>
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
                  ) : (
                    // List View
                    <div
                      key={recipe.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleViewRecipe(recipe.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center flex-1">
                          <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                            <ChefHat className="w-8 h-8 text-gray-400" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold text-lg">{recipe.name}</h3>
                              <span className={`px-2 py-1 text-xs rounded-full ${getDifficultyColor(recipe.difficulty)}`}>
                                {recipe.difficulty}
                              </span>
                            </div>
                            <div className="flex items-center gap-6 text-sm text-gray-600 mb-2">
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
                              <span className="text-emerald-600 font-medium">
                                {recipe.calories_per_serving_stored && recipe.calories_per_serving_stored > 0
                                  ? `${Math.round(recipe.calories_per_serving_stored || 0)} kcal/serving`
                                  : 'Nutrition pending'
                                }
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {recipe.tags.slice(0, 3).map((tag, index) => (
                                <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                  {tag}
                                </span>
                              ))}
                              {recipe.tags.length > 3 && (
                                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                  +{recipe.tags.length - 3}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={(e) => toggleFavorite(recipe.id, e)}
                            className={`p-2 rounded-full bg-gray-100 hover:scale-110 transition-transform ${
                              favorites.has(recipe.id) ? 'text-red-500' : 'text-gray-400'
                            }`}
                          >
                            <Heart className={`w-5 h-5 ${favorites.has(recipe.id) ? 'fill-current' : ''}`} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          
          {/* Quick Categories */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading text-lg font-semibold">Recipe Categories</h2>
              {selectedCategory !== 'All' && (
                <button
                  onClick={() => handleCategoryChange('All')}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-medium underline"
                >
                  Clear Filter
                </button>
              )}
            </div>
            <div className="space-y-2">
              {categories.slice(1).length === 0 ? (
                <div className="text-center py-4 text-gray-500">
                  <p className="text-sm">No categories loaded</p>
                  <p className="text-xs">Categories will appear here once recipes are available</p>
                </div>
              ) : (
                categories.slice(1)
                  .map((categoryName) => {
                    // Find the category object to get the stored usage count
                    const categoryObj = categoryObjects.find(cat => cat.name === categoryName);
                    const count = categoryObj ? categoryObj.usage_count || 0 : 0;

                    return {
                      name: categoryName,
                      count: count
                    };
                  })
                  .filter(category => category.count > 0) // Hide categories with 0 count
                  .sort((a, b) => b.count - a.count) // Sort by count (highest to lowest)
                  .map((category) => (
                    <button
                      key={category.name}
                      onClick={() => handleCategoryChange(category.name)}
                      className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                        selectedCategory === category.name
                          ? 'bg-emerald-100 text-emerald-700 border-2 border-emerald-300 shadow-sm'
                          : 'hover:bg-gray-50 border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{category.name}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${
                            selectedCategory === category.name ? 'text-emerald-600' : 'text-gray-500'
                          }`}>
                            {category.count}
                          </span>
                          {selectedCategory === category.name && (
                            <span className="text-xs text-emerald-600 font-medium">✓</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
          
          {/* Favorite Recipes */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading text-lg font-semibold">Favorite Recipes</h2>
              <Heart className="w-5 h-5 text-red-500" />
            </div>
            <div className="space-y-3">
              {favoriteRecipes.length > 0 ? (
                favoriteRecipes.slice(0, 3).map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center p-2 bg-red-50 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                    onClick={() => handleViewRecipe(recipe.id)}
                  >
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mr-3">
                      <ChefHat className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{recipe.name}</p>
                      <div className="flex items-center text-xs text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        <span>{recipe.prep_time_minutes + (recipe.cook_time_minutes || 0)} min</span>
                        <span className="mx-2">•</span>
                        <span>
                          {recipe.calories_per_serving_stored && recipe.calories_per_serving_stored > 0
                            ? `${Math.round(recipe.calories_per_serving_stored || 0)} kcal/serving`
                            : 'Nutrition pending'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Heart className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No favorite recipes yet</p>
                  <p className="text-xs">Click the heart icon on recipes to add them here</p>
                </div>
              )}
              {favoriteRecipes.length > 3 && (
                <button className="w-full text-sm text-red-600 hover:text-red-700 font-medium">
                  View All Favorites →
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Add Recipe Modal */}
      <AddRecipeModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onRecipeCreated={handleRecipeCreated}
      />
    </>
  );
};

export default Recipes;