import React, { useState, useEffect } from 'react';
import { X, ChefHat } from 'lucide-react';
import apiUtils from '../utils/api';

const AddRecipeModal = ({ isOpen, onClose, onRecipeCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    prep_time_minutes: 15,
    cook_time_minutes: 30,
    servings: 4,
    difficulty: 'medium',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);

  const difficulties = [
    { value: 'easy', label: 'Easy' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' }
  ];

  // Fetch categories and tags when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchCategories();
      fetchTags();
    }
  }, [isOpen]);

  const fetchCategories = async () => {
    setLoadingCategories(true);
    try {
      const response = await apiUtils.apiRequest('/recipe-categories');
      if (response.categories) {
        setCategories(response.categories);
        // Set default category if available
        if (response.categories.length > 0 && !formData.category_id) {
          const dinnerCategory = response.categories.find(cat => cat.slug === 'dinner');
          if (dinnerCategory) {
            setFormData(prev => ({ ...prev, category_id: dinnerCategory.id }));
          }
        }
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const fetchTags = async () => {
    setLoadingTags(true);
    try {
      const response = await apiUtils.apiRequest('/recipe-tags?sort_by_usage=true&limit=20');
      if (response.tags) {
        setTags(response.tags);
      }
    } catch (err) {
      console.error('Error fetching tags:', err);
    } finally {
      setLoadingTags(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get current user data for created_by field
      const userData = apiUtils.getUserData();
      const recipeData = {
        ...formData,
        created_by: userData?.user_id || userData?.id,
        instructions: [], // Start with empty instructions
        ingredients: [], // Start with empty ingredients
        tags: [] // Start with empty tags
      };

      const response = await apiUtils.apiRequest('/recipes', {
        method: 'POST',
        body: JSON.stringify(recipeData)
      });

      if (response.recipe) {
        onRecipeCreated(response.recipe);
        onClose();
        // Reset form
        setFormData({
          name: '',
          category_id: categories.length > 0 ? categories.find(cat => cat.slug === 'dinner')?.id || '' : '',
          prep_time_minutes: 15,
          cook_time_minutes: 30,
          servings: 4,
          difficulty: 'medium',
          description: ''
        });
      }
    } catch (err) {
      console.error('Error creating recipe:', err);
      setError(err.message || 'Failed to create recipe. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <ChefHat className="w-6 h-6 text-emerald-600 mr-2" />
            <h3 className="text-lg font-semibold">Add New Recipe</h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recipe Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Enter recipe name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => handleInputChange('category_id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              required
              disabled={loadingCategories}
            >
              {loadingCategories ? (
                <option>Loading categories...</option>
              ) : (
                <>
                  <option value="">Select a category</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prep Time (min) *
              </label>
              <input
                type="number"
                value={formData.prep_time_minutes}
                onChange={(e) => handleInputChange('prep_time_minutes', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                min="0"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cook Time (min)
              </label>
              <input
                type="number"
                value={formData.cook_time_minutes}
                onChange={(e) => handleInputChange('cook_time_minutes', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                min="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Servings *
              </label>
              <input
                type="number"
                value={formData.servings}
                onChange={(e) => handleInputChange('servings', parseInt(e.target.value) || 1)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                min="1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Difficulty
              </label>
              <select
                value={formData.difficulty}
                onChange={(e) => handleInputChange('difficulty', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {difficulties.map(difficulty => (
                  <option key={difficulty.value} value={difficulty.value}>
                    {difficulty.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              rows="3"
              placeholder="Brief description of the recipe (optional)"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              disabled={loading || !formData.name.trim()}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating...
                </>
              ) : (
                'Create Recipe'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddRecipeModal;