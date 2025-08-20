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

# Create the water routes blueprint
water_bp = Blueprint('water', __name__)

@water_bp.route('/api/user/<uuid:user_id>/water', methods=['GET'])
def get_user_water_log(user_id):
    """Get daily water log for a specific user and date"""
    try:
        # Get database instance from Flask's g context
        db = get_db()
        
        # Get date parameter from query string, default to today
        date_str = request.args.get('date')
        if date_str:
            try:
                log_date = date.fromisoformat(date_str)
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            log_date = date.today()
        
        # Fetch user's daily water log
        water_log = db.get_user_daily_water_log(user_id, log_date)
        
        if water_log is None:
            # Return empty log structure if no entries found
            return jsonify({
                "user_id": str(user_id),
                "log_date": log_date.isoformat(),
                "entries": [],
                "total_ml": 0
            })
            
        # Convert water log to dictionary format for JSON response
        water_log_dict = water_log.to_dict()
        return jsonify(water_log_dict)
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch water log: {str(e)}"}), 500

@water_bp.route('/api/user/<uuid:user_id>/water', methods=['POST'])
def add_water_entry(user_id):
    """Add a new water entry for a user"""
    try:
        # Get database instance from Flask's g context
        db = get_db()
        
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400
        
        # Validate required fields
        if 'amount_ml' not in data:
            return jsonify({"error": "Missing required field: amount_ml"}), 400
            
        # Get date from request or use today
        entry_date = data.get('on_date')
        if entry_date:
            try:
                entry_date = date.fromisoformat(entry_date)
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            entry_date = date.today()
        
        # Create water entry
        water_entry = Type.WaterEntry(
            user_id=user_id,
            amount_ml=int(data['amount_ml']),
            on_date=entry_date,
            notes=data.get('notes', '')
        )
        
        # Add to database
        result = db.add_water_entry(water_entry)
        
        if result is None:
            return jsonify({"error": "Failed to save water entry"}), 500
            
        return jsonify({
            "message": "Water entry added successfully",
            "entry": water_entry.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({"error": f"Invalid amount value: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to add water entry: {str(e)}"}), 500