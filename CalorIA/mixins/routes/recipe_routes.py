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
        required_fields = ['name', 'prep_time_minutes', 'servings']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Handle category - must be category_id (UUID)
        if 'category_id' not in data or not data['category_id']:
            return jsonify({"error": "category_id is required"}), 400

        try:
            category_id = UUID(data['category_id'])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid category_id format"}), 400

        # Handle tags - must be tag_ids (UUID array)
        tag_ids = []
        if 'tag_ids' in data and data['tag_ids']:
            if not isinstance(data['tag_ids'], list):
                return jsonify({"error": "tag_ids must be an array"}), 400
            for tag_id_str in data['tag_ids']:
                try:
                    tag_ids.append(UUID(tag_id_str))
                except (ValueError, TypeError):
                    return jsonify({"error": f"Invalid tag_id format: {tag_id_str}"}), 400

        # Validate ingredients - allow empty for new recipes that will be edited
        if 'ingredients' in data and not isinstance(data['ingredients'], list):
            return jsonify({"error": "Ingredients must be an array"}), 400

        # Process ingredients
        ingredients = []
        if 'ingredients' in data:
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
            category_id=category_id,
            prep_time_minutes=data['prep_time_minutes'],
            cook_time_minutes=data.get('cook_time_minutes'),
            servings=data['servings'],
            difficulty=data.get('difficulty', 'medium'),
            ingredients=ingredients,
            instructions=data.get('instructions', []),
            tag_ids=tag_ids,
            image_url=data.get('image_url'),
            source_url=data.get('source_url'),
            notes=data.get('notes'),
            created_by=data.get('created_by'),  # Should come from authenticated user
            # Handle nutrition fields
            calories_per_serving_stored=data.get('calories_per_serving_stored'),
            protein_per_serving_stored=data.get('protein_per_serving_stored'),
            fat_per_serving_stored=data.get('fat_per_serving_stored'),
            carbs_per_serving_stored=data.get('carbs_per_serving_stored'),
            total_calories_stored=data.get('total_calories_stored'),
            total_protein_stored=data.get('total_protein_stored'),
            total_fat_stored=data.get('total_fat_stored'),
            total_carbs_stored=data.get('total_carbs_stored'),
            rating=data.get('rating', 4.5)
        )

        # Save to database
        result = client.create_recipe(recipe)

        if result is None:
            return jsonify({"error": "Failed to save recipe"}), 500

        # Update usage counts for category and tags
        try:
            if category_id:
                client.increment_category_usage(category_id)

            if tag_ids:
                for tag_id in tag_ids:
                    try:
                        client.increment_tag_usage(UUID(tag_id))
                    except (ValueError, TypeError):
                        pass  # Skip invalid tag IDs
        except Exception as e:
            print(f"Warning: Failed to update usage counts: {e}")
            # Don't fail the recipe creation if usage count update fails

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

        # Handle category - must be category_id
        if 'category_id' in data:
            if data['category_id']:
                try:
                    update_data['category_id'] = str(UUID(data['category_id']))
                except (ValueError, TypeError):
                    return jsonify({"error": "Invalid category_id format"}), 400
            else:
                return jsonify({"error": "category_id cannot be empty"}), 400

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

        # Handle tags - must be tag_ids
        if 'tag_ids' in data:
            if data['tag_ids'] and isinstance(data['tag_ids'], list):
                try:
                    update_data['tag_ids'] = [str(UUID(tag_id)) for tag_id in data['tag_ids']]
                except (ValueError, TypeError):
                    return jsonify({"error": "Invalid tag_id format in tag_ids"}), 400
            else:
                update_data['tag_ids'] = []

        if 'image_url' in data:
            update_data['image_url'] = data['image_url']
        if 'source_url' in data:
            update_data['source_url'] = data['source_url']
        if 'notes' in data:
            update_data['notes'] = data['notes']

        # Handle nutrition fields
        if 'calories_per_serving_stored' in data:
            update_data['calories_per_serving_stored'] = data['calories_per_serving_stored']
        if 'protein_per_serving_stored' in data:
            update_data['protein_per_serving_stored'] = data['protein_per_serving_stored']
        if 'fat_per_serving_stored' in data:
            update_data['fat_per_serving_stored'] = data['fat_per_serving_stored']
        if 'carbs_per_serving_stored' in data:
            update_data['carbs_per_serving_stored'] = data['carbs_per_serving_stored']
        if 'total_calories_stored' in data:
            update_data['total_calories_stored'] = data['total_calories_stored']
        if 'total_protein_stored' in data:
            update_data['total_protein_stored'] = data['total_protein_stored']
        if 'total_fat_stored' in data:
            update_data['total_fat_stored'] = data['total_fat_stored']
        if 'total_carbs_stored' in data:
            update_data['total_carbs_stored'] = data['total_carbs_stored']
        if 'rating' in data:
            update_data['rating'] = data['rating']

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

        # Get the old recipe to compare category/tag changes
        old_recipe = client.get_recipe_by_id(recipe_id)
        old_category_id = old_recipe.category_id if old_recipe else None
        old_tag_ids = old_recipe.tag_ids if old_recipe else []

        # Update the recipe
        success = client.update_recipe(recipe_id, update_data)

        if not success:
            return jsonify({"error": "Failed to update recipe"}), 500

        # Update usage counts for category and tags if they changed
        try:
            # Handle category change
            new_category_id = update_data.get('category_id')

            if old_category_id != new_category_id:
                if old_category_id:
                    client.decrement_category_usage(UUID(old_category_id))
                if new_category_id:
                    client.increment_category_usage(UUID(new_category_id))

            # Handle tag changes
            new_tag_ids = update_data.get('tag_ids', [])

            # Find tags that were removed
            for old_tag_id in old_tag_ids:
                if old_tag_id not in new_tag_ids:
                    client.decrement_tag_usage(UUID(old_tag_id))

            # Find tags that were added
            for new_tag_id in new_tag_ids:
                if new_tag_id not in old_tag_ids:
                    client.increment_tag_usage(UUID(new_tag_id))

        except Exception as e:
            print(f"Warning: Failed to update usage counts: {e}")
            # Don't fail the recipe update if usage count update fails

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

        # Get the existing recipe to validate it exists and get category/tag info
        existing_recipe = client.get_recipe_by_id(recipe_id)
        if existing_recipe is None:
            return jsonify({"error": "Recipe not found"}), 404

        # Store category and tag info before deletion
        recipe_category_id = existing_recipe.category_id
        recipe_tag_ids = existing_recipe.tag_ids

        # Delete the recipe
        success = client.delete_recipe(recipe_id)

        if not success:
            return jsonify({"error": "Failed to delete recipe"}), 500

        # Update usage counts for category and tags
        try:
            if recipe_category_id:
                try:
                    client.decrement_category_usage(UUID(recipe_category_id))
                except (ValueError, TypeError):
                    pass

            if recipe_tag_ids:
                for tag_id in recipe_tag_ids:
                    try:
                        client.decrement_tag_usage(UUID(tag_id))
                    except (ValueError, TypeError):
                        pass
        except Exception as e:
            print(f"Warning: Failed to update usage counts: {e}")
            # Don't fail the recipe deletion if usage count update fails

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
        # Get dynamic categories from database
        categories = client.get_all_categories(include_system=True)
        category_dicts = [category.to_dict() for category in categories]

        return jsonify({"categories": category_dicts}), 200
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