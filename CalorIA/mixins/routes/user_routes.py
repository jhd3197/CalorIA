from flask import Blueprint, jsonify, g
from uuid import UUID
import sys
import os

# Add the parent directory to the Python path to import CalorIA modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the get_client function from the main app
from CalorIA.backend.app import get_client

# Create the user routes blueprint
user_bp = Blueprint('user', __name__)

@user_bp.route('/api/user/<uuid:user_id>', methods=['GET'])
def get_user(user_id):
    """Get user data by user_id"""
    try:
        # Get client instance from Flask's g context
        client = get_client()
        
        # Fetch user from database
        user = client.get_user_by_id(user_id)
        
        if user is None:
            return jsonify({"error": "User not found"}), 404
            
        # Convert user to dictionary for JSON response, excluding password
        user_data = user.to_dict()
        if 'password_hash' in user_data:
            del user_data['password_hash']
        return jsonify(user_data)
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch user: {str(e)}"}), 500

@user_bp.route('/api/user/<uuid:user_id>/favorites', methods=['GET'])
def get_user_favorites(user_id):
    """Get user's favorite recipe IDs"""
    try:
        client = get_client()
        favorite_ids = client.get_user_favorite_recipe_ids(user_id)
        return jsonify({"favorite_recipe_ids": favorite_ids}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get favorites: {str(e)}"}), 500

@user_bp.route('/api/user/<uuid:user_id>/favorites/<recipe_id>', methods=['POST'])
def add_favorite(user_id, recipe_id):
    """Add a recipe to user's favorites"""
    try:
        client = get_client()
        success = client.add_favorite_recipe(user_id, recipe_id)

        if success:
            return jsonify({"message": "Recipe added to favorites"}), 200
        else:
            return jsonify({"error": "Failed to add favorite"}), 500

    except Exception as e:
        return jsonify({"error": f"Failed to add favorite: {str(e)}"}), 500

@user_bp.route('/api/user/<uuid:user_id>/favorites/<recipe_id>', methods=['DELETE'])
def remove_favorite(user_id, recipe_id):
    """Remove a recipe from user's favorites"""
    try:
        client = get_client()
        success = client.remove_favorite_recipe(user_id, recipe_id)

        if success:
            return jsonify({"message": "Recipe removed from favorites"}), 200
        else:
            return jsonify({"error": "Failed to remove favorite"}), 500

    except Exception as e:
        return jsonify({"error": f"Failed to remove favorite: {str(e)}"}), 500

@user_bp.route('/api/user/<uuid:user_id>/favorites/<recipe_id>', methods=['GET'])
def check_favorite(user_id, recipe_id):
    """Check if a recipe is favorited by user"""
    try:
        client = get_client()
        is_favorited = client.is_recipe_favorited(user_id, recipe_id)
        return jsonify({"is_favorited": is_favorited}), 200

    except Exception as e:
        return jsonify({"error": f"Failed to check favorite: {str(e)}"}), 500