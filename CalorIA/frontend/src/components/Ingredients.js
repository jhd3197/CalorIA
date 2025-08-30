import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, Edit3, Trash2, Save, X, AlertCircle, Lock, User, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const Ingredients = () => {
  const [ingredients, setIngredients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'system', 'user'
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    kcal_per_100g: '',
    protein_per_100g: '',
    fat_per_100g: '',
    carbs_per_100g: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [totalIngredients, setTotalIngredients] = useState(0);
  const itemsPerPage = 50;

  // Ref for search input focus preservation
  const searchInputRef = useRef(null);

  // Sample categories for the form
  const categories = [
    'Vegetables', 'Fruits', 'Grains', 'Proteins', 'Dairy', 
    'Nuts & Seeds', 'Oils & Fats', 'Beverages', 'Condiments', 'Other'
  ];

  // URL state management utilities
  const getUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      search: urlParams.get('search') || '',
      category: urlParams.get('category') || 'all',
      type: urlParams.get('type') || 'all',
      page: parseInt(urlParams.get('page') || '1', 10)
    };
  };

  const validateUrlParams = (params) => {
    // Validate page number - must be positive integer
    const validPage = Math.max(1, isNaN(params.page) ? 1 : params.page);
    
    // Validate filter type - must be one of the allowed values
    const validTypes = ['all', 'system', 'user'];
    const validType = validTypes.includes(params.type) ? params.type : 'all';
    
    // Category validation will be done dynamically once we have ingredients loaded
    // For now, keep the category as-is since we don't know available categories yet
    const validCategory = params.category || 'all';
    
    return {
      search: params.search || '',
      category: validCategory,
      type: validType,
      page: validPage
    };
  };

  const updateUrl = (newParams) => {
    const currentParams = getUrlParams();
    const updatedParams = { ...currentParams, ...newParams };
    
    // Build clean URL - only include non-default parameters
    const urlParams = new URLSearchParams();
    
    if (updatedParams.search && updatedParams.search.trim()) {
      urlParams.set('search', updatedParams.search);
    }
    
    if (updatedParams.category && updatedParams.category !== 'all') {
      urlParams.set('category', updatedParams.category);
    }
    
    if (updatedParams.type && updatedParams.type !== 'all') {
      urlParams.set('type', updatedParams.type);
    }
    
    if (updatedParams.page && updatedParams.page > 1) {
      urlParams.set('page', updatedParams.page.toString());
    }
    
    // Update URL without page reload
    const newUrl = urlParams.toString() ?
      `${window.location.pathname}?${urlParams.toString()}` :
      window.location.pathname;
    
    window.history.pushState(null, '', newUrl);
  };

  // Initialize state from URL on component mount
  useEffect(() => {
    const urlParams = validateUrlParams(getUrlParams());
    
    // Set initial state from URL parameters
    setSearchTerm(urlParams.search);
    setSelectedCategory(urlParams.category);
    setFilterType(urlParams.type);
    setCurrentPage(urlParams.page);
    
    // Fetch ingredients with URL parameters
    fetchIngredients(urlParams.page, true);
    
    // Mark initial load as complete after a short delay to allow state updates
    setTimeout(() => setIsInitialLoad(false), 100);
  }, []);

  const fetchIngredients = async (page = currentPage, resetPagination = false) => {
    try {
      // Use different loading states for initial load vs pagination
      if (resetPagination || page === 1) {
        setLoading(true);
      } else {
        setPaginationLoading(true);
      }
      
      const token = localStorage.getItem('token');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType === 'system') params.append('is_system', 'true');
      if (filterType === 'user') params.append('is_system', 'false');
      params.append('page', page.toString());
      params.append('limit', itemsPerPage.toString());
      const queryString = `?${params.toString()}`;
      
      const response = await fetch(`/api/ingredients${queryString}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch ingredients: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle new paginated response format
      if (data.ingredients && data.pagination) {
        // New paginated format
        setIngredients(data.ingredients);
        setHasMore(data.pagination.has_more);
        setCurrentPage(data.pagination.page);
        // Store the total count if available
        if (data.pagination.total !== undefined) {
          setTotalIngredients(data.pagination.total);
        }
      } else {
        // Fallback for old format (array response)
        const ingredientsList = Array.isArray(data) ? data : (data.ingredients || []);
        setIngredients(ingredientsList);
        // If we got less than the limit, there's no more data
        setHasMore(ingredientsList.length >= itemsPerPage);
      }
      
      setError(null);
    } catch (error) {
      console.error('Error fetching ingredients:', error);
      setError('Failed to load ingredients. Please try again.');
      // Use sample data if API fails
      setIngredients([
        {
          id: 1,
          name: 'Chicken Breast',
          category: 'Proteins',
          kcal_per_100g: 165,
          protein_per_100g: 31,
          fat_per_100g: 3.6,
          carbs_per_100g: 0,
          is_system: true
        },
        {
          id: 2,
          name: 'Brown Rice',
          category: 'Grains',
          kcal_per_100g: 111,
          protein_per_100g: 2.6,
          fat_per_100g: 0.9,
          carbs_per_100g: 23,
          is_system: true
        },
        {
          id: 3,
          name: 'Broccoli',
          category: 'Vegetables',
          kcal_per_100g: 34,
          protein_per_100g: 2.8,
          fat_per_100g: 0.4,
          carbs_per_100g: 7,
          is_system: false
        }
      ]);
      setHasMore(false);
    } finally {
      setLoading(false);
      setPaginationLoading(false);
    }
  };

  // Search ingredients when search term or filters change - reset to page 1
  useEffect(() => {
    // Skip this effect during initial load to preserve URL parameters
    if (isInitialLoad) {
      return;
    }
    
    const timeoutId = setTimeout(() => {
      const newPage = 1;
      setCurrentPage(newPage);
      updateUrl({
        search: searchTerm,
        category: selectedCategory,
        type: filterType,
        page: newPage
      });
      fetchIngredients(newPage, true);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterType, selectedCategory, isInitialLoad]);

  // Fetch ingredients when page changes (but not on initial load or filter changes)
  useEffect(() => {
    // Skip this effect during initial load
    if (isInitialLoad) {
      return;
    }
    
    if (currentPage > 1) {
      updateUrl({ page: currentPage });
      fetchIngredients(currentPage, false);
    } else if (currentPage === 1) {
      // Update URL when page is 1 (to remove page parameter if it was set)
      updateUrl({ page: currentPage });
    }
  }, [currentPage, isInitialLoad]);

  // Focus preservation effect - restore focus after state updates
  useEffect(() => {
    // Only restore focus if the search input was previously focused and we're not loading
    if (searchInputRef.current && !loading && document.activeElement !== searchInputRef.current) {
      // Check if the user was typing in the search field by seeing if searchTerm has content
      // and the input is not currently focused (indicating it lost focus due to re-render)
      if (searchTerm && searchInputRef.current !== document.activeElement) {
        // Small delay to ensure DOM is updated after state changes
        const focusTimeout = setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            // Preserve cursor position at end of text
            const length = searchInputRef.current.value.length;
            searchInputRef.current.setSelectionRange(length, length);
          }
        }, 0);
        
        return () => clearTimeout(focusTimeout);
      }
    }
  }, [loading, ingredients, searchTerm]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.category.trim()) {
      errors.category = 'Category is required';
    }

    if (!formData.kcal_per_100g || formData.kcal_per_100g < 0) {
      errors.kcal_per_100g = 'Valid calories per 100g is required';
    }

    if (!formData.protein_per_100g || formData.protein_per_100g < 0) {
      errors.protein_per_100g = 'Valid protein per 100g is required';
    }

    if (!formData.fat_per_100g || formData.fat_per_100g < 0) {
      errors.fat_per_100g = 'Valid fat per 100g is required';
    }

    if (!formData.carbs_per_100g || formData.carbs_per_100g < 0) {
      errors.carbs_per_100g = 'Valid carbs per 100g is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const isEdit = editingId !== null;
      const url = isEdit ? `/api/ingredients/${editingId}` : '/api/ingredients';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          ...formData,
          kcal_per_100g: parseFloat(formData.kcal_per_100g),
          protein_per_100g: parseFloat(formData.protein_per_100g),
          fat_per_100g: parseFloat(formData.fat_per_100g),
          carbs_per_100g: parseFloat(formData.carbs_per_100g)
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} ingredient: ${response.status}`);
      }

      const result = await response.json();

      resetForm();
      // Refresh the current page data
      await fetchIngredients(currentPage, false);
    } catch (error) {
      console.error('Error saving ingredient:', error);
      setError(`Failed to ${editingId ? 'update' : 'create'} ingredient. Please try again.`);
    }
  };

  const handleEdit = (ingredient) => {
    // Prevent editing system ingredients
    if (ingredient.is_system) {
      setError('System ingredients cannot be modified.');
      return;
    }
    
    setFormData({
      name: ingredient.name,
      category: ingredient.category,
      kcal_per_100g: ingredient.kcal_per_100g.toString(),
      protein_per_100g: ingredient.protein_per_100g.toString(),
      fat_per_100g: ingredient.fat_per_100g.toString(),
      carbs_per_100g: ingredient.carbs_per_100g.toString()
    });
    setEditingId(ingredient.id);
    setShowAddForm(true);
    setFormErrors({});
  };

  const handleDelete = async (id) => {
    // Check if it's a system ingredient
    const ingredient = ingredients.find(ing => ing.id === id);
    if (ingredient && ingredient.is_system) {
      setError('System ingredients cannot be deleted.');
      setDeleteConfirm(null);
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/ingredients/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete ingredient: ${response.status}`);
      }

      setDeleteConfirm(null);
      // Refresh the current page data
      await fetchIngredients(currentPage, false);
    } catch (error) {
      console.error('Error deleting ingredient:', error);
      setError('Failed to delete ingredient. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: '',
      kcal_per_100g: '',
      protein_per_100g: '',
      fat_per_100g: '',
      carbs_per_100g: ''
    });
    setFormErrors({});
    setShowAddForm(false);
    setEditingId(null);
  };

  // Helper function to clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setFilterType('all');
    setCurrentPage(1);
    // Clear URL parameters
    updateUrl({ search: '', category: 'all', type: 'all', page: 1 });
  };

  // Pagination navigation handlers
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      setCurrentPage(newPage);
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      const newPage = currentPage + 1;
      setCurrentPage(newPage);
    }
  };

  // Extract available categories from ingredients (for filter dropdown)
  const availableCategories = [...new Set(ingredients.map(ing => ing.category).filter(cat => cat))].sort();

  // Since we're using server-side pagination, we don't need client-side filtering
  // The ingredients array already contains the filtered and paginated results
  const filteredIngredients = ingredients;

  // Calculate statistics
  const systemIngredients = ingredients.filter(ing => ing.is_system === true);
  const userIngredients = ingredients.filter(ing => ing.is_system === false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading ingredients...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mr-3">
              <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Ingredients</p>
              <p className="font-semibold text-gray-900 dark:text-white">{totalIngredients > 0 ? totalIngredients : ingredients.length} items</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mr-3">
              <Lock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">System Ingredients</p>
              <p className="font-semibold text-gray-900 dark:text-white">{systemIngredients.length} items</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mr-3">
              <User className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">User Ingredients</p>
              <p className="font-semibold text-gray-900 dark:text-white">{userIngredients.length} items</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3">
              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Categories</p>
              <p className="font-semibold text-gray-900 dark:text-white">{new Set(ingredients.map(i => i.category)).size} types</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" />
            <span className="text-red-700 dark:text-red-300">{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search and Add Section */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search ingredients by name or category..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white min-w-[180px]"
              >
                <option value="all">All Categories</option>
                {availableCategories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white min-w-[180px]"
              >
                <option value="all">All Ingredients</option>
                <option value="system">System Only</option>
                <option value="user">User Only</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 flex items-center whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add New Ingredient
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Edit Ingredient' : 'Add New Ingredient'}
            </h2>
            <button
              onClick={resetForm}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                  formErrors.name ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="Enter ingredient name"
              />
              {formErrors.name && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                  formErrors.category ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                }`}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {formErrors.category && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Calories per 100g *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.kcal_per_100g}
                onChange={(e) => setFormData({...formData, kcal_per_100g: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                  formErrors.kcal_per_100g ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="0.0"
              />
              {formErrors.kcal_per_100g && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.kcal_per_100g}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Protein per 100g *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.protein_per_100g}
                onChange={(e) => setFormData({...formData, protein_per_100g: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                  formErrors.protein_per_100g ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="0.0"
              />
              {formErrors.protein_per_100g && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.protein_per_100g}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Fat per 100g *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.fat_per_100g}
                onChange={(e) => setFormData({...formData, fat_per_100g: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                  formErrors.fat_per_100g ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="0.0"
              />
              {formErrors.fat_per_100g && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.fat_per_100g}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Carbs per 100g *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.carbs_per_100g}
                onChange={(e) => setFormData({...formData, carbs_per_100g: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                  formErrors.carbs_per_100g ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="0.0"
              />
              {formErrors.carbs_per_100g && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.carbs_per_100g}</p>}
            </div>

            <div className="md:col-span-2 flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 flex items-center"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 flex items-center"
              >
                <Save className="w-4 h-4 mr-1" />
                {editingId ? 'Update' : 'Create'} Ingredient
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ingredients Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">
                  <div className="flex items-center space-x-2">
                    <span>Category</span>
                    <div className="relative group">
                      <Filter className="w-4 h-4 text-gray-400 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer" />
                      <div className="absolute top-full left-0 pt-1 bg-white dark:bg-slate-700 border border-gray-300 dark:border-slate-600 rounded-lg shadow-lg z-10 hidden group-hover:block min-w-[200px]">
                        <div className="absolute inset-x-0 top-0 h-1 bg-transparent"></div>
                        <div className="p-2 bg-white dark:bg-slate-700 rounded-lg">
                          <button
                            onClick={() => {
                              setSelectedCategory('all');
                              setCurrentPage(1);
                            }}
                            className={`block w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-slate-600 ${
                              selectedCategory === 'all' ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold' : 'text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            All Categories
                          </button>
                          {availableCategories.map(category => (
                            <button
                              key={category}
                              onClick={() => {
                                setSelectedCategory(category);
                                setCurrentPage(1);
                              }}
                              className={`block w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-slate-600 ${
                                selectedCategory === category ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 font-semibold' : 'text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {category}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Calories</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Protein</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Fat</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Carbs</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No ingredients found matching your search.' : 'No ingredients added yet.'}
                  </td>
                </tr>
              ) : (
                filteredIngredients.map((ingredient) => (
                  <tr key={ingredient.id} className={`border-b border-gray-100 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700 ${
                    ingredient.is_system ? 'bg-blue-50/30 dark:bg-blue-900/20' : ''
                  }`}>
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        {ingredient.is_system && (
                          <Lock className="w-4 h-4 text-blue-500 dark:text-blue-400 mr-2" title="System ingredient - cannot be modified" />
                        )}
                        {ingredient.name}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded flex items-center w-fit ${
                        ingredient.is_system
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                          : 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                      }`}>
                        {ingredient.is_system ? (
                          <>
                            <Lock className="w-3 h-3 mr-1" />
                            System
                          </>
                        ) : (
                          <>
                            <User className="w-3 h-3 mr-1" />
                            User
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedCategory(ingredient.category);
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                        title={`Filter by ${ingredient.category}`}
                      >
                        {ingredient.category}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{ingredient.kcal_per_100g}g</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{ingredient.protein_per_100g}g</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{ingredient.fat_per_100g}g</td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">{ingredient.carbs_per_100g}g</td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(ingredient)}
                          disabled={ingredient.is_system}
                          className={`p-1 rounded ${
                            ingredient.is_system
                              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                              : 'text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900'
                          }`}
                          title={ingredient.is_system ? 'System ingredients cannot be edited' : 'Edit ingredient'}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(ingredient.id)}
                          disabled={ingredient.is_system}
                          className={`p-1 rounded ${
                            ingredient.is_system
                              ? 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                              : 'text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900'
                          }`}
                          title={ingredient.is_system ? 'System ingredients cannot be deleted' : 'Delete ingredient'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-6 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span>Showing {itemsPerPage} items per page</span>
            {filteredIngredients.length > 0 && (
              <span className="ml-2">
                • Page {currentPage}
                {hasMore ? ` of ${Math.ceil(totalIngredients / itemsPerPage)}` : ` (${filteredIngredients.length} items on this page)`}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentPage === 1 || paginationLoading}
              className={`px-3 py-1 rounded-lg border flex items-center text-sm ${
                currentPage === 1 || paginationLoading
                  ? 'border-gray-300 dark:border-slate-600 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>

            <div className="px-3 py-1 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg">
              Page {currentPage}
            </div>

            <button
              onClick={handleNextPage}
              disabled={!hasMore || paginationLoading}
              className={`px-3 py-1 rounded-lg border flex items-center text-sm ${
                !hasMore || paginationLoading
                  ? 'border-gray-300 dark:border-slate-600 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                  : 'border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700'
              }`}
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </button>
          </div>
        </div>

        {/* Loading indicator for pagination */}
        {paginationLoading && (
          <div className="mt-4 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-600 dark:border-emerald-400"></div>
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Loading more ingredients...</span>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400 mr-2" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Confirm Delete</h3>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this ingredient? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Ingredients;