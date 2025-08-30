const API_BASE_URL = 'http://localhost:4032/api';

// Token management functions
export const getAuthToken = () => {
  return localStorage.getItem('authToken');
};

export const setAuthToken = (token) => {
  localStorage.setItem('authToken', token);
};

export const removeAuthToken = () => {
  localStorage.removeItem('authToken');
};

// User data management functions
export const getUserData = () => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
};

export const setUserData = (userData) => {
  localStorage.setItem('user', JSON.stringify(userData));
};

export const removeUserData = () => {
  localStorage.removeItem('user');
};

// Clear all authentication data
export const clearAuthData = () => {
  removeAuthToken();
  removeUserData();
};

// Fetch wrapper with automatic Bearer token inclusion
export const apiRequest = async (endpoint, options = {}) => {
  const token = getAuthToken();
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  // Add Authorization header if token exists
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    const data = await response.json();

    if (!response.ok) {
      // Handle token expiration or invalid token
      if (response.status === 401 || response.status === 403) {
        clearAuthData();
        // Don't use window.location.href as it conflicts with React Router
        // Let the calling component handle the redirect
        throw new Error('AUTHENTICATION_FAILED');
      }
      throw new Error(data.error || data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API request error:', error);
    throw error;
  }
};

// Authentication API functions
export const login = async (email, password) => {
  const response = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  // Store token and user data
  if (response.token) {
    setAuthToken(response.token);
  }
  if (response.user) {
    setUserData(response.user);
  }

  return response;
};

export const getCurrentUser = async () => {
  const response = await apiRequest('/auth/me', {
    method: 'GET',
  });
  
  // Update stored user data
  if (response.user) {
    setUserData(response.user);
  }
  
  return response;
};

export const checkAuthHealth = async () => {
  try {
    const response = await apiRequest('/auth/health', {
      method: 'GET',
    });
    return response;
  } catch (error) {
    // If health check fails, clear auth data
    clearAuthData();
    throw error;
  }
};

// Logout function
export const logout = async () => {
  try {
    // Try to call logout endpoint if available
    await apiRequest('/auth/logout', {
      method: 'POST',
    });
  } catch (error) {
    // Even if API call fails, still clear local data
    console.error('Logout API call failed, but clearing local data anyway:', error);
  } finally {
    // Always clear authentication data
    clearAuthData();
  }
};

// Recipe API functions
export const fetchRecipeById = async (recipeId) => {
  return await apiRequest(`/recipes/${recipeId}`);
};

// Favorites API functions
export const getUserFavorites = async (userId) => {
  return await apiRequest(`/user/${userId}/favorites`);
};

export const addToFavorites = async (userId, recipeId) => {
  return await apiRequest(`/user/${userId}/favorites/${recipeId}`, {
    method: 'POST'
  });
};

export const removeFromFavorites = async (userId, recipeId) => {
  return await apiRequest(`/user/${userId}/favorites/${recipeId}`, {
    method: 'DELETE'
  });
};

export const checkFavoriteStatus = async (userId, recipeId) => {
  return await apiRequest(`/user/${userId}/favorites/${recipeId}`);
};

// Ingredients API functions
export const getIngredients = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/ingredients?${queryString}` : '/ingredients';
  return await apiRequest(url);
};

export const getIngredientById = async (ingredientId) => {
  return await apiRequest(`/ingredients/${ingredientId}`);
};

// Recipe Categories API functions
export const getRecipeCategories = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/recipe-categories?${queryString}` : '/recipe-categories';
  return await apiRequest(url);
};

export const createRecipeCategory = async (categoryData) => {
  return await apiRequest('/recipe-categories', {
    method: 'POST',
    body: JSON.stringify(categoryData),
  });
};

export const updateRecipeCategory = async (categoryId, categoryData) => {
  return await apiRequest(`/recipe-categories/${categoryId}`, {
    method: 'PUT',
    body: JSON.stringify(categoryData),
  });
};

export const deleteRecipeCategory = async (categoryId) => {
  return await apiRequest(`/recipe-categories/${categoryId}`, {
    method: 'DELETE',
  });
};

