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
            
        # Convert user to dictionary for JSON response
        user_data = user.to_dict()
        return jsonify(user_data)
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch user: {str(e)}"}), 500