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

# Create the dashboard routes blueprint
dashboard_bp = Blueprint('dashboard', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@dashboard_bp.route('/api/dashboard/<user_id>', methods=['GET'])
def get_dashboard_data(user_id):
    """Get aggregated dashboard data for a user.
    
    Combines data from user profile, meals, activities, weight, and water logs
    into a single endpoint for efficient dashboard rendering.
    
    Args:
        user_id: UUID of the user
        date: (optional query param) Date to get data for, defaults to today
    
    Returns:
        JSON response with aggregated dashboard data
    """
    try:
        # Parse UUID from string
        try:
            user_id = UUID(user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400
            
        # Get date parameter or default to today
        date_str = request.args.get('date')
        if date_str:
            try:
                query_date = date.fromisoformat(date_str)
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            query_date = date.today()
        
        # Initialize response with default values
        dashboard_data = {
            "dailyGoal": 0,
            "consumed": 0,
            "burned": 0,
            "weight": 0,
            "water": 0,
            "macros": {
                "protein": {"grams": 0, "percent": 0},
                "carbs": {"grams": 0, "percent": 0},
                "fat": {"grams": 0, "percent": 0},
                "other": {"grams": 0, "percent": 0}
            },
            "mealTimeline": {
                "breakfast": {
                    "items": [],
                    "totalCalories": 0,
                    "itemCount": 0
                },
                "lunch": {
                    "items": [],
                    "totalCalories": 0,
                    "itemCount": 0
                },
                "dinner": {
                    "items": [],
                    "totalCalories": 0,
                    "itemCount": 0
                },
                "snack": {
                    "items": [],
                    "totalCalories": 0,
                    "itemCount": 0
                }
            }
        }
        
        # 1. Get user data for daily goal
        user = client.get_user_by_id(user_id)
        if user and hasattr(user, 'daily_calorie_goal'):
            dashboard_data["dailyGoal"] = user.daily_calorie_goal
        
        # 2. Get nutritional summary for consumed calories and macros
        nutritional_summary = client.get_user_nutritional_summary(user_id, query_date)
        if nutritional_summary:
            dashboard_data["consumed"] = nutritional_summary.get("total_calories", 0)
            
            # Extract macro information
            macros = nutritional_summary.get("macros", {})
            if macros:
                dashboard_data["macros"]["protein"]["grams"] = round(macros.get("protein_g", 0))
                dashboard_data["macros"]["carbs"]["grams"] = round(macros.get("carbs_g", 0))
                dashboard_data["macros"]["fat"]["grams"] = round(macros.get("fat_g", 0))
            
            # Get macro percentages if available, otherwise calculate them
            if "macro_percentages" in nutritional_summary:
                dashboard_data["macros"]["protein"]["percent"] = round(nutritional_summary["macro_percentages"].get("protein", 0))
                dashboard_data["macros"]["carbs"]["percent"] = round(nutritional_summary["macro_percentages"].get("carbs", 0))
                dashboard_data["macros"]["fat"]["percent"] = round(nutritional_summary["macro_percentages"].get("fat", 0))
            else:
                # Calculate percentages based on caloric values if total calories > 0
                total_calories = dashboard_data["consumed"]
                if total_calories > 0:
                    protein_calories = dashboard_data["macros"]["protein"]["grams"] * 4
                    carbs_calories = dashboard_data["macros"]["carbs"]["grams"] * 4
                    fat_calories = dashboard_data["macros"]["fat"]["grams"] * 9
                    
                    dashboard_data["macros"]["protein"]["percent"] = round((protein_calories / total_calories) * 100)
                    dashboard_data["macros"]["carbs"]["percent"] = round((carbs_calories / total_calories) * 100)
                    dashboard_data["macros"]["fat"]["percent"] = round((fat_calories / total_calories) * 100)

            # Calculate "other" grams by getting the difference between total calories and macro calories
            total_macro_calories = (
                dashboard_data["macros"]["protein"]["grams"] * 4 +
                dashboard_data["macros"]["carbs"]["grams"] * 4 +
                dashboard_data["macros"]["fat"]["grams"] * 9
            )
            other_calories = max(0, dashboard_data["consumed"] - total_macro_calories)
            dashboard_data["macros"]["other"]["grams"] = round(other_calories / 4)  # Assuming 4 calories per gram
            
            # Other percent is always 0 as per requirement
            dashboard_data["macros"]["other"]["percent"] = 0
        
        # 3. Get activity data for burned calories
        burned_calories = client.get_user_daily_activity(user_id, query_date)
        dashboard_data["burned"] = burned_calories
        
        # 4. Get latest weight entry
        weight_entry = client.get_latest_weight_entry(user_id)
        if weight_entry:
            dashboard_data["weight"] = weight_entry.weight_kg
        
        # 5. Get water intake
        water_log = client.get_user_daily_water_log(user_id, query_date)
        if water_log and hasattr(water_log, 'entries'):
            # Calculate total water in liters
            total_ml = sum(entry.amount_ml for entry in water_log.entries)
            dashboard_data["water"] = round(total_ml / 1000, 1)  # Convert ml to liters with 1 decimal
        
        # 6. Get meal timeline data
        meals = client.get_user_daily_meals(user_id, query_date)
        
        # Group meals by meal type
        for meal in meals:
            meal_type = meal.meal_type.value
            
            # Handle case where meal_type might be "snacks" in database but we use "snack" in dashboard
            if meal_type == "snacks":
                meal_type = "snack"
                
            # Process each food item in the meal
            for food_item in meal.food_items:
                # Prepare item details
                item_detail = {
                    "name": food_item.name,
                    "quantity": food_item.portion_size or "1 serving",
                    "calories": food_item.calories
                }
                
                # Add item to appropriate meal type
                dashboard_data["mealTimeline"][meal_type]["items"].append(item_detail)
                dashboard_data["mealTimeline"][meal_type]["totalCalories"] += food_item.calories
            
            # Update item count for this meal type
            dashboard_data["mealTimeline"][meal_type]["itemCount"] = len(dashboard_data["mealTimeline"][meal_type]["items"])
        
        return jsonify(dashboard_data)
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch dashboard data: {str(e)}"}), 500