// Recipe Tags API functions
export const getRecipeTags = async (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/recipe-tags?${queryString}` : '/recipe-tags';
  return await apiRequest(url);
};

export const createRecipeTag = async (tagData) => {
  return await apiRequest('/recipe-tags', {
    method: 'POST',
    body: JSON.stringify(tagData),
  });
};

export const updateRecipeTag = async (tagId, tagData) => {
  return await apiRequest(`/recipe-tags/${tagId}`, {
    method: 'PUT',
    body: JSON.stringify(tagData),
  });
};

export const deleteRecipeTag = async (tagId) => {
  return await apiRequest(`/recipe-tags/${tagId}`, {
    method: 'DELETE',
  });
};

// Weight API functions
export const getWeightHistory = async (userId = null, params = {}) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required to fetch weight history');
  }

  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/weight/${userId}?${queryString}` : `/weight/${userId}`;

  return await apiRequest(url);
};

export const addWeightEntry = async (weightData) => {
  return await apiRequest('/weight', {
    method: 'POST',
    body: JSON.stringify(weightData),
  });
};

export const updateWeightEntry = async (entryId, weightData) => {
  return await apiRequest(`/weight/${entryId}`, {
    method: 'PUT',
    body: JSON.stringify(weightData),
  });
};

export const deleteWeightEntry = async (entryId) => {
  return await apiRequest(`/weight/${entryId}`, {
    method: 'DELETE',
  });
};

// Trends API functions
export const getWeightTrends = async (userId = null, params = {}) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required to fetch weight trends');
  }

  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/trends/weight/${userId}?${queryString}` : `/trends/weight/${userId}`;

  return await apiRequest(url);
};

export const getCalorieTrends = async (userId = null, params = {}) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required to fetch calorie trends');
  }

  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/trends/calories/${userId}?${queryString}` : `/trends/calories/${userId}`;

  return await apiRequest(url);
};

export const getCombinedTrends = async (userId = null, params = {}) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required to fetch combined trends');
  }

  const queryString = new URLSearchParams(params).toString();
  const url = queryString ? `/trends/combined/${userId}?${queryString}` : `/trends/combined/${userId}`;

  return await apiRequest(url);
};

// Other API functions (can be extended)
export const fetchUserProfile = async (userId) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required to fetch user profile');
  }

  return await apiRequest(`/user/${userId}`, {
    method: 'GET',
  });
};

export const updateUserProfile = async (userId, updateData) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required to update user profile');
  }

  const response = await apiRequest(`/user/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(updateData),
  });

  // Update stored user data if the update was successful
  if (response.user) {
    setUserData(response.user);
  }

  return response;
};

export const fetchDashboardData = async (userId = null, dateStr = null) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }
  
  if (!userId) {
    throw new Error('User ID is required to fetch dashboard data');
  }
  
  const dateParam = dateStr ? `?date=${dateStr}` : '';
  return await apiRequest(`/dashboard/${userId}${dateParam}`, {
    method: 'GET',
  });
};

// Meal Prep API functions
export const createMealPrepProfile = async (profileData) => {
  return await apiRequest('/meal-prep-profiles', {
    method: 'POST',
    body: JSON.stringify(profileData),
  });
};

export const getUserMealPrepProfiles = async (userId = null, includeInactive = false) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required to fetch meal prep profiles');
  }

  const params = new URLSearchParams({ user_id: userId });
  if (includeInactive) {
    params.append('include_inactive', 'true');
  }

  return await apiRequest(`/meal-prep-profiles?${params.toString()}`);
};

export const getMealPrepProfileById = async (profileId) => {
  return await apiRequest(`/meal-prep-profiles/${profileId}`);
};

export const updateMealPrepProfile = async (profileId, profileData) => {
  return await apiRequest(`/meal-prep-profiles/${profileId}`, {
    method: 'PUT',
    body: JSON.stringify(profileData),
  });
};

export const deleteMealPrepProfile = async (profileId) => {
  return await apiRequest(`/meal-prep-profiles/${profileId}`, {
    method: 'DELETE',
  });
};

export const activateMealPrepProfile = async (profileId) => {
  return await apiRequest(`/meal-prep-profiles/${profileId}/activate`, {
    method: 'POST',
  });
};

export const getActiveMealPrepProfile = async (userId = null) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required to fetch active meal prep profile');
  }

  const params = new URLSearchParams({ user_id: userId });
  return await apiRequest(`/meal-prep-profiles/active?${params.toString()}`);
};

export const getMealPrepProfileCount = async (userId = null) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required to get meal prep profile count');
  }

  const params = new URLSearchParams({ user_id: userId });
  return await apiRequest(`/meal-prep-profiles/count?${params.toString()}`);
};

// AI Assistant API functions
export const getAIMealRecommendations = async (profileId, userId = null, numMeals = 3) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required for AI meal recommendations');
  }

  const params = new URLSearchParams({
    user_id: userId,
    num_meals: numMeals
  });

  return await apiRequest(`/ai-assistant/meal-recommendations/${profileId}?${params.toString()}`);
};

export const getAIShoppingList = async (profileId, userId = null, mealsData = null) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required for AI shopping list');
  }

  const params = new URLSearchParams({ user_id: userId });

  const requestBody = mealsData ? { meals: mealsData } : {};

  return await apiRequest(`/ai-assistant/shopping-list/${profileId}?${params.toString()}`, {
    method: 'POST',
    body: Object.keys(requestBody).length > 0 ? JSON.stringify(requestBody) : undefined
  });
};

export const getAIMealPlanOverview = async (profileId, userId = null) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required for AI meal plan overview');
  }

  const params = new URLSearchParams({ user_id: userId });
  return await apiRequest(`/ai-assistant/meal-plan/${profileId}?${params.toString()}`);
};

export const getAIInsights = async (profileId, userId = null) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required for AI insights');
  }

  const params = new URLSearchParams({ user_id: userId });
  return await apiRequest(`/ai-assistant/insights/${profileId}?${params.toString()}`);
};

export const regenerateAIMealRecommendations = async (profileId, previousRecommendations, feedback = null, userId = null) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required for regenerating AI recommendations');
  }

  const params = new URLSearchParams({ user_id: userId });

  const requestBody = {
    previous_recommendations: previousRecommendations
  };

  if (feedback) {
    requestBody.feedback = feedback;
  }

  return await apiRequest(`/ai-assistant/regenerate/${profileId}?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify(requestBody)
  });
};

