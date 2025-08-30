from flask import Blueprint, jsonify, request
from uuid import UUID
from werkzeug.local import LocalProxy
import sys
import os

# Add the parent directory to the Python path to import CalorIA modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the get_db function and types
from CalorIA.backend.app import get_client
from CalorIA import types as Type

# Create the meal prep routes blueprint
meal_prep_bp = Blueprint('meal_prep', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@meal_prep_bp.route('/api/meal-prep-profiles', methods=['POST'])
def create_meal_prep_profile():
    """Create a new meal prep profile for a user"""
    try:
        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        # Validate required fields
        if 'user_id' not in data:
            return jsonify({"error": "Missing required field: user_id"}), 400

        if 'profile_name' not in data:
            return jsonify({"error": "Missing required field: profile_name"}), 400

        # Parse UUID from string
        try:
            user_id = UUID(data['user_id'])
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Create MealPrepProfile instance
        try:
            profile = Type.MealPrepProfile(
                user_id=user_id,
                profile_name=data['profile_name'],
                goal=data.get('goal'),
                weight=float(data['weight']) if data.get('weight') else None,
                weight_unit=data.get('weight_unit'),
                height=float(data['height']) if data.get('height') else None,
                height_feet=int(data['height_feet']) if data.get('height_feet') else None,
                height_inches=int(data['height_inches']) if data.get('height_inches') else None,
                height_unit=data.get('height_unit'),
                age=int(data['age']) if data.get('age') else None,
                activity_level=data.get('activity_level'),
                meals_per_day=data.get('meals_per_day'),
                allergies=data.get('allergies', []),
                other_allergy=data.get('other_allergy'),
                intolerances=data.get('intolerances', []),
                dietary_preference=data.get('dietary_preference'),
                ingredient_preferences=data.get('ingredient_preferences', {}),
                excluded_ingredients=data.get('excluded_ingredients', []),
                loved_meals=data.get('loved_meals', []),
                hated_meals=data.get('hated_meals', []),
                cooking_time=data.get('cooking_time'),
                batch_cooking=data.get('batch_cooking'),
                kitchen_equipment=data.get('kitchen_equipment', []),
                skill_level=data.get('skill_level'),
                meal_times=Type.MealTimes(
                    breakfast=data.get('meal_times', {}).get('breakfast'),
                    lunch=data.get('meal_times', {}).get('lunch'),
                    dinner=data.get('meal_times', {}).get('dinner')
                ),
                want_snacks=data.get('want_snacks'),
                snack_count=int(data['snack_count']) if data.get('snack_count') else None,
                timing_rules=data.get('timing_rules', []),
                calculate_calories=data.get('calculate_calories'),
                target_calories=int(data['target_calories']) if data.get('target_calories') else None,
                macro_preference=Type.MacroPreference(
                    protein=int(data.get('macro_preference', {}).get('protein', 125)),
                    fat=int(data.get('macro_preference', {}).get('fat', 55)),
                    carbs=int(data.get('macro_preference', {}).get('carbs', 200))
                ),
                weekly_budget=float(data['weekly_budget']) if data.get('weekly_budget') else None,
                budget_preference=int(data.get('budget_preference', 50)),
                shopping_format=data.get('shopping_format'),
                supplements=data.get('supplements', []),
                medications=data.get('medications')
            )
        except (ValueError, TypeError) as e:
            return jsonify({"error": f"Invalid data format: {str(e)}"}), 400

        # Add to database
        result = client.add_meal_prep_profile(profile)

        if result is None:
            return jsonify({"error": "Failed to save meal prep profile"}), 500

        return jsonify({
            "message": "Meal prep profile created successfully",
            "profile": profile.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({"error": f"Invalid value: {str(e)}"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to create meal prep profile: {str(e)}"}), 500

@meal_prep_bp.route('/api/meal-prep-profiles', methods=['GET'])
def get_user_meal_prep_profiles():
    """Get all meal prep profiles for a user"""
    try:
        # Get user_id from query parameters
        user_id_str = request.args.get('user_id')
        if not user_id_str:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        # Parse UUID from string
        try:
            user_id = UUID(user_id_str)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Get include_inactive parameter
        include_inactive = request.args.get('include_inactive', 'false').lower() == 'true'

        # Get profiles from database
        profiles = client.get_user_meal_prep_profiles(user_id, include_inactive)

        return jsonify({
            "profiles": [profile.to_dict() for profile in profiles]
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get meal prep profiles: {str(e)}"}), 500

@meal_prep_bp.route('/api/meal-prep-profiles/<profile_id>', methods=['GET'])
def get_meal_prep_profile(profile_id):
    """Get a specific meal prep profile by ID"""
    try:
        # Parse UUID from string
        try:
            profile_id = UUID(profile_id)
        except ValueError:
            return jsonify({"error": "Invalid profile ID format"}), 400

        # Get profile from database
        profile = client.get_meal_prep_profile_by_id(profile_id)
        if profile is None:
            return jsonify({"error": "Meal prep profile not found"}), 404

        return jsonify({
            "profile": profile.to_dict()
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get meal prep profile: {str(e)}"}), 500

@meal_prep_bp.route('/api/meal-prep-profiles/<profile_id>', methods=['PUT'])
def update_meal_prep_profile(profile_id):
    """Update an existing meal prep profile"""
    try:
        # Parse UUID from string
        try:
            profile_id = UUID(profile_id)
        except ValueError:
            return jsonify({"error": "Invalid profile ID format"}), 400

        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        # Get the existing profile to validate it exists
        existing_profile = client.get_meal_prep_profile_by_id(profile_id)
        if existing_profile is None:
            return jsonify({"error": "Meal prep profile not found"}), 404

        # Prepare update data
        update_data = {}

        # Handle basic fields
        if 'profile_name' in data:
            update_data['profile_name'] = data['profile_name']
        if 'goal' in data:
            update_data['goal'] = data['goal']
        if 'weight' in data:
            update_data['weight'] = float(data['weight']) if data['weight'] else None
        if 'weight_unit' in data:
            update_data['weight_unit'] = data['weight_unit']
        if 'height' in data:
            update_data['height'] = float(data['height']) if data['height'] else None
        if 'height_feet' in data:
            update_data['height_feet'] = int(data['height_feet']) if data['height_feet'] else None
        if 'height_inches' in data:
            update_data['height_inches'] = int(data['height_inches']) if data['height_inches'] else None
        if 'height_unit' in data:
            update_data['height_unit'] = data['height_unit']
        if 'age' in data:
            update_data['age'] = int(data['age']) if data['age'] else None
        if 'activity_level' in data:
            update_data['activity_level'] = data['activity_level']
        if 'meals_per_day' in data:
            update_data['meals_per_day'] = data['meals_per_day']

        # Handle array fields
        if 'allergies' in data:
            update_data['allergies'] = data['allergies']
        if 'intolerances' in data:
            update_data['intolerances'] = data['intolerances']
        if 'excluded_ingredients' in data:
            update_data['excluded_ingredients'] = data['excluded_ingredients']
        if 'loved_meals' in data:
            update_data['loved_meals'] = data['loved_meals']
        if 'hated_meals' in data:
            update_data['hated_meals'] = data['hated_meals']
        if 'kitchen_equipment' in data:
            update_data['kitchen_equipment'] = data['kitchen_equipment']
        if 'timing_rules' in data:
            update_data['timing_rules'] = data['timing_rules']
        if 'supplements' in data:
            update_data['supplements'] = data['supplements']

        # Handle object fields
        if 'ingredient_preferences' in data:
            update_data['ingredient_preferences'] = data['ingredient_preferences']
        if 'meal_times' in data:
            update_data['meal_times'] = data['meal_times']
        if 'macro_preference' in data:
            update_data['macro_preference'] = data['macro_preference']

        # Handle other fields
        if 'other_allergy' in data:
            update_data['other_allergy'] = data['other_allergy']
        if 'dietary_preference' in data:
            update_data['dietary_preference'] = data['dietary_preference']
        if 'cooking_time' in data:
            update_data['cooking_time'] = data['cooking_time']
        if 'batch_cooking' in data:
            update_data['batch_cooking'] = data['batch_cooking']
        if 'skill_level' in data:
            update_data['skill_level'] = data['skill_level']
        if 'want_snacks' in data:
            update_data['want_snacks'] = data['want_snacks']
        if 'snack_count' in data:
            update_data['snack_count'] = int(data['snack_count']) if data['snack_count'] else None
        if 'calculate_calories' in data:
            update_data['calculate_calories'] = data['calculate_calories']
        if 'target_calories' in data:
            update_data['target_calories'] = int(data['target_calories']) if data['target_calories'] else None
        if 'weekly_budget' in data:
            update_data['weekly_budget'] = float(data['weekly_budget']) if data['weekly_budget'] else None
        if 'budget_preference' in data:
            update_data['budget_preference'] = int(data['budget_preference'])
        if 'shopping_format' in data:
            update_data['shopping_format'] = data['shopping_format']
        if 'medications' in data:
            update_data['medications'] = data['medications']

        # If no fields to update, return error
        if not update_data:
            return jsonify({"error": "No valid fields to update"}), 400

        # Update the profile
        success = client.update_meal_prep_profile(profile_id, update_data)

        if not success:
            return jsonify({"error": "Failed to update meal prep profile"}), 500

        # Get updated profile
        updated_profile = client.get_meal_prep_profile_by_id(profile_id)

        return jsonify({
            "message": "Meal prep profile updated successfully",
            "profile": updated_profile.to_dict() if updated_profile else None
        })

    except Exception as e:
        return jsonify({"error": f"Failed to update meal prep profile: {str(e)}"}), 500

@meal_prep_bp.route('/api/meal-prep-profiles/<profile_id>', methods=['DELETE'])
def delete_meal_prep_profile(profile_id):
    """Delete a meal prep profile"""
    try:
        # Parse UUID from string
        try:
            profile_id = UUID(profile_id)
        except ValueError:
            return jsonify({"error": "Invalid profile ID format"}), 400

        # Get the existing profile to validate it exists
        existing_profile = client.get_meal_prep_profile_by_id(profile_id)
        if existing_profile is None:
            return jsonify({"error": "Meal prep profile not found"}), 404

        # Delete the profile
        success = client.delete_meal_prep_profile(profile_id)

        if not success:
            return jsonify({"error": "Failed to delete meal prep profile"}), 500

        return jsonify({
            "message": "Meal prep profile deleted successfully",
            "id": str(profile_id)
        })

    except Exception as e:
        return jsonify({"error": f"Failed to delete meal prep profile: {str(e)}"}), 500

@meal_prep_bp.route('/api/meal-prep-profiles/<profile_id>/activate', methods=['POST'])
def activate_meal_prep_profile(profile_id):
    """Set a meal prep profile as active for the user"""
    try:
        # Parse UUID from string
        try:
            profile_id = UUID(profile_id)
        except ValueError:
            return jsonify({"error": "Invalid profile ID format"}), 400

        # Get the profile to get user_id
        profile = client.get_meal_prep_profile_by_id(profile_id)
        if profile is None:
            return jsonify({"error": "Meal prep profile not found"}), 404

        # Set as active
        success = client.set_active_meal_prep_profile(profile_id, profile.user_id)

        if not success:
            return jsonify({"error": "Failed to activate meal prep profile"}), 500

        return jsonify({
            "message": "Meal prep profile activated successfully",
            "profile_id": str(profile_id)
        })

    except Exception as e:
        return jsonify({"error": f"Failed to activate meal prep profile: {str(e)}"}), 500

@meal_prep_bp.route('/api/meal-prep-profiles/active', methods=['GET'])
def get_active_meal_prep_profile():
    """Get the currently active meal prep profile for a user"""
    try:
        # Get user_id from query parameters
        user_id_str = request.args.get('user_id')
        if not user_id_str:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        # Parse UUID from string
        try:
            user_id = UUID(user_id_str)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Get active profile
        profile = client.get_active_meal_prep_profile(user_id)

        if profile is None:
            return jsonify({"message": "No active meal prep profile found"}), 404

        return jsonify({
            "profile": profile.to_dict()
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get active meal prep profile: {str(e)}"}), 500

@meal_prep_bp.route('/api/meal-prep-profiles/count', methods=['GET'])
def get_meal_prep_profile_count():
    """Get the count of meal prep profiles for a user"""
    try:
        # Get user_id from query parameters
        user_id_str = request.args.get('user_id')
        if not user_id_str:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        # Parse UUID from string
        try:
            user_id = UUID(user_id_str)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Get count
        count = client.get_meal_prep_profile_count(user_id)

        return jsonify({
            "count": count
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get meal prep profile count: {str(e)}"}), 500