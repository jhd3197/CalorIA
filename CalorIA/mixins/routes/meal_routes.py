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

# Create the meal routes blueprint
meal_bp = Blueprint('meal', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@meal_bp.route('/api/meals', methods=['POST'])
def add_meal_entry():
    """Add a new meal entry for a user"""
    try:
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400
        
        # Validate required fields
        if 'user_id' not in data:
            return jsonify({"error": "Missing required field: user_id"}), 400
            
        if 'meal_type' not in data:
            return jsonify({"error": "Missing required field: meal_type"}), 400
            
        if 'food_items' not in data or not isinstance(data['food_items'], list):
            return jsonify({"error": "Missing or invalid required field: food_items (must be an array)"}), 400
        
        # Parse UUID from string
        try:
            user_id = UUID(data['user_id'])
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400
            
        # Get date from request or use today
        meal_date = data.get('meal_date')
        if meal_date:
            try:
                meal_date = date.fromisoformat(meal_date)
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            meal_date = date.today()
        
        # Process meal items
        food_items = []
        for item_data in data['food_items']:
            try:
                food_item = Type.FoodItem(
                    name=item_data['name'],
                    calories=item_data.get('calories', 100),  # FoodItem requires calories > 0
                    protein_g=item_data.get('protein_g', 0),
                    carbs_g=item_data.get('carbs_g', 0),
                    fat_g=item_data.get('fat_g', 0),
                    portion_size=f"{item_data.get('quantity', 1.0)} {item_data.get('unit', 'serving')}"
                )
                food_items.append(food_item)
            except KeyError as e:
                return jsonify({"error": f"Missing required field in meal item: {str(e)}"}), 400
        
        # Create meal entry with the provided date
        from datetime import datetime, time, timezone
        
        # Create a datetime object for the meal using the provided date and current time
        # We'll use the server's time but with the user's date
        meal_datetime = datetime.combine(meal_date, datetime.now().time())
        
        meal_entry = Type.Meal(
            user_id=user_id,
            meal_type=data['meal_type'],
            food_items=food_items,
            notes=data.get('notes', ''),
            timestamp=meal_datetime
        )
        
        # Add to database
        result = client.add_meal_entry(meal_entry)
        
        if result is None:
            return jsonify({"error": "Failed to save meal entry"}), 500
            
        return jsonify({
            "message": "Meal entry added successfully",
            "meal": meal_entry.to_dict()
        }), 201
        
    except ValueError as e:
        return jsonify({"error": f"Invalid value: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to add meal entry: {str(e)}"}), 500

@meal_bp.route('/api/meals/<meal_id>', methods=['PUT'])
def update_meal_entry(meal_id):
    """Update an existing meal entry"""
    try:
        # Parse UUID from string
        try:
            meal_id = UUID(meal_id)
        except ValueError:
            return jsonify({"error": "Invalid meal ID format"}), 400
        
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400
        
        # Get the existing meal to validate it exists
        existing_meal = client.get_meal_by_id(meal_id)
        if existing_meal is None:
            return jsonify({"error": "Meal not found"}), 404
        
        # Prepare update data
        update_data = {}
        
        # Handle meal_type update
        if 'meal_type' in data:
            update_data['meal_type'] = data['meal_type']
        
        # Handle meal_date update
        if 'meal_date' in data:
            try:
                # Store as ISO format string for MongoDB
                update_data['meal_date'] = date.fromisoformat(data['meal_date']).isoformat()
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        
        # Handle meal_time update
        if 'meal_time' in data:
            update_data['meal_time'] = data['meal_time']
        
        # Handle notes update
        if 'notes' in data:
            update_data['notes'] = data['notes']
        
        # Handle food_items update
        if 'food_items' in data and isinstance(data['food_items'], list):
            # Process food items
            try:
                food_items = []
                for item_data in data['food_items']:
                    food_item = Type.FoodItem(
                        name=item_data['name'],
                        calories=item_data.get('calories', 100),  # FoodItem requires calories > 0
                        protein_g=item_data.get('protein_g', 0),
                        carbs_g=item_data.get('carbs_g', 0),
                        fat_g=item_data.get('fat_g', 0),
                        portion_size=f"{item_data.get('quantity', 1.0)} {item_data.get('unit', 'serving')}"
                    )
                    food_items.append(food_item)
                
                # Convert food items to dictionaries for MongoDB update
                update_data['food_items'] = [item.to_dict() for item in food_items]
            except KeyError as e:
                return jsonify({"error": f"Missing required field in meal item: {str(e)}"}), 400
        
        # If no fields to update, return error
        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400
        
        # Update the meal
        success = client.update_meal(meal_id, update_data)
        
        if not success:
            return jsonify({"error": "Failed to update meal"}), 500
        
        # Get updated meal
        updated_meal = client.get_meal_by_id(meal_id)
        
        return jsonify({
            "message": "Meal updated successfully",
            "meal": updated_meal.to_dict() if updated_meal else None
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to update meal: {str(e)}"}), 500

@meal_bp.route('/api/meals/<meal_id>', methods=['DELETE'])
def delete_meal_entry(meal_id):
    """Delete a meal entry"""
    try:
        # Parse UUID from string
        try:
            meal_id = UUID(meal_id)
        except ValueError:
            return jsonify({"error": "Invalid meal ID format"}), 400
        
        # Get the existing meal to validate it exists
        existing_meal = client.get_meal_by_id(meal_id)
        if existing_meal is None:
            return jsonify({"error": "Meal not found"}), 404
        
        # Delete the meal
        success = client.delete_meal(meal_id)
        
        if not success:
            return jsonify({"error": "Failed to delete meal"}), 500
        
        return jsonify({
            "message": "Meal deleted successfully",
            "id": str(meal_id)
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to delete meal: {str(e)}"}), 500