from flask import Blueprint, jsonify, request
from uuid import UUID
from datetime import datetime, date
from werkzeug.local import LocalProxy
import sys
import os

# Add the parent directory to the Python path to import CalorIA modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the get_db function from the main app
from CalorIA.backend.app import get_client

# Create the meal routes blueprint
meal_bp = Blueprint('meal', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@meal_bp.route('/api/user/<uuid:user_id>/meals', methods=['GET'])
def get_user_meals(user_id):
    """Get meals for a specific user and date"""
    try:
        # Get date parameter from query string, default to today
        date_str = request.args.get('date')
        if date_str:
            try:
                log_date = datetime.fromisoformat(date_str).date()
            except ValueError:
                return jsonify({"error": "Invalid date format. Use YYYY-MM-DD"}), 400
        else:
            log_date = date.today()
        
        # Fetch user's daily log
        daily_log = client.get_user_daily_log(user_id, log_date)
        
        if daily_log is None:
            # Return empty meals list if no log found
            return jsonify([])
            
        # Convert meals to dictionary format for JSON response
        meals_data = []
        for meal in daily_log.meals:
            meal_dict = meal.to_dict()
            meals_data.append(meal_dict)
            
        return jsonify(meals_data)
        
    except Exception as e:
        return jsonify({"error": f"Failed to fetch meals: {str(e)}"}), 500