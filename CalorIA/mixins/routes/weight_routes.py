from flask import Blueprint, jsonify, request
from uuid import UUID
from datetime import date
import sys
import os

# Add the parent directory to the Python path to import CalorIA modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the get_db function and types
from CalorIA.backend.app import get_db
from CalorIA import types as Type

# Create the weight routes blueprint
weight_bp = Blueprint('weight', __name__)

@weight_bp.route('/api/user/<uuid:user_id>/weight', methods=['GET'])
def get_user_weight_entries(user_id):
    """Get weight entries for a specific user"""
    try:
        # Get database instance from Flask's g context
        db = get_db()
        
        # Get limit parameter from query string, default to 30
        limit = request.args.get('limit', 30, type=int)
        
        # Fetch user's weight entries
        weight_entries = db.get_user_weight_entries(user_id, limit)
        
        # Convert weight entries to dictionary format for JSON response
        entries_data = []
        for entry in weight_entries:
            entry_dict = entry.to_dict()
            entries_data.append(entry_dict)
            
        return jsonify(entries_data)
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch weight entries: {str(e)}"}), 500

@weight_bp.route('/api/user/<uuid:user_id>/weight', methods=['POST'])
def add_weight_entry(user_id):
    """Add a new weight entry for a user"""
    try:
        # Get database instance from Flask's g context
        db = get_db()
        
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400
        
        # Validate required fields
        if 'weight_kg' not in data:
            return jsonify({"error": "Missing required field: weight_kg"}), 400
            
        # Get date from request or use today
        entry_date = data.get('on_date')
        if entry_date:
            try:
                entry_date = date.fromisoformat(entry_date)
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            entry_date = date.today()
        
        # Create weight entry
        weight_entry = Type.WeightEntry(
            user_id=user_id,
            weight_kg=float(data['weight_kg']),
            on_date=entry_date,
            notes=data.get('notes', '')
        )
        
        # Add to database
        result = db.add_weight_entry(weight_entry)
        
        if result is None:
            return jsonify({"error": "Failed to save weight entry"}), 500
            
        return jsonify({
            "message": "Weight entry added successfully",
            "entry": weight_entry.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({"error": f"Invalid weight value: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to add weight entry: {str(e)}"}), 500