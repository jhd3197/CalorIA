from flask import Blueprint, jsonify, request
from uuid import UUID
from datetime import date
from werkzeug.local import LocalProxy
import sys
import os

# Add the parent directory to the Python path to import CalorIA modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the get_db function and types
from CalorIA.backend.app import get_client
from CalorIA import types as Type

# Create the weight routes blueprint
weight_bp = Blueprint('weight', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@weight_bp.route('/api/weight/<user_id>', methods=['GET'])
def get_weight_history(user_id):
    """Get weight history for a user.
    
    Supports pagination and date range filtering.
    """
    try:
        # Parse UUID from string
        try:
            user_id = UUID(user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400
            
        # Get query parameters
        start_date_str = request.args.get('start_date')
        end_date_str = request.args.get('end_date')
        days = request.args.get('days')
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', type=int)
        
        # If days parameter is provided, get weight history summary
        if days is not None:
            try:
                days = int(days)
                if days <= 0:
                    return jsonify({"error": "Days parameter must be a positive integer"}), 400
            except ValueError:
                return jsonify({"error": "Days parameter must be a valid integer"}), 400
                
            history = client.get_user_weight_history(user_id, days)
            return jsonify({"history": history})
        
        # Parse date parameters if provided
        start_date = None
        end_date = None
        
        if start_date_str:
            try:
                start_date = date.fromisoformat(start_date_str)
            except ValueError:
                return jsonify({"error": "Invalid start_date format. Use YYYY-MM-DD"}), 400
                
        if end_date_str:
            try:
                end_date = date.fromisoformat(end_date_str)
            except ValueError:
                return jsonify({"error": "Invalid end_date format. Use YYYY-MM-DD"}), 400
        
        # Get weight entries
        entries = client.get_user_weight_entries(user_id, start_date, end_date, skip, limit)
        
        # Convert entries to dictionaries for JSON response
        entries_dict = [entry.to_dict() for entry in entries]
        
        return jsonify({
            "user_id": str(user_id),
            "entries": entries_dict,
            "count": len(entries_dict)
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch weight history: {str(e)}"}), 500

@weight_bp.route('/api/weight', methods=['POST'])
def add_weight_entry():
    """Add a new weight entry for a user"""
    try:
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400
        
        # Validate required fields
        if 'user_id' not in data:
            return jsonify({"error": "Missing required field: user_id"}), 400

        if 'weight' not in data:
            return jsonify({"error": "Missing required field: weight"}), 400
        
        # Parse UUID from string
        try:
            user_id = UUID(data['user_id'])
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400
            
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
            weight=float(data['weight']),
            unit=data.get('unit', 'kg'),
            on_date=entry_date
        )
        
        # Add to database
        result = client.add_weight_entry(weight_entry)
        
        if result is None:
            return jsonify({"error": "Failed to save weight entry"}), 500
            
        return jsonify({
            "message": "Weight entry added successfully",
            "entry": weight_entry.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({"error": f"Invalid value: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to add weight entry: {str(e)}"}), 500

@weight_bp.route('/api/weight/<entry_id>', methods=['PUT'])
def update_weight_entry(entry_id):
    """Update an existing weight entry"""
    try:
        # Parse UUID from string
        try:
            entry_id = UUID(entry_id)
        except ValueError:
            return jsonify({"error": "Invalid entry ID format"}), 400
        
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400
        
        # Get the existing entry to validate it exists
        existing_entry = client.get_weight_entry_by_id(entry_id)
        if existing_entry is None:
            return jsonify({"error": "Weight entry not found"}), 404
        
        # Prepare update data
        update_data = {}
        
        # Handle weight update
        if 'weight' in data:
            try:
                update_data['weight'] = float(data['weight'])
                if update_data['weight'] <= 0:
                    return jsonify({"error": "Weight must be positive"}), 400
            except ValueError:
                return jsonify({"error": "Invalid weight value"}), 400

        # Handle unit update
        if 'unit' in data:
            update_data['unit'] = data['unit']
        
        # Handle on_date update
        if 'on_date' in data:
            try:
                # Store as ISO format string for MongoDB
                update_data['on_date'] = date.fromisoformat(data['on_date']).isoformat()
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        
        # If no fields to update, return error
        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400
        
        # Update the entry
        success = client.update_weight_entry(entry_id, update_data)
        
        if not success:
            return jsonify({"error": "Failed to update weight entry"}), 500
        
        # Get updated entry
        updated_entry = client.get_weight_entry_by_id(entry_id)
        
        return jsonify({
            "message": "Weight entry updated successfully",
            "entry": updated_entry.to_dict() if updated_entry else None
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to update weight entry: {str(e)}"}), 500

@weight_bp.route('/api/weight/<entry_id>', methods=['DELETE'])
def delete_weight_entry(entry_id):
    """Delete a weight entry"""
    try:
        # Parse UUID from string
        try:
            entry_id = UUID(entry_id)
        except ValueError:
            return jsonify({"error": "Invalid entry ID format"}), 400
        
        # Get the existing entry to validate it exists
        existing_entry = client.get_weight_entry_by_id(entry_id)
        if existing_entry is None:
            return jsonify({"error": "Weight entry not found"}), 404
        
        # Delete the entry
        success = client.delete_weight_entry(entry_id)
        
        if not success:
            return jsonify({"error": "Failed to delete weight entry"}), 500
        
        return jsonify({
            "message": "Weight entry deleted successfully",
            "id": str(entry_id)
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to delete weight entry: {str(e)}"}), 500