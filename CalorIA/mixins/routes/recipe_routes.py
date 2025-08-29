from flask import Blueprint, jsonify, request
from uuid import UUID
from datetime import datetime
from werkzeug.local import LocalProxy
import sys
import os

# Add the parent directory to the Python path to import CalorIA modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the get_db function and types
from CalorIA.backend.app import get_client
from CalorIA import types as Type

# Create the recipe routes blueprint
recipe_bp = Blueprint('recipe', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@recipe_bp.route('/api/recipes', methods=['GET'])
def get_recipes():
    """Get recipes with optional filtering and search."""
    try:
        # Get query parameters
        search_term = request.args.get('search')
        category = request.args.get('category')
        difficulty = request.args.get('difficulty')
        tags = request.args.getlist('tags')  # Multiple tags possible
        skip = int(request.args.get('skip', 0))
        limit = request.args.get('limit')
        if limit:
            limit = int(limit)

        # If search term provided, use search functionality
        if search_term:
            recipes = client.search_recipes(
                search_term=search_term,
                skip=skip,
                limit=limit,
                category=category,
                difficulty=difficulty,
                tags=tags if tags else None
            )
        else:
            # Use regular filtering
            recipes = client.get_all_recipes(
                skip=skip,
                limit=limit,
                category=category,
                difficulty=difficulty
            )

        # Convert recipes to dictionaries
        recipe_dicts = [recipe.to_dict() for recipe in recipes]

        return jsonify({
            "recipes": recipe_dicts,
            "count": len(recipe_dicts)
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get recipes: {str(e)}"}), 500

@recipe_bp.route('/api/recipes/<recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    """Get a specific recipe by ID."""
    try:
        # Parse UUID from string
        try:
            recipe_id = UUID(recipe_id)
        except ValueError:
            return jsonify({"error": "Invalid recipe ID format"}), 400

        recipe = client.get_recipe_by_id(recipe_id)

        if recipe is None:
            return jsonify({"error": "Recipe not found"}), 404

        return jsonify({"recipe": recipe.to_dict()}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get recipe: {str(e)}"}), 500

@recipe_bp.route('/api/recipes', methods=['POST'])
def create_recipe():
    """Create a new recipe."""
    try:
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        # Validate required fields
        required_fields = ['name', 'category', 'prep_time_minutes', 'servings', 'ingredients']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Validate ingredients
        if not isinstance(data['ingredients'], list) or len(data['ingredients']) == 0:
            return jsonify({"error": "Ingredients must be a non-empty array"}), 400

        # Process ingredients
        ingredients = []
        for ingredient_data in data['ingredients']:
            try:
                ingredient = Type.RecipeIngredient(
                    ingredient_id=ingredient_data.get('ingredient_id'),
                    amount=ingredient_data.get('amount', 1.0),
                    unit=ingredient_data.get('unit', 'g'),
                    notes=ingredient_data.get('notes')
                )
                ingredients.append(ingredient)
            except Exception as e:
                return jsonify({"error": f"Invalid ingredient data: {str(e)}"}), 400

        # Create recipe
        recipe = Type.Recipe(
            name=data['name'],
            description=data.get('description'),
            category=data['category'],
            prep_time_minutes=data['prep_time_minutes'],
            cook_time_minutes=data.get('cook_time_minutes'),
            servings=data['servings'],
            difficulty=data.get('difficulty', 'medium'),
            ingredients=ingredients,
            instructions=data.get('instructions', []),
            tags=data.get('tags', []),
            image_url=data.get('image_url'),
            source_url=data.get('source_url'),
            notes=data.get('notes'),
            created_by=data.get('created_by')  # Should come from authenticated user
        )

        # Save to database
        result = client.create_recipe(recipe)

        if result is None:
            return jsonify({"error": "Failed to save recipe"}), 500

        return jsonify({
            "message": "Recipe created successfully",
            "recipe": recipe.to_dict()
        }), 201

    except Exception as e:
        return jsonify({"error": f"Failed to create recipe: {str(e)}"}), 500

@recipe_bp.route('/api/recipes/<recipe_id>', methods=['PUT'])
def update_recipe(recipe_id):
    """Update an existing recipe."""
    try:
        # Parse UUID from string
        try:
            recipe_id = UUID(recipe_id)
        except ValueError:
            return jsonify({"error": "Invalid recipe ID format"}), 400

        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        # Get the existing recipe to validate it exists
        existing_recipe = client.get_recipe_by_id(recipe_id)
        if existing_recipe is None:
            return jsonify({"error": "Recipe not found"}), 404

        # Prepare update data
        update_data = {}

        # Handle basic fields
        if 'name' in data:
            update_data['name'] = data['name']
        if 'description' in data:
            update_data['description'] = data['description']
        if 'category' in data:
            update_data['category'] = data['category']
        if 'prep_time_minutes' in data:
            update_data['prep_time_minutes'] = data['prep_time_minutes']
        if 'cook_time_minutes' in data:
            update_data['cook_time_minutes'] = data['cook_time_minutes']
        if 'servings' in data:
            update_data['servings'] = data['servings']
        if 'difficulty' in data:
            update_data['difficulty'] = data['difficulty']
        if 'instructions' in data:
            update_data['instructions'] = data['instructions']
        if 'tags' in data:
            update_data['tags'] = data['tags']
        if 'image_url' in data:
            update_data['image_url'] = data['image_url']
        if 'source_url' in data:
            update_data['source_url'] = data['source_url']
        if 'notes' in data:
            update_data['notes'] = data['notes']

        # Handle ingredients update
        if 'ingredients' in data and isinstance(data['ingredients'], list):
            try:
                ingredients = []
                for ingredient_data in data['ingredients']:
                    ingredient = Type.RecipeIngredient(
                        ingredient_id=ingredient_data.get('ingredient_id'),
                        amount=ingredient_data.get('amount', 1.0),
                        unit=ingredient_data.get('unit', 'g'),
                        notes=ingredient_data.get('notes')
                    )
                    ingredients.append(ingredient)

                # Convert ingredients to dictionaries for MongoDB update
                update_data['ingredients'] = [ingredient.to_dict() for ingredient in ingredients]
            except Exception as e:
                return jsonify({"error": f"Invalid ingredient data: {str(e)}"}), 400

        # If no fields to update, return error
        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        # Update the recipe
        success = client.update_recipe(recipe_id, update_data)

        if not success:
            return jsonify({"error": "Failed to update recipe"}), 500

        # Get updated recipe
        updated_recipe = client.get_recipe_by_id(recipe_id)

        return jsonify({
            "message": "Recipe updated successfully",
            "recipe": updated_recipe.to_dict() if updated_recipe else None
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to update recipe: {str(e)}"}), 500

@recipe_bp.route('/api/recipes/<recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    """Delete a recipe."""
    try:
        # Parse UUID from string
        try:
            recipe_id = UUID(recipe_id)
        except ValueError:
            return jsonify({"error": "Invalid recipe ID format"}), 400

        # Get the existing recipe to validate it exists
        existing_recipe = client.get_recipe_by_id(recipe_id)
        if existing_recipe is None:
            return jsonify({"error": "Recipe not found"}), 404

        # Delete the recipe
        success = client.delete_recipe(recipe_id)

        if not success:
            return jsonify({"error": "Failed to delete recipe"}), 500

        return jsonify({
            "message": "Recipe deleted successfully",
            "id": str(recipe_id)
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to delete recipe: {str(e)}"}), 500

@recipe_bp.route('/api/recipes/categories', methods=['GET'])
def get_recipe_categories():
    """Get all available recipe categories."""
    try:
        categories = [category.value for category in Type.RecipeCategory]
        return jsonify({"categories": categories}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to get categories: {str(e)}"}), 500

@recipe_bp.route('/api/recipes/search', methods=['GET'])
def search_recipes():
    """Advanced recipe search endpoint."""
    try:
        # Get query parameters
        query = request.args.get('q', '')
        category = request.args.get('category')
        difficulty = request.args.get('difficulty')
        tags = request.args.getlist('tags')
        max_prep_time = request.args.get('max_prep_time')
        min_servings = request.args.get('min_servings')
        max_servings = request.args.get('max_servings')
        skip = int(request.args.get('skip', 0))
        limit = request.args.get('limit')
        if limit:
            limit = int(limit)

        # Start with basic search
        recipes = client.search_recipes(
            search_term=query,
            skip=skip,
            limit=limit,
            category=category,
            difficulty=difficulty,
            tags=tags if tags else None
        )

        # Apply additional filters
        filtered_recipes = []
        for recipe in recipes:
            # Filter by max prep time
            if max_prep_time and recipe.total_prep_time() > int(max_prep_time):
                continue

            # Filter by servings range
            if min_servings and recipe.servings < int(min_servings):
                continue
            if max_servings and recipe.servings > int(max_servings):
                continue

            filtered_recipes.append(recipe)

        # Convert to dictionaries
        recipe_dicts = [recipe.to_dict() for recipe in filtered_recipes]

        return jsonify({
            "recipes": recipe_dicts,
            "count": len(recipe_dicts),
            "query": query
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to search recipes: {str(e)}"}), 500

@recipe_bp.route('/api/recipes/popular', methods=['GET'])
def get_popular_recipes():
    """Get popular recipes."""
    try:
        limit = request.args.get('limit', 10)
        limit = int(limit)

        recipes = client.get_popular_recipes(limit=limit)
        recipe_dicts = [recipe.to_dict() for recipe in recipes]

        return jsonify({
            "recipes": recipe_dicts,
            "count": len(recipe_dicts)
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get popular recipes: {str(e)}"}), 500