export const getAIResponseHistory = async (profileId, userId = null, limit = 10) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required for AI response history');
  }

  const params = new URLSearchParams({
    user_id: userId,
    limit: limit
  });

  return await apiRequest(`/ai-assistant/history/${profileId}?${params.toString()}`);
};

export const checkAIAssistantHealth = async () => {
  return await apiRequest('/ai-assistant/health');
};

export const getLatestAIResponses = async (profileId, userId = null) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required for getting latest AI responses');
  }

  const params = new URLSearchParams({ user_id: userId });
  return await apiRequest(`/ai-assistant/latest/${profileId}?${params.toString()}`);
};

// Separate step API functions for modular meal generation
export const generateBasicMeals = async (profileId, userId = null) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required for generating basic meals');
  }

  const params = new URLSearchParams({ user_id: userId });
  return await apiRequest(`/ai-assistant/generate-meals/${profileId}?${params.toString()}`, {
    method: 'POST'
  });
};

export const generateMealRecipes = async (profileId, mealsData, userId = null) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required for generating meal recipes');
  }

  const params = new URLSearchParams({ user_id: userId });
  return await apiRequest(`/ai-assistant/generate-recipes/${profileId}?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify({ meals: mealsData })
  });
};

export const generateMealShoppingList = async (profileId, mealsData, userId = null) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }

  if (!userId) {
    throw new Error('User ID is required for generating shopping list');
  }

  const params = new URLSearchParams({ user_id: userId });
  return await apiRequest(`/ai-assistant/generate-shopping-list/${profileId}?${params.toString()}`, {
    method: 'POST',
    body: JSON.stringify({ meals: mealsData })
  });
};

// Utility function to check if user is authenticated
export const isAuthenticated = () => {
  const token = getAuthToken();
  const userData = getUserData();
  return !!(token && userData);
};

const apiUtils = {
  getAuthToken,
  setAuthToken,
  removeAuthToken,
  getUserData,
  setUserData,
  removeUserData,
  clearAuthData,
  apiRequest,
  login,
  getCurrentUser,
  checkAuthHealth,
  fetchUserProfile,
  fetchDashboardData,
  fetchRecipeById,
  getUserFavorites,
  addToFavorites,
  removeFromFavorites,
  checkFavoriteStatus,
  getIngredients,
  getIngredientById,
  getRecipeCategories,
  createRecipeCategory,
  updateRecipeCategory,
  deleteRecipeCategory,
  getRecipeTags,
  createRecipeTag,
  updateRecipeTag,
  deleteRecipeTag,
  getWeightHistory,
  addWeightEntry,
  updateWeightEntry,
  deleteWeightEntry,
  getWeightTrends,
  getCalorieTrends,
  getCombinedTrends,
  createMealPrepProfile,
  getUserMealPrepProfiles,
  getMealPrepProfileById,
  updateMealPrepProfile,
  deleteMealPrepProfile,
  activateMealPrepProfile,
  getActiveMealPrepProfile,
  getMealPrepProfileCount,
  isAuthenticated,
  logout,
};

export default apiUtils;