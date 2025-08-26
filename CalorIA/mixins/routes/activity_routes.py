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

# Create the activity routes blueprint
activity_bp = Blueprint('activity', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@activity_bp.route('/api/activity/<user_id>', methods=['GET'])
def get_activity_entries(user_id):
    """Get activity entries for a user.
    
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
        skip = request.args.get('skip', 0, type=int)
        limit = request.args.get('limit', type=int)
        
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
        
        # Get activity entries
        entries = client.get_user_activity_entries(user_id, start_date, end_date, skip, limit)
        
        # Convert entries to dictionaries for JSON response
        entries_dict = [entry.to_dict() for entry in entries]
        
        return jsonify({
            "user_id": str(user_id),
            "entries": entries_dict,
            "count": len(entries_dict)
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch activity entries: {str(e)}"}), 500

@activity_bp.route('/api/activity', methods=['POST'])
def add_activity_entry():
    """Add a new activity entry for a user"""
    try:
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400
        
        # Validate required fields
        if 'user_id' not in data:
            return jsonify({"error": "Missing required field: user_id"}), 400
            
        if 'activity_name' not in data:
            return jsonify({"error": "Missing required field: activity_name"}), 400
            
        if 'duration_minutes' not in data:
            return jsonify({"error": "Missing required field: duration_minutes"}), 400
            
        if 'calories_burned' not in data:
            return jsonify({"error": "Missing required field: calories_burned"}), 400
        
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
        
        # Validate numeric fields
        try:
            duration_minutes = int(data['duration_minutes'])
            if duration_minutes <= 0:
                return jsonify({"error": "Duration must be a positive integer"}), 400
        except ValueError:
            return jsonify({"error": "Duration must be a valid integer"}), 400
            
        try:
            calories_burned = int(data['calories_burned'])
            if calories_burned <= 0:
                return jsonify({"error": "Calories burned must be a positive integer"}), 400
        except ValueError:
            return jsonify({"error": "Calories burned must be a valid integer"}), 400
        
        # Create activity entry
        activity_entry = Type.ActivityEntry(
            user_id=user_id,
            activity_name=data['activity_name'],
            duration_minutes=duration_minutes,
            calories_burned=calories_burned,
            on_date=entry_date,
            notes=data.get('notes', '')
        )
        
        # Add to database
        result = client.add_activity_entry(activity_entry)
        
        if result is None:
            return jsonify({"error": "Failed to save activity entry"}), 500
            
        return jsonify({
            "message": "Activity entry added successfully",
            "entry": activity_entry.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({"error": f"Invalid value: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to add activity entry: {str(e)}"}), 500

@activity_bp.route('/api/activity/<entry_id>', methods=['PUT'])
def update_activity_entry(entry_id):
    """Update an existing activity entry"""
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
        existing_entry = client.get_activity_entry_by_id(entry_id)
        if existing_entry is None:
            return jsonify({"error": "Activity entry not found"}), 404
        
        # Prepare update data
        update_data = {}
        
        # Handle activity_name update
        if 'activity_name' in data:
            update_data['activity_name'] = data['activity_name']
        
        # Handle duration_minutes update
        if 'duration_minutes' in data:
            try:
                duration_minutes = int(data['duration_minutes'])
                if duration_minutes <= 0:
                    return jsonify({"error": "Duration must be positive"}), 400
                update_data['duration_minutes'] = duration_minutes
            except ValueError:
                return jsonify({"error": "Invalid duration value"}), 400
        
        # Handle calories_burned update
        if 'calories_burned' in data:
            try:
                calories_burned = int(data['calories_burned'])
                if calories_burned <= 0:
                    return jsonify({"error": "Calories burned must be positive"}), 400
                update_data['calories_burned'] = calories_burned
            except ValueError:
                return jsonify({"error": "Invalid calories burned value"}), 400
        
        # Handle on_date update
        if 'on_date' in data:
            try:
                # Store as ISO format string for MongoDB
                update_data['on_date'] = date.fromisoformat(data['on_date']).isoformat()
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        # Handle notes update
        if 'notes' in data:
            update_data['notes'] = data['notes']
        
        # If no fields to update, return error
        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400
        
        # Update the entry
        success = client.update_activity_entry(entry_id, update_data)
        
        if not success:
            return jsonify({"error": "Failed to update activity entry"}), 500
        
        # Get updated entry
        updated_entry = client.get_activity_entry_by_id(entry_id)
        
        return jsonify({
            "message": "Activity entry updated successfully",
            "entry": updated_entry.to_dict() if updated_entry else None
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to update activity entry: {str(e)}"}), 500

@activity_bp.route('/api/activity/<entry_id>', methods=['DELETE'])
def delete_activity_entry(entry_id):
    """Delete an activity entry"""
    try:
        # Parse UUID from string
        try:
            entry_id = UUID(entry_id)
        except ValueError:
            return jsonify({"error": "Invalid entry ID format"}), 400
        
        # Get the existing entry to validate it exists
        existing_entry = client.get_activity_entry_by_id(entry_id)
        if existing_entry is None:
            return jsonify({"error": "Activity entry not found"}), 404
        
        # Delete the entry
        success = client.delete_activity_entry(entry_id)
        
        if not success:
            return jsonify({"error": "Failed to delete activity entry"}), 500
        
        return jsonify({
            "message": "Activity entry deleted successfully",
            "id": str(entry_id)
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to delete activity entry: {str(e)}"}), 500