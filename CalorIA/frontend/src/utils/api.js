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
const apiRequest = async (endpoint, options = {}) => {
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
        window.location.href = '/login';
        throw new Error('Authentication failed. Please login again.');
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

export const fetchMeals = async (userId, date = null) => {
  if (!userId) {
    // Try to get user ID from stored user data
    const userData = getUserData();
    userId = userData?.user_id || userData?.id;
  }
  
  if (!userId) {
    throw new Error('User ID is required to fetch meals');
  }
  
  const dateParam = date ? `?date=${date}` : '';
  return await apiRequest(`/user/${userId}/meals${dateParam}`, {
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
  login,
  getCurrentUser,
  checkAuthHealth,
  fetchUserProfile,
  fetchMeals,
  isAuthenticated,
};

export default apiUtils;