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

# Create the recipe category routes blueprint
recipe_category_bp = Blueprint('recipe_category', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@recipe_category_bp.route('/api/recipe-categories', methods=['GET'])
def get_categories():
    """Get recipe categories with optional filtering and search."""
    try:
        # Get query parameters
        search_term = request.args.get('search')
        include_system = request.args.get('include_system', 'true').lower() == 'true'
        skip = int(request.args.get('skip', 0))
        limit = request.args.get('limit')
        if limit:
            limit = int(limit)

        # If search term provided, use search functionality
        if search_term:
            categories = client.search_categories(
                search_term=search_term,
                skip=skip,
                limit=limit
            )
        else:
            # Use regular filtering
            categories = client.get_all_categories(
                skip=skip,
                limit=limit,
                include_system=include_system
            )

        # Convert categories to dictionaries
        category_dicts = [category.to_dict() for category in categories]

        return jsonify({
            "categories": category_dicts,
            "count": len(category_dicts)
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get categories: {str(e)}"}), 500

@recipe_category_bp.route('/api/recipe-categories/<category_id>', methods=['GET'])
def get_category(category_id):
    """Get a specific category by ID."""
    try:
        # Parse UUID from string
        try:
            category_id = UUID(category_id)
        except ValueError:
            return jsonify({"error": "Invalid category ID format"}), 400

        category = client.get_category_by_id(category_id)

        if category is None:
            return jsonify({"error": "Category not found"}), 404

        return jsonify({"category": category.to_dict()}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get category: {str(e)}"}), 500

@recipe_category_bp.route('/api/recipe-categories', methods=['POST'])
def create_category():
    """Create a new recipe category."""
    try:
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        # Validate required fields
        required_fields = ['name']
        for field in required_fields:
            if field not in data:
                return jsonify({"error": f"Missing required field: {field}"}), 400

        # Get current user data for created_by field
        user_data = getattr(client, 'get_user_data', lambda: None)()
        user_id = None
        if user_data:
            user_id = user_data.get('user_id') or user_data.get('id')

        # Generate slug if not provided
        slug = data.get('slug')
        if not slug:
            slug = client.generate_slug(data['name'])

        # Create category
        category = Type.RecipeCategoryModel(
            name=data['name'],
            slug=slug,
            description=data.get('description'),
            color=data.get('color'),
            icon=data.get('icon'),
            created_by=user_id
        )

        # Save to database
        result = client.create_category(category)

        if result is None:
            return jsonify({"error": "Failed to save category"}), 500

        return jsonify({
            "message": "Category created successfully",
            "category": category.to_dict()
        }), 201

    except Exception as e:
        return jsonify({"error": f"Failed to create category: {str(e)}"}), 500

@recipe_category_bp.route('/api/recipe-categories/<category_id>', methods=['PUT'])
def update_category(category_id):
    """Update an existing category."""
    try:
        # Parse UUID from string
        try:
            category_id = UUID(category_id)
        except ValueError:
            return jsonify({"error": "Invalid category ID format"}), 400

        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        # Get the existing category to validate it exists
        existing_category = client.get_category_by_id(category_id)
        if existing_category is None:
            return jsonify({"error": "Category not found"}), 404

        # Prepare update data
        update_data = {}

        # Handle basic fields
        if 'name' in data:
            update_data['name'] = data['name']
            # Regenerate slug if name changed
            if data['name'] != existing_category.name:
                update_data['slug'] = client.generate_slug(data['name'])

        if 'description' in data:
            update_data['description'] = data['description']
        if 'color' in data:
            update_data['color'] = data['color']
        if 'icon' in data:
            update_data['icon'] = data['icon']

        # If no fields to update, return error
        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        # Update the category
        success = client.update_category(category_id, update_data)

        if not success:
            return jsonify({"error": "Failed to update category"}), 500

        # Get updated category
        updated_category = client.get_category_by_id(category_id)

        return jsonify({
            "message": "Category updated successfully",
            "category": updated_category.to_dict() if updated_category else None
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to update category: {str(e)}"}), 500

@recipe_category_bp.route('/api/recipe-categories/<category_id>', methods=['DELETE'])
def delete_category(category_id):
    """Delete a category."""
    try:
        # Parse UUID from string
        try:
            category_id = UUID(category_id)
        except ValueError:
            return jsonify({"error": "Invalid category ID format"}), 400

        # Get the existing category to validate it exists
        existing_category = client.get_category_by_id(category_id)
        if existing_category is None:
            return jsonify({"error": "Category not found"}), 404

        # Check if category is system category (prevent deletion)
        if existing_category.is_system:
            return jsonify({"error": "Cannot delete system categories"}), 403

        # Delete the category
        success = client.delete_category(category_id)

        if not success:
            return jsonify({"error": "Failed to delete category"}), 500

        return jsonify({
            "message": "Category deleted successfully",
            "id": str(category_id)
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to delete category: {str(e)}"}), 500

@recipe_category_bp.route('/api/recipe-categories/popular', methods=['GET'])
def get_popular_categories():
    """Get popular categories (could be based on recipe count)."""
    try:
        limit = request.args.get('limit', 10)
        limit = int(limit)

        # For now, return all categories sorted by name
        # In the future, this could be based on actual usage statistics
        categories = client.get_all_categories(limit=limit)
        category_dicts = [category.to_dict() for category in categories]

        return jsonify({
            "categories": category_dicts,
            "count": len(category_dicts)
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get popular categories: {str(e)}"}), 500

@recipe_category_bp.route('/api/recipe-categories/<category_id>/recalculate-usage', methods=['POST'])
def recalculate_category_usage(category_id):
    """Recalculate usage count for a category."""
    try:
        # Parse UUID from string
        try:
            category_id = UUID(category_id)
        except ValueError:
            return jsonify({"error": "Invalid category ID format"}), 400

        success = client.recalculate_category_usage(category_id)

        if not success:
            return jsonify({"error": "Failed to recalculate category usage"}), 500

        # Get updated category
        category = client.get_category_by_id(category_id)

        return jsonify({
            "message": "Category usage recalculated successfully",
            "category": category.to_dict() if category else None
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to recalculate category usage: {str(e)}"}), 500

@recipe_category_bp.route('/api/recipe-categories/recalculate-all-usage', methods=['POST'])
def recalculate_all_category_usage():
    """Recalculate usage counts for all categories."""
    try:
        categories = client.get_all_categories(include_system=True)
        updated_count = 0

        for category in categories:
            try:
                success = client.recalculate_category_usage(category.id)
                if success:
                    updated_count += 1
            except Exception as e:
                print(f"Failed to recalculate usage for category {category.name}: {e}")
                continue

        return jsonify({
            "message": f"Recalculated usage for {updated_count} categories",
            "total_categories": len(categories),
            "updated_categories": updated_count
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to recalculate category usage: {str(e)}"}), 500