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

# Create the recipe tag routes blueprint
recipe_tag_bp = Blueprint('recipe_tag', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@recipe_tag_bp.route('/api/recipe-tags', methods=['GET'])
def get_tags():
    """Get recipe tags with optional filtering and search."""
    try:
        # Get query parameters
        search_term = request.args.get('search')
        include_system = request.args.get('include_system', 'true').lower() == 'true'
        sort_by_usage = request.args.get('sort_by_usage', 'false').lower() == 'true'
        skip = int(request.args.get('skip', 0))
        limit = request.args.get('limit')
        if limit:
            limit = int(limit)

        # If search term provided, use search functionality
        if search_term:
            tags = client.search_tags(
                search_term=search_term,
                skip=skip,
                limit=limit
            )
        else:
            # Use regular filtering
            tags = client.get_all_tags(
                skip=skip,
                limit=limit,
                include_system=include_system,
                sort_by_usage=sort_by_usage
            )

        # Convert tags to dictionaries
        tag_dicts = [tag.to_dict() for tag in tags]

        return jsonify({
            "tags": tag_dicts,
            "count": len(tag_dicts)
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get tags: {str(e)}"}), 500

@recipe_tag_bp.route('/api/recipe-tags/<tag_id>', methods=['GET'])
def get_tag(tag_id):
    """Get a specific tag by ID."""
    try:
        # Parse UUID from string
        try:
            tag_id = UUID(tag_id)
        except ValueError:
            return jsonify({"error": "Invalid tag ID format"}), 400

        tag = client.get_tag_by_id(tag_id)

        if tag is None:
            return jsonify({"error": "Tag not found"}), 404

        return jsonify({"tag": tag.to_dict()}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get tag: {str(e)}"}), 500

@recipe_tag_bp.route('/api/recipe-tags', methods=['POST'])
def create_tag():
    """Create a new recipe tag."""
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

        # Create tag
        tag = Type.RecipeTagModel(
            name=data['name'],
            slug=slug,
            description=data.get('description'),
            color=data.get('color'),
            created_by=user_id
        )

        # Save to database
        result = client.create_tag(tag)

        if result is None:
            return jsonify({"error": "Failed to save tag"}), 500

        return jsonify({
            "message": "Tag created successfully",
            "tag": tag.to_dict()
        }), 201

    except Exception as e:
        return jsonify({"error": f"Failed to create tag: {str(e)}"}), 500

@recipe_tag_bp.route('/api/recipe-tags/<tag_id>', methods=['PUT'])
def update_tag(tag_id):
    """Update an existing tag."""
    try:
        # Parse UUID from string
        try:
            tag_id = UUID(tag_id)
        except ValueError:
            return jsonify({"error": "Invalid tag ID format"}), 400

        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        # Get the existing tag to validate it exists
        existing_tag = client.get_tag_by_id(tag_id)
        if existing_tag is None:
            return jsonify({"error": "Tag not found"}), 404

        # Prepare update data
        update_data = {}

        # Handle basic fields
        if 'name' in data:
            update_data['name'] = data['name']
            # Regenerate slug if name changed
            if data['name'] != existing_tag.name:
                update_data['slug'] = client.generate_slug(data['name'])

        if 'description' in data:
            update_data['description'] = data['description']
        if 'color' in data:
            update_data['color'] = data['color']

        # If no fields to update, return error
        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        # Update the tag
        success = client.update_tag(tag_id, update_data)

        if not success:
            return jsonify({"error": "Failed to update tag"}), 500

        # Get updated tag
        updated_tag = client.get_tag_by_id(tag_id)

        return jsonify({
            "message": "Tag updated successfully",
            "tag": updated_tag.to_dict() if updated_tag else None
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to update tag: {str(e)}"}), 500

@recipe_tag_bp.route('/api/recipe-tags/<tag_id>', methods=['DELETE'])
def delete_tag(tag_id):
    """Delete a tag."""
    try:
        # Parse UUID from string
        try:
            tag_id = UUID(tag_id)
        except ValueError:
            return jsonify({"error": "Invalid tag ID format"}), 400

        # Get the existing tag to validate it exists
        existing_tag = client.get_tag_by_id(tag_id)
        if existing_tag is None:
            return jsonify({"error": "Tag not found"}), 404

        # Check if tag is system tag (prevent deletion)
        if existing_tag.is_system:
            return jsonify({"error": "Cannot delete system tags"}), 403

        # Delete the tag
        success = client.delete_tag(tag_id)

        if not success:
            return jsonify({"error": "Failed to delete tag"}), 500

        return jsonify({
            "message": "Tag deleted successfully",
            "id": str(tag_id)
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to delete tag: {str(e)}"}), 500

@recipe_tag_bp.route('/api/recipe-tags/popular', methods=['GET'])
def get_popular_tags():
    """Get popular tags by usage count."""
    try:
        limit = request.args.get('limit', 10)
        limit = int(limit)

        tags = client.get_popular_tags(limit=limit)
        tag_dicts = [tag.to_dict() for tag in tags]

        return jsonify({
            "tags": tag_dicts,
            "count": len(tag_dicts)
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get popular tags: {str(e)}"}), 500

@recipe_tag_bp.route('/api/recipe-tags/<tag_id>/usage', methods=['POST'])
def increment_tag_usage(tag_id):
    """Increment usage count for a tag."""
    try:
        # Parse UUID from string
        try:
            tag_id = UUID(tag_id)
        except ValueError:
            return jsonify({"error": "Invalid tag ID format"}), 400

        success = client.increment_tag_usage(tag_id)

        if not success:
            return jsonify({"error": "Failed to increment tag usage"}), 500

        return jsonify({"message": "Tag usage incremented successfully"}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to increment tag usage: {str(e)}"}), 500

@recipe_tag_bp.route('/api/recipe-tags/<tag_id>/usage', methods=['DELETE'])
def decrement_tag_usage(tag_id):
    """Decrement usage count for a tag."""
    try:
        # Parse UUID from string
        try:
            tag_id = UUID(tag_id)
        except ValueError:
            return jsonify({"error": "Invalid tag ID format"}), 400

        success = client.decrement_tag_usage(tag_id)

        if not success:
            return jsonify({"error": "Failed to decrement tag usage"}), 500

        return jsonify({"message": "Tag usage decremented successfully"}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to decrement tag usage: {str(e)}"}), 500

@recipe_tag_bp.route('/api/recipe-tags/<tag_id>/recalculate-usage', methods=['POST'])
def recalculate_tag_usage(tag_id):
    """Recalculate usage count for a tag."""
    try:
        # Parse UUID from string
        try:
            tag_id = UUID(tag_id)
        except ValueError:
            return jsonify({"error": "Invalid tag ID format"}), 400

        success = client.recalculate_tag_usage(tag_id)

        if not success:
            return jsonify({"error": "Failed to recalculate tag usage"}), 500

        # Get updated tag
        tag = client.get_tag_by_id(tag_id)

        return jsonify({
            "message": "Tag usage recalculated successfully",
            "tag": tag.to_dict() if tag else None
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to recalculate tag usage: {str(e)}"}), 500

@recipe_tag_bp.route('/api/recipe-tags/recalculate-all-usage', methods=['POST'])
def recalculate_all_tag_usage():
    """Recalculate usage counts for all tags."""
    try:
        tags = client.get_all_tags(include_system=True)
        updated_count = 0

        for tag in tags:
            try:
                success = client.recalculate_tag_usage(tag.id)
                if success:
                    updated_count += 1
            except Exception as e:
                print(f"Failed to recalculate usage for tag {tag.name}: {e}")
                continue

        return jsonify({
            "message": f"Recalculated usage for {updated_count} tags",
            "total_tags": len(tags),
            "updated_tags": updated_count
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to recalculate tag usage: {str(e)}"}), 500