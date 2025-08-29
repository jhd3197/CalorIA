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
  isAuthenticated,
  logout,
};

export default apiUtils;