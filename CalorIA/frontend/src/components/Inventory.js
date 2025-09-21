import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, Edit3, Trash2, Save, X, AlertCircle, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const Inventory = () => {
  const [inventory, setInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState('all');
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [formData, setFormData] = useState({
    ingredient_id: '',
    quantity: '',
    unit: '',
    min_quantity: '',
    max_quantity: '',
    location: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [paginationLoading, setPaginationLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 50;

  // Ref for search input focus preservation
  const searchInputRef = useRef(null);

  // Sample locations for the form
  const locations = [
    'Pantry', 'Fridge', 'Freezer', 'Cabinet', 'Other'
  ];

  // URL state management utilities
  const getUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      search: urlParams.get('search') || '',
      location: urlParams.get('location') || 'all',
      page: parseInt(urlParams.get('page') || '1', 10)
    };
  };

  const validateUrlParams = (params) => {
    // Validate page number - must be positive integer
    const validPage = Math.max(1, isNaN(params.page) ? 1 : params.page);
    
    // Location validation will be done dynamically once we have inventory loaded
    const validLocation = params.location || 'all';
    
    return {
      search: params.search || '',
      location: validLocation,
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
    
    if (updatedParams.location && updatedParams.location !== 'all') {
      urlParams.set('location', updatedParams.location);
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
    setSelectedLocation(urlParams.location);
    setCurrentPage(urlParams.page);
    
    // Fetch inventory with URL parameters
    fetchInventory(urlParams.page, true);
    
    // Mark initial load as complete after a short delay to allow state updates
    setTimeout(() => setIsInitialLoad(false), 100);
  }, []);

  const fetchInventory = async (page = currentPage, resetPagination = false) => {
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
      params.append('page', page.toString());
      params.append('limit', itemsPerPage.toString());
      const queryString = `?${params.toString()}`;
      
      const headers = {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'Cache-Control': 'no-cache'
      };

      const response = await fetch(`/api/inventory${queryString}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch inventory: ${response.status}`);
      }

      const data = await response.json();
      
      // Handle paginated response format
      if (data.inventory_items && data.pagination) {
        setInventory(data.inventory_items);
        setHasMore(data.pagination.has_more);
        setCurrentPage(data.pagination.page);
        setTotalItems(data.pagination.total);
      } else {
        // Fallback for old format
        const inventoryList = Array.isArray(data) ? data : (data.inventory_items || []);
        setInventory(inventoryList);
        setHasMore(inventoryList.length >= itemsPerPage);
      }

      setError(null);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      setError('Failed to load inventory. Please try again.');
    } finally {
      setLoading(false);
      setPaginationLoading(false);
    }
  };

  // Search inventory when search term or filters change - reset to page 1
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
        location: selectedLocation,
        page: newPage
      });
      fetchInventory(newPage, true);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, selectedLocation, isInitialLoad]);

  // Fetch inventory when page changes (but not on initial load or filter changes)
  useEffect(() => {
    // Skip this effect during initial load
    if (isInitialLoad) {
      return;
    }
    
    if (currentPage > 1) {
      updateUrl({ page: currentPage });
      fetchInventory(currentPage, false);
    } else if (currentPage === 1) {
      // Update URL when page is 1 (to remove page parameter if it was set)
      updateUrl({ page: currentPage });
    }
  }, [currentPage, isInitialLoad]);

  // Focus preservation effect
  useEffect(() => {
    if (searchInputRef.current && !loading && document.activeElement !== searchInputRef.current) {
      if (searchTerm && searchInputRef.current !== document.activeElement) {
        const focusTimeout = setTimeout(() => {
          if (searchInputRef.current) {
            searchInputRef.current.focus();
            const length = searchInputRef.current.value.length;
            searchInputRef.current.setSelectionRange(length, length);
          }
        }, 0);
        
        return () => clearTimeout(focusTimeout);
      }
    }
  }, [loading, inventory, searchTerm]);

  const validateForm = () => {
    const errors = {};
    
    if (!formData.ingredient_id.trim()) {
      errors.ingredient_id = 'Ingredient is required';
    }
    
    if (!formData.quantity || formData.quantity < 0) {
      errors.quantity = 'Valid quantity is required';
    }

    if (!formData.unit.trim()) {
      errors.unit = 'Unit is required';
    }

    if (formData.min_quantity && formData.min_quantity < 0) {
      errors.min_quantity = 'Minimum quantity must be non-negative';
    }

    if (formData.max_quantity && formData.max_quantity <= 0) {
      errors.max_quantity = 'Maximum quantity must be positive';
    }

    if (formData.min_quantity && formData.max_quantity && 
        parseInt(formData.max_quantity) <= parseInt(formData.min_quantity)) {
      errors.max_quantity = 'Maximum quantity must be greater than minimum quantity';
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
      const url = isEdit ? `/api/inventory/${editingId}` : '/api/inventory';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          min_quantity: formData.min_quantity ? parseInt(formData.min_quantity) : null,
          max_quantity: formData.max_quantity ? parseInt(formData.max_quantity) : null
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to ${isEdit ? 'update' : 'create'} inventory item: ${response.status}`);
      }

      const result = await response.json();

      resetForm();
      // Refresh the current page data
      await fetchInventory(currentPage, false);
    } catch (error) {
      console.error('Error saving inventory item:', error);
      setError(`Failed to ${editingId ? 'update' : 'create'} inventory item. Please try again.`);
    }
  };

  const handleEdit = (item) => {
    setFormData({
      ingredient_id: item.ingredient_id,
      quantity: item.quantity.toString(),
      unit: item.unit,
      min_quantity: item.min_quantity?.toString() || '',
      max_quantity: item.max_quantity?.toString() || '',
      location: item.location || '',
      notes: item.notes || ''
    });
    setEditingId(item.id);
    setShowAddForm(true);
    setFormErrors({});
  };

  const handleDelete = async (id) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await fetch(`/api/inventory/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete inventory item: ${response.status}`);
      }

      setDeleteConfirm(null);
      // Refresh the current page data
      await fetchInventory(currentPage, false);
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      setError('Failed to delete inventory item. Please try again.');
    }
  };

  const resetForm = () => {
    setFormData({
      ingredient_id: '',
      quantity: '',
      unit: '',
      min_quantity: '',
      max_quantity: '',
      location: '',
      notes: ''
    });
    setFormErrors({});
    setShowAddForm(false);
    setEditingId(null);
  };

  // Helper function to clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedLocation('all');
    setCurrentPage(1);
    // Clear URL parameters
    updateUrl({ search: '', location: 'all', page: 1 });
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

  // Extract available locations from inventory (for filter dropdown)
  const availableLocations = [...new Set(inventory.map(item => item.location).filter(loc => loc))].sort();

  // Since we're using server-side pagination, we don't need client-side filtering
  const filteredInventory = inventory;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 dark:border-emerald-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading inventory...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center mr-3">
              <Package className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Items</p>
              <p className="font-semibold text-gray-900 dark:text-white">{totalItems} items</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center mr-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Low Stock Items</p>
              <p className="font-semibold text-gray-900 dark:text-white">
                {inventory.filter(item => item.min_quantity && item.quantity <= item.min_quantity).length} items
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-3">
              <Package className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Locations</p>
              <p className="font-semibold text-gray-900 dark:text-white">{availableLocations.length} areas</p>
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
                placeholder="Search inventory..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-4 h-4" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white min-w-[180px]"
              >
                <option value="all">All Locations</option>
                {availableLocations.map(location => (
                  <option key={location} value={location}>{location}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-emerald-600 dark:bg-emerald-700 text-white rounded-lg hover:bg-emerald-700 dark:hover:bg-emerald-600 flex items-center whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Inventory Item
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {editingId ? 'Edit Inventory Item' : 'Add New Inventory Item'}
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
                Ingredient *
              </label>
              <select
                value={formData.ingredient_id}
                onChange={(e) => setFormData({...formData, ingredient_id: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                  formErrors.ingredient_id ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                }`}
              >
                <option value="">Select ingredient</option>
                {/* TODO: Fetch and populate ingredients list */}
              </select>
              {formErrors.ingredient_id && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.ingredient_id}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Location
              </label>
              <select
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
              >
                <option value="">Select location</option>
                {locations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="0"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                  formErrors.quantity ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="0"
              />
              {formErrors.quantity && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.quantity}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Unit *
              </label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({...formData, unit: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                  formErrors.unit ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                }`}
              >
                <option value="">Select unit</option>
                <option value="g">Grams (g)</option>
                <option value="ml">Milliliters (ml)</option>
                <option value="unit">Units</option>
                <option value="tbsp">Tablespoons</option>
                <option value="tsp">Teaspoons</option>
                <option value="cup">Cups</option>
                <option value="oz">Ounces</option>
              </select>
              {formErrors.unit && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.unit}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minimum Quantity
              </label>
              <input
                type="number"
                min="0"
                value={formData.min_quantity}
                onChange={(e) => setFormData({...formData, min_quantity: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                  formErrors.min_quantity ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="0"
              />
              {formErrors.min_quantity && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.min_quantity}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maximum Quantity
              </label>
              <input
                type="number"
                min="0"
                value={formData.max_quantity}
                onChange={(e) => setFormData({...formData, max_quantity: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white ${
                  formErrors.max_quantity ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-slate-600'
                }`}
                placeholder="0"
              />
              {formErrors.max_quantity && <p className="text-red-600 dark:text-red-400 text-xs mt-1">{formErrors.max_quantity}</p>}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                rows="3"
                placeholder="Add any notes about this inventory item..."
              />
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
                {editingId ? 'Update' : 'Create'} Item
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-gray-200 dark:border-slate-600">
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Ingredient</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Quantity</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Location</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Min Qty</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Max Qty</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-900 dark:text-white">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventory.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-8 text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No inventory items found matching your search.' : 'No inventory items added yet.'}
                  </td>
                </tr>
              ) : (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700">
                    <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                      {item.ingredient?.name || 'Unknown Ingredient'}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {item.quantity} {item.unit}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => {
                          setSelectedLocation(item.location || 'all');
                          setCurrentPage(1);
                        }}
                        className="px-2 py-1 text-xs bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded hover:bg-blue-100 dark:hover:bg-blue-900 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer"
                        title={`Filter by ${item.location || 'No location'}`}
                      >
                        {item.location || 'No location'}
                      </button>
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {item.min_quantity || '-'}
                    </td>
                    <td className="py-3 px-4 text-gray-900 dark:text-white">
                      {item.max_quantity || '-'}
                    </td>
                    <td className="py-3 px-4">
                      {item.min_quantity && item.quantity <= item.min_quantity ? (
                        <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded">
                          Low Stock
                        </span>
                      ) : item.max_quantity && item.quantity >= item.max_quantity ? (
                        <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 rounded">
                          Full Stock
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                          In Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1 rounded text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900"
                          title="Edit inventory item"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(item.id)}
                          className="p-1 rounded text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900"
                          title="Delete inventory item"
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
            {filteredInventory.length > 0 && (
              <span className="ml-2">
                • Page {currentPage}
                {hasMore ? ` of ${Math.ceil(totalItems / itemsPerPage)}` : ` (${filteredInventory.length} items on this page)`}
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
            <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">Loading more items...</span>
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
              Are you sure you want to delete this inventory item? This action cannot be undone.
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

export default Inventory;