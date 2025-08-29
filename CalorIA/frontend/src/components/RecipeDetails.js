import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Clock, Users, Star, Edit, Save, X, ChefHat, Heart, Plus, Trash2, Search, Calculator } from 'lucide-react';
import apiUtils, { fetchRecipeById, getIngredients, getRecipeCategories, getRecipeTags, createRecipeTag } from '../utils/api';

const RecipeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedRecipe, setEditedRecipe] = useState(null);
  const [availableIngredients, setAvailableIngredients] = useState([]);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [showIngredientSearch, setShowIngredientSearch] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [ingredientDetails, setIngredientDetails] = useState({});
  const [loadingIngredientDetails, setLoadingIngredientDetails] = useState(false);
  const [calculatedNutrition, setCalculatedNutrition] = useState(null);
  const [loadingNutrition, setLoadingNutrition] = useState(false);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingTagIndex, setEditingTagIndex] = useState(null);
  const [newTagName, setNewTagName] = useState('');

  // Fetch recipe details
  const fetchRecipeDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchRecipeById(id);
      setRecipe(response.recipe);
      setEditedRecipe(response.recipe);
    } catch (err) {
      console.error('Error fetching recipe details:', err);
      setError('Failed to load recipe details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch available ingredients
  const fetchAvailableIngredients = async () => {
    try {
      const response = await getIngredients();
      setAvailableIngredients(response.ingredients || []);
    } catch (err) {
      console.error('Error fetching ingredients:', err);
      // Use sample ingredients if API fails
      setAvailableIngredients([
        { id: 1, name: 'Chicken Breast', kcal_per_100g: 165, protein_per_100g: 31, fat_per_100g: 3.6, carbs_per_100g: 0 },
        { id: 2, name: 'Brown Rice', kcal_per_100g: 111, protein_per_100g: 2.6, fat_per_100g: 0.9, carbs_per_100g: 23 },
        { id: 3, name: 'Broccoli', kcal_per_100g: 34, protein_per_100g: 2.8, fat_per_100g: 0.4, carbs_per_100g: 7 }
      ]);
    }
  };

  // Fetch available categories
  const fetchAvailableCategories = async () => {
    try {
      setLoadingCategories(true);
      const response = await getRecipeCategories();
      setAvailableCategories(response.categories || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      // Use sample categories if API fails
      setAvailableCategories([
        { id: 'breakfast', name: 'Breakfast', slug: 'breakfast' },
        { id: 'lunch', name: 'Lunch', slug: 'lunch' },
        { id: 'dinner', name: 'Dinner', slug: 'dinner' },
        { id: 'snack', name: 'Snack', slug: 'snack' },
        { id: 'healthy', name: 'Healthy', slug: 'healthy' },
        { id: 'asian', name: 'Asian', slug: 'asian' },
        { id: 'italian', name: 'Italian', slug: 'italian' },
        { id: 'seafood', name: 'Seafood', slug: 'seafood' }
      ]);
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch available tags
  const fetchAvailableTags = async () => {
    try {
      setLoadingTags(true);
      const response = await getRecipeTags();
      setAvailableTags(response.tags || []);
    } catch (err) {
      console.error('Error fetching tags:', err);
      // Use sample tags if API fails
      setAvailableTags([
        { id: '1', name: 'Quick', slug: 'quick' },
        { id: '2', name: 'Easy', slug: 'easy' },
        { id: '3', name: 'Vegetarian', slug: 'vegetarian' },
        { id: '4', name: 'Vegan', slug: 'vegan' },
        { id: '5', name: 'Gluten-Free', slug: 'gluten-free' },
        { id: '6', name: 'Low-Carb', slug: 'low-carb' }
      ]);
    } finally {
      setLoadingTags(false);
    }
  };

  // Fetch ingredient details by ID
  const fetchIngredientDetails = async (ingredientIds) => {
    if (ingredientIds.length === 0) return;

    setLoadingIngredientDetails(true);
    const details = {};

    for (const ingredientId of ingredientIds) {
      if (ingredientId && !ingredientDetails[ingredientId]) {
        try {
          const response = await apiUtils.apiRequest(`/ingredients/${ingredientId}`);
          details[ingredientId] = response;
        } catch (err) {
          console.error(`Error fetching ingredient ${ingredientId}:`, err);
          // Fallback to name from available ingredients
          const fallbackIngredient = availableIngredients.find(ing => ing.id === ingredientId);
          if (fallbackIngredient) {
            details[ingredientId] = fallbackIngredient;
          }
        }
      }
    }

    if (Object.keys(details).length > 0) {
      setIngredientDetails(prev => ({ ...prev, ...details }));
    }

    setLoadingIngredientDetails(false);
  };

  useEffect(() => {
    if (id) {
      fetchRecipeDetails();
      fetchAvailableIngredients();
      fetchAvailableCategories();
      fetchAvailableTags();
    }
  }, [id]);

  // Check if we should auto-enter edit mode based on URL
  useEffect(() => {
    const isEditMode = location.pathname.endsWith('/edit');
    if (isEditMode && !isEditing && recipe) {
      setIsEditing(true);
      setEditedRecipe({ ...recipe });
    } else if (!isEditMode && isEditing) {
      // If we're not in edit mode URL but still in edit mode, exit edit mode
      setIsEditing(false);
    }
  }, [location.pathname, recipe, isEditing]);

  // Fetch ingredient details when recipe changes
  useEffect(() => {
    if (recipe && recipe.ingredients) {
      const ingredientIds = recipe.ingredients
        .map(ing => ing.ingredient_id)
        .filter(id => id);
      if (ingredientIds.length > 0) {
        fetchIngredientDetails(ingredientIds);
      }
    }
  }, [recipe]);

  // Automatically calculate nutrition when ingredient details are loaded
  useEffect(() => {
    if (recipe && recipe.ingredients && Object.keys(ingredientDetails).length > 0) {
      // Check if we have details for all ingredients
      const hasAllDetails = recipe.ingredients.every(ing =>
        ing.ingredient_id && ingredientDetails[ing.ingredient_id]
      );

      if (hasAllDetails && !loadingIngredientDetails) {
        setLoadingNutrition(true);
        // Small delay to show loading state briefly
        setTimeout(() => {
          const nutrition = calculateNutrition(recipe.ingredients, recipe.servings);
          setCalculatedNutrition(nutrition);
          setLoadingNutrition(false);
        }, 300);
      }
    }
  }, [recipe, ingredientDetails, loadingIngredientDetails]);

  // Calculate nutrition for the entire recipe
  const calculateNutrition = (ingredients, servings = null) => {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;

    const servingsCount = servings || editedRecipe?.servings || recipe?.servings || 1;

    ingredients.forEach(ingredient => {
      if (ingredient.amount && ingredient.unit) {
        // Get ingredient data from either cached details or available ingredients
        const ingredientData = ingredientDetails[ingredient.ingredient_id] ||
                              availableIngredients.find(ing => ing.id === ingredient.ingredient_id);

        if (ingredientData && ingredientData.kcal_per_100g) {
          // Convert amount to grams for calculation
          let amountInGrams = parseFloat(ingredient.amount) || 0;

          // Convert different units to grams
          switch (ingredient.unit.toLowerCase()) {
            case 'kg':
              amountInGrams *= 1000;
              break;
            case 'oz':
              amountInGrams *= 28.35;
              break;
            case 'lb':
            case 'lbs':
              amountInGrams *= 453.59;
              break;
            case 'ml':
              // Assume density of 1 g/ml for liquids
              amountInGrams *= 1;
              break;
            case 'cup':
              amountInGrams *= 240; // Approximate
              break;
            case 'tbsp':
              amountInGrams *= 15;
              break;
            case 'tsp':
              amountInGrams *= 5;
              break;
            case 'g':
            default:
              // Already in grams
              break;
          }

          // Calculate nutritional values per 100g
          const nutritionPer100g = {
            calories: ingredientData.kcal_per_100g || 0,
            protein: ingredientData.protein_per_100g || 0,
            fat: ingredientData.fat_per_100g || 0,
            carbs: ingredientData.carbs_per_100g || 0
          };

          // Calculate for this ingredient amount
          totalCalories += (nutritionPer100g.calories * amountInGrams) / 100;
          totalProtein += (nutritionPer100g.protein * amountInGrams) / 100;
          totalFat += (nutritionPer100g.fat * amountInGrams) / 100;
          totalCarbs += (nutritionPer100g.carbs * amountInGrams) / 100;
        }
      }
    });

    return {
      calories_per_serving: servingsCount > 0 ? Math.round(totalCalories / servingsCount) : Math.round(totalCalories),
      protein_per_serving: servingsCount > 0 ? Math.round(totalProtein / servingsCount * 10) / 10 : Math.round(totalProtein * 10) / 10,
      fat_per_serving: servingsCount > 0 ? Math.round(totalFat / servingsCount * 10) / 10 : Math.round(totalFat * 10) / 10,
      carbs_per_serving: servingsCount > 0 ? Math.round(totalCarbs / servingsCount * 10) / 10 : Math.round(totalCarbs * 10) / 10,
      total_calories: Math.round(totalCalories),
      total_protein: Math.round(totalProtein * 10) / 10,
      total_fat: Math.round(totalFat * 10) / 10,
      total_carbs: Math.round(totalCarbs * 10) / 10
    };
  };


  // Handle edit mode toggle
  const handleEditToggle = () => {
    const newEditMode = !isEditing;
    setIsEditing(newEditMode);
    if (newEditMode) {
      // Ensure proper data structure for editing
      const recipeForEditing = {
        ...recipe,
        // Make sure tag_ids is properly set
        tag_ids: recipe.tag_ids || recipe.tags || [],
        // Make sure category_id is properly set
        category_id: recipe.category_id || recipe.category
      };
      setEditedRecipe(recipeForEditing);
      // Update URL to include /edit when entering edit mode
      if (!location.pathname.endsWith('/edit')) {
        navigate(`${location.pathname}/edit`, { replace: true });
      }
    } else {
      // Update URL to remove /edit when exiting edit mode
      if (location.pathname.endsWith('/edit')) {
        const basePath = location.pathname.replace('/edit', '');
        navigate(basePath, { replace: true });
      }
    }
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      // Ensure nutrition is calculated before saving
      const finalNutrition = calculatedNutrition || calculateNutrition(editedRecipe.ingredients, editedRecipe.servings);

      // Prepare the recipe data for saving
      const recipeDataToSave = {
        ...editedRecipe,
        // Include calculated nutrition values with stored suffix
        calories_per_serving_stored: finalNutrition.calories_per_serving,
        protein_per_serving_stored: finalNutrition.protein_per_serving,
        fat_per_serving_stored: finalNutrition.fat_per_serving,
        carbs_per_serving_stored: finalNutrition.carbs_per_serving,
        total_calories_stored: finalNutrition.total_calories,
        total_protein_stored: finalNutrition.total_protein,
        total_fat_stored: finalNutrition.total_fat,
        total_carbs_stored: finalNutrition.total_carbs,
        // Ensure ingredients are properly formatted
        ingredients: editedRecipe.ingredients.map(ingredient => ({
          ingredient_id: ingredient.ingredient_id,
          amount: parseFloat(ingredient.amount) || 0,
          unit: ingredient.unit || 'g',
          name: ingredient.name || ingredient.ingredient?.name || 'Unknown ingredient'
        })),
        // Filter out empty instructions
        instructions: editedRecipe.instructions.filter(instruction => instruction.trim() !== ''),
        // Ensure category_id is properly formatted
        category_id: editedRecipe.category_id || editedRecipe.category,
        // Ensure tag_ids are properly formatted (should be array of UUIDs)
        tag_ids: (editedRecipe.tag_ids || editedRecipe.tags || []).filter(tag => {
          const tagId = typeof tag === 'object' && tag.id ? tag.id : tag;
          return tagId && tagId.trim() !== '';
        })
      };

      console.log('Saving recipe with nutrition data:', recipeDataToSave);

      const response = await apiUtils.apiRequest(`/recipes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(recipeDataToSave)
      });

      console.log('Save response:', response);

      // Update local state with the saved recipe
      setRecipe(response.recipe);
      setEditedRecipe(response.recipe);
      setCalculatedNutrition(null); // Reset calculated nutrition since it's now saved
      setIsEditing(false);
      setError(null);

      // Navigate back to the regular recipe URL (remove /edit if present)
      if (location.pathname.endsWith('/edit')) {
        const basePath = location.pathname.replace('/edit', '');
        navigate(basePath, { replace: true });
      }
    } catch (err) {
      console.error('Error updating recipe:', err);
      setError('Failed to update recipe. Please try again.');
    }
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedRecipe({ ...recipe });
    setIsEditing(false);
    setError(null);
  };

  // Handle input changes
  const handleInputChange = (field, value) => {
    setEditedRecipe(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle ingredient changes
  const handleIngredientChange = (index, field, value) => {
    const updatedIngredients = [...editedRecipe.ingredients];
    const currentIngredient = updatedIngredients[index];

    if (field === 'name') {
      // Handle name changes - update both ingredient.name and name fields
      updatedIngredients[index] = {
        ...currentIngredient,
        ingredient: {
          ...currentIngredient.ingredient,
          name: value
        },
        name: value
      };
    } else {
      // Handle amount and unit changes
      updatedIngredients[index] = {
        ...currentIngredient,
        [field]: field === 'amount' ? parseFloat(value) || 0 : value
      };
    }

    // Update ingredients first
    const newEditedRecipe = {
      ...editedRecipe,
      ingredients: updatedIngredients
    };

    // Recalculate nutrition when ingredients change
    const nutrition = calculateNutrition(updatedIngredients, newEditedRecipe.servings);
    setCalculatedNutrition(nutrition);

    setEditedRecipe({
      ...newEditedRecipe,
      ...nutrition
    });
  };

  // Add new ingredient
  const addNewIngredient = (ingredient) => {
    const newIngredient = {
      ingredient_id: ingredient.id,
      ingredient: ingredient,
      name: ingredient.name,
      amount: 100,
      unit: 'g'
    };

    const updatedIngredients = [...editedRecipe.ingredients, newIngredient];
    const nutrition = calculateNutrition(updatedIngredients);

    setEditedRecipe(prev => ({
      ...prev,
      ingredients: updatedIngredients,
      ...nutrition
    }));

    setShowIngredientSearch(false);
    setIngredientSearch('');
  };

  // Remove ingredient
  const removeIngredient = (index) => {
    const updatedIngredients = editedRecipe.ingredients.filter((_, i) => i !== index);
    const nutrition = calculateNutrition(updatedIngredients);

    setEditedRecipe(prev => ({
      ...prev,
      ingredients: updatedIngredients,
      ...nutrition
    }));
  };

  // Add new instruction
  const addNewInstruction = () => {
    const updatedInstructions = [...editedRecipe.instructions, ''];
    setEditedRecipe(prev => ({
      ...prev,
      instructions: updatedInstructions
    }));
  };

  // Remove instruction
  const removeInstruction = (index) => {
    const updatedInstructions = editedRecipe.instructions.filter((_, i) => i !== index);
    setEditedRecipe(prev => ({
      ...prev,
      instructions: updatedInstructions
    }));
  };

  // Delete recipe
  const handleDeleteRecipe = async () => {
    try {
      await apiUtils.apiRequest(`/recipes/${id}`, {
        method: 'DELETE'
      });
      navigate('/recipes');
    } catch (err) {
      console.error('Error deleting recipe:', err);
      setError('Failed to delete recipe. Please try again.');
    }
  };

  // Get ingredient name by ID
  const getIngredientName = (ingredientId) => {
    if (!ingredientId) return 'Unknown ingredient';

    // If still loading ingredient details, return null to show skeleton
    if (loadingIngredientDetails) {
      return null; // This will trigger skeleton loading
    }

    // First check if we have the ingredient details cached
    const ingredientDetail = ingredientDetails[ingredientId];
    if (ingredientDetail) {
      return ingredientDetail.name || 'Unknown ingredient';
    }

    // Fallback to available ingredients
    const availableIngredient = availableIngredients.find(ing => ing.id === ingredientId);
    if (availableIngredient) {
      return availableIngredient.name || 'Unknown ingredient';
    }

    return 'Unknown ingredient';
  };

  // Handle instruction changes
  const handleInstructionChange = (index, value) => {
    const updatedInstructions = [...editedRecipe.instructions];
    updatedInstructions[index] = value;
    setEditedRecipe(prev => ({
      ...prev,
      instructions: updatedInstructions
    }));
  };

  const addNewTag = () => {
    setEditingTagIndex(null);
    setNewTagName('');
    setShowTagModal(true);
  };

  const editTag = (index) => {
    const tagIds = editedRecipe.tag_ids || editedRecipe.tags || [];
    const tagId = tagIds[index];
    const tagDisplay = availableTags.find(t => (t.id || t.slug) === tagId)?.name || tagId;
    setEditingTagIndex(index);
    setNewTagName(tagDisplay);
    setShowTagModal(true);
  };

  const saveTag = async () => {
    if (!newTagName.trim()) return;

    const tagIds = editedRecipe.tag_ids || editedRecipe.tags || [];
    const updatedTagIds = [...tagIds];

    // Check if this tag already exists in available tags
    const existingTag = availableTags.find(tag =>
      tag.name.toLowerCase() === newTagName.toLowerCase()
    );

    let tagIdToUse;
    if (existingTag) {
      // Use existing tag
      tagIdToUse = existingTag.id || existingTag.slug;
    } else {
      // Create new tag if it doesn't exist
      try {
        const newTag = await createRecipeTag({ name: newTagName });
        if (newTag && newTag.tag) {
          // Add to available tags
          setAvailableTags(prev => [...prev, newTag.tag]);
          tagIdToUse = newTag.tag.id || newTag.tag.slug;
        } else {
          tagIdToUse = newTagName;
        }
      } catch (error) {
        console.error('Error creating new tag:', error);
        tagIdToUse = newTagName;
      }
    }

    if (editingTagIndex !== null) {
      // Editing existing tag
      updatedTagIds[editingTagIndex] = tagIdToUse;
    } else {
      // Adding new tag
      updatedTagIds.push(tagIdToUse);
    }

    setEditedRecipe(prev => ({
      ...prev,
      tag_ids: updatedTagIds
    }));

    setShowTagModal(false);
    setEditingTagIndex(null);
    setNewTagName('');
  };


  const removeTag = (index) => {
    const tagIds = editedRecipe.tag_ids || editedRecipe.tags || [];
    const updatedTagIds = tagIds.filter((_, i) => i !== index);
    setEditedRecipe(prev => ({
      ...prev,
      tag_ids: updatedTagIds
    }));
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty?.toLowerCase()) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Skeleton loading component for ingredients
  const IngredientSkeleton = () => (
    <div className="flex items-center p-3 bg-gray-50 rounded animate-pulse">
      <div className="w-16 h-4 bg-gray-300 rounded mr-3"></div>
      <div className="w-12 h-4 bg-gray-300 rounded mr-3"></div>
      <div className="flex-1 h-4 bg-gray-300 rounded"></div>
    </div>
  );

  // Skeleton loading component for nutrition
  const NutritionSkeleton = () => (
    <div className="space-y-3">
      <div className="flex justify-between">
        <div className="w-16 h-4 bg-gray-300 rounded animate-pulse"></div>
        <div className="w-20 h-4 bg-gray-300 rounded animate-pulse"></div>
      </div>
      <div className="flex justify-between">
        <div className="w-14 h-4 bg-gray-300 rounded animate-pulse"></div>
        <div className="w-16 h-4 bg-gray-300 rounded animate-pulse"></div>
      </div>
      <div className="flex justify-between">
        <div className="w-12 h-4 bg-gray-300 rounded animate-pulse"></div>
        <div className="w-18 h-4 bg-gray-300 rounded animate-pulse"></div>
      </div>
      <div className="flex justify-between">
        <div className="w-8 h-4 bg-gray-300 rounded animate-pulse"></div>
        <div className="w-14 h-4 bg-gray-300 rounded animate-pulse"></div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Loading recipe details...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-red-500">{error}</div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">Recipe not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/recipes')}
          className="flex items-center text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Recipes
        </button>
        <button
          onClick={handleEditToggle}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Edit className="w-4 h-4 mr-2" />
          {isEditing ? 'Cancel Edit' : 'Edit Recipe'}
        </button>
      </div>

      {/* Recipe Header */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Recipe Image */}
          <div className="w-full md:w-1/3">
            <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <ChefHat className="w-16 h-16 text-gray-400" />
            </div>
          </div>

          {/* Recipe Info */}
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                value={editedRecipe.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="text-3xl font-bold mb-2 w-full border border-gray-300 rounded px-3 py-2"
              />
            ) : (
              <h1 className="text-3xl font-bold mb-2">{recipe.name}</h1>
            )}

            <div className="flex items-center gap-4 mb-4">
              <span className={`px-3 py-1 text-sm rounded-full ${getDifficultyColor(recipe.difficulty)}`}>
                {recipe.difficulty}
              </span>
              <div className="flex items-center text-gray-600">
                <Clock className="w-4 h-4 mr-1" />
                <span>{recipe.prep_time_minutes + (recipe.cook_time_minutes || 0)} min</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Users className="w-4 h-4 mr-1" />
                <span>{recipe.servings} servings</span>
              </div>
              <div className="flex items-center text-gray-600">
                <Star className="w-4 h-4 mr-1 text-yellow-500" />
                <span>4.5</span>
              </div>
            </div>

            <div className="text-2xl font-bold text-emerald-600 mb-4">
              {recipe.calories_per_serving_stored && recipe.calories_per_serving_stored > 0
                ? `${Math.round(recipe.calories_per_serving_stored || 0)} kcal/serving`
                : 'Nutrition info pending'
              }
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {(recipe.tag_ids && recipe.tag_ids.length > 0) || (recipe.tags && recipe.tags.length > 0) ? (
                (recipe.tag_ids || recipe.tags || []).map((tag, index) => {
                  // Handle both tag_ids (UUIDs) and tags (could be objects or strings)
                  const tagId = typeof tag === 'object' && tag.id ? tag.id : tag;
                  const tagDisplay = availableTags.find(t => (t.id || t.slug) === tagId)?.name || tagId;
                  return (
                    <span key={index} className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">
                      {tagDisplay}
                    </span>
                  );
                })
              ) : (
                <span className="text-sm text-gray-500">No tags</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recipe Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Description</h2>
            {isEditing ? (
              <textarea
                value={editedRecipe.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 min-h-24"
                placeholder="Enter recipe description..."
              />
            ) : (
              <p className="text-gray-700">{recipe.description || 'No description available.'}</p>
            )}
          </div>

          {/* Ingredients */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Ingredients</h2>
              {isEditing && (
                <button
                  onClick={() => setShowIngredientSearch(true)}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Ingredient
                </button>
              )}
            </div>

            {/* Ingredient Search Modal */}
            {showIngredientSearch && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-md mx-4 w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Add Ingredient</h3>
                    <button
                      onClick={() => setShowIngredientSearch(false)}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Search ingredients..."
                      value={ingredientSearch}
                      onChange={(e) => setIngredientSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {availableIngredients
                      .filter(ing => ing.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
                      .map((ingredient) => (
                        <button
                          key={ingredient.id}
                          onClick={() => addNewIngredient(ingredient)}
                          className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <div className="font-medium">{ingredient.name}</div>
                          <div className="text-sm text-gray-600">
                            {ingredient.kcal_per_100g} kcal, {ingredient.protein_per_100g}g protein per 100g
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tag Modal */}
            {showTagModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 max-w-sm mx-4 w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">
                      {editingTagIndex !== null ? 'Edit Tag' : 'Add New Tag'}
                    </h3>
                    <button
                      onClick={() => {
                        setShowTagModal(false);
                        setEditingTagIndex(null);
                        setNewTagName('');
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tag Name
                    </label>
                    <input
                      type="text"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter tag name..."
                      autoFocus
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowTagModal(false);
                        setEditingTagIndex(null);
                        setNewTagName('');
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveTag}
                      disabled={!newTagName.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {editingTagIndex !== null ? 'Update Tag' : 'Add Tag'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {isEditing ? (
                editedRecipe.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded">
                    <input
                      type="number"
                      value={ingredient.amount || ''}
                      onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                      className="w-20 border border-gray-300 rounded px-2 py-1"
                      step="0.1"
                      placeholder="amount"
                    />
                    <input
                      type="text"
                      value={ingredient.unit || ''}
                      onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                      className="w-16 border border-gray-300 rounded px-2 py-1"
                      placeholder="unit"
                    />
                    <span className="text-gray-600">of</span>
                    {getIngredientName(ingredient.ingredient_id) === null ? (
                      <div className="flex-1 h-8 bg-gray-300 rounded animate-pulse"></div>
                    ) : (
                      <input
                        type="text"
                        value={getIngredientName(ingredient.ingredient_id)}
                        onChange={(e) => handleIngredientChange(index, 'name', e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-2 py-1"
                        placeholder="ingredient name"
                      />
                    )}
                    <button
                      onClick={() => removeIngredient(index)}
                      className="p-1 text-red-600 hover:text-red-800"
                      title="Remove ingredient"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                recipe.ingredients.map((ingredient, index) => {
                  const ingredientName = getIngredientName(ingredient.ingredient_id);
                  return ingredientName === null ? (
                    <IngredientSkeleton key={index} />
                  ) : (
                    <div key={index} className="flex items-center p-3 bg-gray-50 rounded">
                      <span className="font-medium mr-3">{ingredient.amount || 'N/A'} {ingredient.unit || 'unit'}</span>
                      <span>{ingredientName}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Instructions</h2>
              {isEditing && (
                <button
                  onClick={addNewInstruction}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Step
                </button>
              )}
            </div>
            <div className="space-y-4">
              {isEditing ? (
                editedRecipe.instructions
                  .filter(instruction => instruction.trim() !== '') // Remove empty instructions
                  .map((instruction, index) => (
                    <div key={index} className="flex gap-3">
                      <span className="font-medium text-gray-600 min-w-8">{index + 1}.</span>
                      <textarea
                        value={instruction}
                        onChange={(e) => handleInstructionChange(index, e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-3 py-2 min-h-20"
                        placeholder="Enter instruction..."
                      />
                      <button
                        onClick={() => removeInstruction(index)}
                        className="p-1 text-red-600 hover:text-red-800 self-start mt-2"
                        title="Remove step"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
              ) : (
                recipe.instructions
                  .filter(instruction => instruction.trim() !== '') // Remove empty instructions
                  .map((instruction, index) => (
                    <div key={index} className="flex gap-3">
                      <span className="font-medium text-gray-600 min-w-8">{index + 1}.</span>
                      <p className="text-gray-700">{instruction}</p>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Recipe Info</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Prep Time:</span>
                {isEditing ? (
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={editedRecipe.prep_time_minutes || 0}
                      onChange={(e) => handleInputChange('prep_time_minutes', parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                      min="0"
                    />
                    <span className="ml-1 text-sm text-gray-600">min</span>
                  </div>
                ) : (
                  <span className="font-medium">{recipe.prep_time_minutes} min</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Cook Time:</span>
                {isEditing ? (
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={editedRecipe.cook_time_minutes || 0}
                      onChange={(e) => handleInputChange('cook_time_minutes', parseInt(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                      min="0"
                    />
                    <span className="ml-1 text-sm text-gray-600">min</span>
                  </div>
                ) : (
                  <span className="font-medium">{recipe.cook_time_minutes || 0} min</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Time:</span>
                <span className="font-medium">
                  {(editedRecipe?.prep_time_minutes || recipe.prep_time_minutes) +
                   (editedRecipe?.cook_time_minutes || recipe.cook_time_minutes || 0)} min
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Servings:</span>
                {isEditing ? (
                  <div className="flex items-center">
                    <input
                      type="number"
                      value={editedRecipe.servings || 1}
                      onChange={(e) => {
                        const newServings = parseInt(e.target.value) || 1;
                        handleInputChange('servings', newServings);
                        // Recalculate nutrition when servings change
                        const nutrition = calculateNutrition(editedRecipe.ingredients, newServings);
                        setCalculatedNutrition(nutrition);
                        setEditedRecipe(prev => ({
                          ...prev,
                          servings: newServings,
                          ...nutrition
                        }));
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                      min="1"
                    />
                    <span className="ml-1 text-sm text-gray-600">servings</span>
                  </div>
                ) : (
                  <span className="font-medium">{recipe.servings}</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                  <span className="text-gray-600">Category:</span>
                  {isEditing ? (
                    <select
                      value={editedRecipe.category_id || editedRecipe.category || ''}
                      onChange={(e) => handleInputChange('category_id', e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-sm"
                      disabled={loadingCategories}
                    >
                      <option value="">
                        {loadingCategories ? 'Loading categories...' : 'Select category'}
                      </option>
                      {availableCategories.map((category) => (
                        <option key={category.id || category.slug} value={category.id || category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-medium capitalize">
                      {recipe.category_id || recipe.category ? (
                        availableCategories.find(cat => (cat.id || cat.slug) === (recipe.category_id || recipe.category))?.name ||
                        (recipe.category_id || recipe.category)
                      ) : (
                        'No category'
                      )}
                    </span>
                  )}
                </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Difficulty:</span>
                {isEditing ? (
                  <select
                    value={editedRecipe.difficulty || 'medium'}
                    onChange={(e) => handleInputChange('difficulty', e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-sm"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                ) : (
                  <span className="font-medium capitalize">{recipe.difficulty}</span>
                )}
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rating:</span>
                {isEditing ? (
                  <div className="flex items-center">
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={editedRecipe.rating || 4.5}
                      onChange={(e) => handleInputChange('rating', parseFloat(e.target.value) || 0)}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-right"
                    />
                    <span className="ml-1 text-sm text-gray-600">/5</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Star className="w-4 h-4 mr-1 text-yellow-500" />
                    <span className="font-medium">{recipe.rating || 4.5}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tags Section */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Tags</h3>
              {isEditing && (
                <button
                  onClick={addNewTag}
                  className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center text-sm"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Tag
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <>
                  {(editedRecipe.tag_ids || editedRecipe.tags || []).map((tag, index) => {
                    const tagId = typeof tag === 'object' && tag.id ? tag.id : tag;
                    const tagDisplay = availableTags.find(t => (t.id || t.slug) === tagId)?.name || tagId;
                    return (
                      <div key={index} className="flex items-center bg-gray-100 rounded-lg px-3 py-1">
                        <button
                          type="button"
                          onClick={() => editTag(index)}
                          className="bg-transparent border-none outline-none text-sm flex-1 min-w-20 text-left cursor-pointer hover:bg-gray-200 rounded px-1"
                          title="Click to edit tag"
                        >
                          {tagDisplay}
                        </button>
                        <button
                          onClick={() => removeTag(index)}
                          className="ml-2 text-red-600 hover:text-red-800"
                          title="Remove tag"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                  {/* Tag selector dropdown */}
                  <select
                    onChange={(e) => {
                      const selectedTag = e.target.value;
                      if (selectedTag && !(editedRecipe.tag_ids || editedRecipe.tags || []).some(tag => {
                        const tagId = typeof tag === 'object' && tag.id ? tag.id : tag;
                        return tagId === selectedTag;
                      })) {
                        // Add the selected tag if it's not already in the list
                        const tagIds = editedRecipe.tag_ids || editedRecipe.tags || [];
                        setEditedRecipe(prev => ({
                          ...prev,
                          tag_ids: [...tagIds, selectedTag]
                        }));
                      }
                      e.target.value = ''; // Reset dropdown
                    }}
                    className="px-2 py-1 border border-gray-300 rounded text-sm bg-white"
                    disabled={loadingTags}
                  >
                    <option value="">
                      {loadingTags ? 'Loading tags...' : 'Add existing tag'}
                    </option>
                    {availableTags
                      .filter(tag => !(editedRecipe.tag_ids || editedRecipe.tags || []).some(existingTag => {
                        const existingId = typeof existingTag === 'object' && existingTag.id ? existingTag.id : existingTag;
                        return existingId === (tag.id || tag.slug);
                      }))
                      .map((tag) => (
                        <option key={tag.id || tag.slug} value={tag.id || tag.slug}>
                          {tag.name}
                        </option>
                      ))}
                  </select>
                </>
              ) : (
                (recipe.tag_ids && recipe.tag_ids.length > 0) || (recipe.tags && recipe.tags.length > 0) ? (
                  (recipe.tag_ids || recipe.tags || []).map((tag, index) => {
                    const tagId = typeof tag === 'object' && tag.id ? tag.id : tag;
                    const tagDisplay = availableTags.find(t => (t.id || t.slug) === tagId)?.name || tagId;
                    return (
                      <span key={index} className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full">
                        {tagDisplay}
                      </span>
                    );
                  })
                ) : (
                  <span className="text-sm text-gray-500">No tags</span>
                )
              )}
            </div>

            {((!recipe.tag_ids || recipe.tag_ids.length === 0) && (!recipe.tags || recipe.tags.length === 0)) && !isEditing && (
              <p className="text-sm text-gray-500 mt-2">No tags added yet.</p>
            )}
          </div>

          {/* Nutrition Info */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Nutrition (per serving)</h3>

            {/* Check if we have stored nutrition data */}
            {(recipe?.calories_per_serving_stored || editedRecipe?.calories_per_serving_stored || calculatedNutrition?.calories_per_serving) ? (
              <>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Calories:</span>
                    <span className="font-medium">
                      {Math.round(calculatedNutrition?.calories_per_serving ||
                       editedRecipe?.calories_per_serving_stored ||
                       recipe?.calories_per_serving_stored || 0)} kcal
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Protein:</span>
                    <span className="font-medium">
                      {calculatedNutrition?.protein_per_serving ||
                       editedRecipe?.protein_per_serving_stored ||
                       recipe?.protein_per_serving_stored}g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Carbs:</span>
                    <span className="font-medium">
                      {calculatedNutrition?.carbs_per_serving ||
                       editedRecipe?.carbs_per_serving_stored ||
                       recipe?.carbs_per_serving_stored}g
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Fat:</span>
                    <span className="font-medium">
                      {calculatedNutrition?.fat_per_serving ||
                       editedRecipe?.fat_per_serving_stored ||
                       recipe?.fat_per_serving_stored}g
                    </span>
                  </div>
                </div>

                {/* Total nutrition for entire recipe */}
                {(calculatedNutrition?.total_calories || editedRecipe?.total_calories_stored || recipe?.total_calories_stored) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Total for entire recipe:</h4>
                    <div className="text-sm text-gray-600">
                      {Math.round(calculatedNutrition?.total_calories ||
                       editedRecipe?.total_calories_stored ||
                       recipe?.total_calories_stored || 0)} kcal total
                    </div>
                  </div>
                )}

                {/* Show loading note only if we're actively calculating and have no stored data */}
                {loadingNutrition && !recipe?.calories_per_serving_stored && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600">
                      <strong>Loading:</strong> Calculating nutrition based on ingredient data...
                    </p>
                  </div>
                )}
              </>
            ) : loadingNutrition ? (
              <NutritionSkeleton />
            ) : (
              <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-600">
                  <strong>Note:</strong> Nutrition information will be calculated automatically once ingredient details are loaded.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Actions */}
      {isEditing && (
        <div className="fixed bottom-6 right-6 flex gap-3">
          <button
            onClick={() => setDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Recipe
          </button>
          <button
            onClick={handleCancelEdit}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center"
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </button>
          <button
            onClick={handleSaveChanges}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4">
            <div className="flex items-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600 mr-2" />
              <h3 className="text-lg font-semibold">Delete Recipe</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{recipe?.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRecipe}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete Recipe
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeDetails;