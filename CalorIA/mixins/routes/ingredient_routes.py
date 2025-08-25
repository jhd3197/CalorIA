from flask import Blueprint, jsonify, request
from uuid import uuid4
from werkzeug.local import LocalProxy
import sys
import os

# Add the parent directory to the Python path to import CalorIA modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the get_db function and types
from CalorIA.backend.app import get_client
from CalorIA import types as Type

# Create the ingredient routes blueprint
ingredient_bp = Blueprint('ingredient', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@ingredient_bp.route('/api/ingredients', methods=['GET'])
def get_ingredients():
    """Get all ingredients with optional search query parameter and pagination"""
    try:
        # Get pagination parameters
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 50, type=int)
        
        # Validate pagination parameters
        if page < 1:
            return jsonify({"error": "Page must be a positive integer"}), 400
        if limit < 1:
            return jsonify({"error": "Limit must be a positive integer"}), 400
        
        # Convert page to skip
        skip = (page - 1) * limit
        
        # Check for search query parameter
        search_query = request.args.get('search')
        
        # Check for is_system filter parameter
        is_system = request.args.get('is_system')
        if is_system is not None:
            is_system = is_system.lower() in ('true', '1', 'yes')
        
        if search_query:
            # Use search_ingredients if search parameter is provided
            ingredients = client.search_ingredients(search_query, skip=skip, limit=limit, is_system=is_system)
        else:
            # Use get_all_ingredients if no search parameter
            ingredients = client.get_all_ingredients(skip=skip, limit=limit)
        
        if ingredients is None:
            ingredients = []
            
        # Convert ingredients to dictionary format for JSON response
        ingredients_list = [ingredient.to_dict() for ingredient in ingredients]
        
        # Determine if there are more results
        has_more = len(ingredients_list) == limit
        
        # Get total count of ingredients regardless of pagination
        if search_query:
            total_count = client.count_ingredients(search_term=search_query, is_system=is_system)
        else:
            total_count = client.count_ingredients()
            
        # Return response with pagination metadata including total count
        return jsonify({
            "ingredients": ingredients_list,
            "pagination": {
                "page": page,
                "limit": limit,
                "has_more": has_more,
                "total": total_count
            }
        })
        
    except ValueError as e:
        return jsonify({"error": f"Invalid parameter value: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to fetch ingredients: {str(e)}"}), 500

@ingredient_bp.route('/api/ingredients/<uuid:ingredient_id>', methods=['GET'])
def get_ingredient(ingredient_id):
    """Get a specific ingredient by ID"""
    try:
        ingredient = client.get_ingredient_by_id(ingredient_id)
        
        if ingredient is None:
            return jsonify({"error": "Ingredient not found"}), 404
            
        # Convert ingredient to dictionary format for JSON response
        ingredient_dict = ingredient.to_dict()
        return jsonify(ingredient_dict)
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch ingredient: {str(e)}"}), 500

@ingredient_bp.route('/api/ingredients', methods=['POST'])
def create_ingredient():
    """Create a new ingredient"""
    try:
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400
        
        # Validate required fields
        if 'name' not in data:
            return jsonify({"error": "Missing required field: name"}), 400
            
        # Generate UUID for id field if not provided
        ingredient_id = data.get('id', str(uuid4()))
        
        # Create ingredient object
        ingredient = Type.Ingredient(
            id=ingredient_id,
            name=data['name'],
            brand=data.get('brand', ''),
            category=data.get('category', ''),
            calories_per_100g=data.get('calories_per_100g', 0),
            protein_per_100g=data.get('protein_per_100g', 0.0),
            carbs_per_100g=data.get('carbs_per_100g', 0.0),
            fat_per_100g=data.get('fat_per_100g', 0.0),
            fiber_per_100g=data.get('fiber_per_100g', 0.0),
            sugar_per_100g=data.get('sugar_per_100g', 0.0),
            sodium_per_100g=data.get('sodium_per_100g', 0.0),
            serving_size_g=data.get('serving_size_g', 100),
            barcode=data.get('barcode', ''),
            description=data.get('description', '')
        )
        
        # Add to database
        result = client.create_ingredient(ingredient)
        
        if result is None:
            return jsonify({"error": "Failed to create ingredient"}), 500
            
        return jsonify({
            "message": "Ingredient created successfully",
            "ingredient": ingredient.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({"error": f"Invalid value: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to create ingredient: {str(e)}"}), 500

@ingredient_bp.route('/api/ingredients/<uuid:ingredient_id>', methods=['PUT'])
def update_ingredient(ingredient_id):
    """Update an ingredient"""
    try:
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400
        
        # Check if ingredient exists
        existing_ingredient = client.get_ingredient_by_id(ingredient_id)
        if existing_ingredient is None:
            return jsonify({"error": "Ingredient not found"}), 404
        
        # Update ingredient with provided data
        updated_ingredient = Type.Ingredient(
            id=str(ingredient_id),
            name=data.get('name', existing_ingredient.name),
            brand=data.get('brand', existing_ingredient.brand),
            category=data.get('category', existing_ingredient.category),
            calories_per_100g=data.get('calories_per_100g', existing_ingredient.calories_per_100g),
            protein_per_100g=data.get('protein_per_100g', existing_ingredient.protein_per_100g),
            carbs_per_100g=data.get('carbs_per_100g', existing_ingredient.carbs_per_100g),
            fat_per_100g=data.get('fat_per_100g', existing_ingredient.fat_per_100g),
            fiber_per_100g=data.get('fiber_per_100g', existing_ingredient.fiber_per_100g),
            sugar_per_100g=data.get('sugar_per_100g', existing_ingredient.sugar_per_100g),
            sodium_per_100g=data.get('sodium_per_100g', existing_ingredient.sodium_per_100g),
            serving_size_g=data.get('serving_size_g', existing_ingredient.serving_size_g),
            barcode=data.get('barcode', existing_ingredient.barcode),
            description=data.get('description', existing_ingredient.description)
        )
        
        # Update in database
        result = client.update_ingredient(ingredient_id, updated_ingredient)
        
        if result is None:
            return jsonify({"error": "Failed to update ingredient"}), 500
            
        return jsonify({
            "message": "Ingredient updated successfully",
            "ingredient": updated_ingredient.to_dict()
        })
        
    except ValueError as e:
        return jsonify({"error": f"Invalid value: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to update ingredient: {str(e)}"}), 500

@ingredient_bp.route('/api/ingredients/<uuid:ingredient_id>', methods=['DELETE'])
def delete_ingredient(ingredient_id):
    """Delete an ingredient"""
    try:
        # Check if ingredient exists
        existing_ingredient = client.get_ingredient_by_id(ingredient_id)
        if existing_ingredient is None:
            return jsonify({"error": "Ingredient not found"}), 404
        
        # Delete from database
        result = client.delete_ingredient(ingredient_id)
        
        if result is None:
            return jsonify({"error": "Failed to delete ingredient"}), 500
            
        return jsonify({"message": "Ingredient deleted successfully"})
        
    except Exception as e:
        return jsonify({"error": f"Failed to delete ingredient: {str(e)}"}), 500