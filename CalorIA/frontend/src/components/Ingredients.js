import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit3, Trash2, Save, X, AlertCircle, Lock, User, Filter } from 'lucide-react';

const Ingredients = () => {
  const [ingredients, setIngredients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterType, setFilterType] = useState('all'); // 'all', 'system', 'user'
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

  // Sample categories for the form
  const categories = [
    'Vegetables', 'Fruits', 'Grains', 'Proteins', 'Dairy', 
    'Nuts & Seeds', 'Oils & Fats', 'Beverages', 'Condiments', 'Other'
  ];

  // Fetch ingredients on component mount
  useEffect(() => {
    fetchIngredients();
  }, []);

  const fetchIngredients = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Build query parameters
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterType === 'system') params.append('is_system', 'true');
      if (filterType === 'user') params.append('is_system', 'false');
      const queryString = params.toString() ? `?${params.toString()}` : '';
      
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
      // Check if data is an array (direct response) or has ingredients property
      setIngredients(Array.isArray(data) ? data : (data.ingredients || []));
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
    } finally {
      setLoading(false);
    }
  };

  // Search ingredients when search term changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchIngredients();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm, filterType]);

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
      
      if (isEdit) {
        setIngredients(ingredients.map(ing => 
          ing.id === editingId ? result.ingredient : ing
        ));
      } else {
        setIngredients([...ingredients, result.ingredient]);
      }

      resetForm();
      await fetchIngredients(); // Refresh the list
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

      setIngredients(ingredients.filter(ing => ing.id !== id));
      setDeleteConfirm(null);
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

  const filteredIngredients = ingredients.filter(ingredient => {
    // Apply search filter
    const matchesSearch = ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ingredient.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Apply type filter (this is redundant if backend filtering works, but good for fallback)
    let matchesType = true;
    if (filterType === 'system') {
      matchesType = ingredient.is_system === true;
    } else if (filterType === 'user') {
      matchesType = ingredient.is_system === false;
    }
    
    return matchesSearch && matchesType;
  });

  // Calculate statistics
  const systemIngredients = ingredients.filter(ing => ing.is_system === true);
  const userIngredients = ingredients.filter(ing => ing.is_system === false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading ingredients...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center mr-3">
              <Package className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Ingredients</p>
              <p className="font-semibold">{ingredients.length} items</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <Lock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">System Ingredients</p>
              <p className="font-semibold">{systemIngredients.length} items</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mr-3">
              <User className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">User Ingredients</p>
              <p className="font-semibold">{userIngredients.length} items</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
              <Package className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Categories</p>
              <p className="font-semibold">{new Set(ingredients.map(i => i.category)).size} types</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Search and Add Section */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search ingredients by name or category..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[180px]"
              >
                <option value="all">All Ingredients</option>
                <option value="system">System Only</option>
                <option value="user">User Only</option>
              </select>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center whitespace-nowrap"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add New Ingredient
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {editingId ? 'Edit Ingredient' : 'Add New Ingredient'}
            </h2>
            <button 
              onClick={resetForm}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter ingredient name"
              />
              {formErrors.name && <p className="text-red-600 text-xs mt-1">{formErrors.name}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.category ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {formErrors.category && <p className="text-red-600 text-xs mt-1">{formErrors.category}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Calories per 100g *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.kcal_per_100g}
                onChange={(e) => setFormData({...formData, kcal_per_100g: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.kcal_per_100g ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.0"
              />
              {formErrors.kcal_per_100g && <p className="text-red-600 text-xs mt-1">{formErrors.kcal_per_100g}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Protein per 100g *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.protein_per_100g}
                onChange={(e) => setFormData({...formData, protein_per_100g: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.protein_per_100g ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.0"
              />
              {formErrors.protein_per_100g && <p className="text-red-600 text-xs mt-1">{formErrors.protein_per_100g}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fat per 100g *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.fat_per_100g}
                onChange={(e) => setFormData({...formData, fat_per_100g: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.fat_per_100g ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.0"
              />
              {formErrors.fat_per_100g && <p className="text-red-600 text-xs mt-1">{formErrors.fat_per_100g}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Carbs per 100g *
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.carbs_per_100g}
                onChange={(e) => setFormData({...formData, carbs_per_100g: e.target.value})}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  formErrors.carbs_per_100g ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.0"
              />
              {formErrors.carbs_per_100g && <p className="text-red-600 text-xs mt-1">{formErrors.carbs_per_100g}</p>}
            </div>

            <div className="md:col-span-2 flex justify-end space-x-2 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 flex items-center"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center"
              >
                <Save className="w-4 h-4 mr-1" />
                {editingId ? 'Update' : 'Create'} Ingredient
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ingredients Table */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            Ingredients Management
            <span className="text-gray-500 font-normal ml-2">({filteredIngredients.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold">Name</th>
                <th className="text-left py-3 px-4 font-semibold">Type</th>
                <th className="text-left py-3 px-4 font-semibold">Category</th>
                <th className="text-left py-3 px-4 font-semibold">Calories</th>
                <th className="text-left py-3 px-4 font-semibold">Protein</th>
                <th className="text-left py-3 px-4 font-semibold">Fat</th>
                <th className="text-left py-3 px-4 font-semibold">Carbs</th>
                <th className="text-left py-3 px-4 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIngredients.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-8 text-gray-500">
                    {searchTerm ? 'No ingredients found matching your search.' : 'No ingredients added yet.'}
                  </td>
                </tr>
              ) : (
                filteredIngredients.map((ingredient) => (
                  <tr key={ingredient.id} className={`border-b border-gray-100 hover:bg-gray-50 ${
                    ingredient.is_system ? 'bg-blue-50/30' : ''
                  }`}>
                    <td className="py-3 px-4 font-medium">
                      <div className="flex items-center">
                        {ingredient.is_system && (
                          <Lock className="w-4 h-4 text-blue-500 mr-2" title="System ingredient - cannot be modified" />
                        )}
                        {ingredient.name}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded flex items-center w-fit ${
                        ingredient.is_system
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-green-100 text-green-700'
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
                      <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                        {ingredient.category}
                      </span>
                    </td>
                    <td className="py-3 px-4">{ingredient.kcal_per_100g}g</td>
                    <td className="py-3 px-4">{ingredient.protein_per_100g}g</td>
                    <td className="py-3 px-4">{ingredient.fat_per_100g}g</td>
                    <td className="py-3 px-4">{ingredient.carbs_per_100g}g</td>
                    <td className="py-3 px-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleEdit(ingredient)}
                          disabled={ingredient.is_system}
                          className={`p-1 rounded ${
                            ingredient.is_system
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-blue-600 hover:text-blue-800 hover:bg-blue-100'
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
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-800 hover:bg-red-100'
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
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="flex items-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold">Confirm Delete</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this ingredient? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
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