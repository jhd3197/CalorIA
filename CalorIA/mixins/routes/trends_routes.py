from flask import Blueprint, jsonify, request
from uuid import UUID
from datetime import date, timedelta
from werkzeug.local import LocalProxy
import sys
import os

# Add the parent directory to the Python path to import CalorIA modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

# Import the get_db function and types
from CalorIA.backend.app import get_client
from CalorIA import types as Type

# Create the trends routes blueprint
trends_bp = Blueprint('trends', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@trends_bp.route('/api/trends/weight/<user_id>', methods=['GET'])
def get_weight_trends(user_id):
    """Get weight trend data for a user over a specified period.

    Query parameters:
        - period: 'week', 'month', 'year' (default: 'month')
        - days: specific number of days (overrides period)
    """
    try:
        # Parse UUID from string
        try:
            user_id = UUID(user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Get query parameters
        period = request.args.get('period', 'month')
        days_param = request.args.get('days')

        # Determine number of days based on period or direct parameter
        if days_param:
            try:
                days = int(days_param)
                if days <= 0:
                    return jsonify({"error": "Days parameter must be a positive integer"}), 400
            except ValueError:
                return jsonify({"error": "Days parameter must be a valid integer"}), 400
        else:
            # Map period to days
            period_days = {
                'week': 7,
                'month': 30,
                'year': 365
            }
            days = period_days.get(period, 30)

        # Get weight trend data
        weight_trends = client.get_user_weight_trend(user_id, period)

        # Format the data for frontend charts
        chart_data = {
            "labels": [],
            "datasets": [
                {
                    "label": "Weight",
                    "data": [],
                    "borderColor": "#22C55E",
                    "backgroundColor": "rgba(34, 197, 94, 0.05)",
                    "borderWidth": 2,
                    "tension": 0.3,
                    "fill": True
                },
                {
                    "label": "Goal",
                    "data": [],
                    "borderColor": "#9CA3AF",
                    "borderWidth": 1,
                    "borderDash": [5, 5],
                    "pointRadius": 0
                }
            ]
        }

        # Get user data for goal weight
        user = client.get_user_by_id(user_id)
        goal_weight = user.target_weight if user and hasattr(user, 'target_weight') else None

        # Process trend data
        for entry in weight_trends:
            # Format date for display
            entry_date = date.fromisoformat(entry['date'])
            chart_data["labels"].append(entry_date.strftime('%b %d'))

            # Add weight data
            chart_data["datasets"][0]["data"].append(entry['weight_kg'])

            # Add goal weight if available
            if goal_weight:
                chart_data["datasets"][1]["data"].append(goal_weight)
            else:
                chart_data["datasets"][1]["data"].append(None)

        return jsonify({
            "success": True,
            "data": chart_data,
            "period": period,
            "days": days,
            "goal_weight": goal_weight
        })

    except Exception as e:
        return jsonify({"error": f"Failed to fetch weight trends: {str(e)}"}), 500

@trends_bp.route('/api/trends/calories/<user_id>', methods=['GET'])
def get_calorie_trends(user_id):
    """Get calorie trend data for a user over a specified period.

    Query parameters:
        - period: 'week', 'month', 'year' (default: 'week')
        - days: specific number of days (overrides period)
    """
    try:
        # Parse UUID from string
        try:
            user_id = UUID(user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Get query parameters
        period = request.args.get('period', 'week')
        days_param = request.args.get('days')

        # Determine number of days based on period or direct parameter
        if days_param:
            try:
                days = int(days_param)
                if days <= 0:
                    return jsonify({"error": "Days parameter must be a positive integer"}), 400
            except ValueError:
                return jsonify({"error": "Days parameter must be a valid integer"}), 400
        else:
            # Map period to days
            period_days = {
                'week': 7,
                'month': 30,
                'year': 365
            }
            days = period_days.get(period, 7)

        # Get meal history data
        meal_history = client.get_user_meal_history(user_id, days)

        # Get user data for daily goal
        user = client.get_user_by_id(user_id)
        daily_goal = user.daily_calorie_goal if user and hasattr(user, 'daily_calorie_goal') else 2000

        # Format the data for frontend charts
        chart_data = {
            "labels": [],
            "datasets": [
                {
                    "label": "Consumed",
                    "data": [],
                    "borderColor": "#22C55E",
                    "backgroundColor": "rgba(34, 197, 94, 0.05)",
                    "borderWidth": 2,
                    "tension": 0.3,
                    "fill": True
                },
                {
                    "label": "Goal",
                    "data": [],
                    "borderColor": "#9CA3AF",
                    "borderWidth": 1,
                    "borderDash": [5, 5],
                    "pointRadius": 0
                }
            ]
        }

        # Process meal history data
        for entry in meal_history:
            # Format date for display
            entry_date = date.fromisoformat(entry['date'])
            chart_data["labels"].append(entry_date.strftime('%b %d'))

            # Add consumed calories
            consumed = entry.get('total_calories', 0)
            chart_data["datasets"][0]["data"].append(consumed)

            # Add goal calories
            chart_data["datasets"][1]["data"].append(daily_goal)

        return jsonify({
            "success": True,
            "data": chart_data,
            "period": period,
            "days": days,
            "daily_goal": daily_goal
        })

    except Exception as e:
        return jsonify({"error": f"Failed to fetch calorie trends: {str(e)}"}), 500

@trends_bp.route('/api/trends/combined/<user_id>', methods=['GET'])
def get_combined_trends(user_id):
    """Get combined weight and calorie trend data for a user.

    Query parameters:
        - period: 'week', 'month', 'year' (default: 'month')
        - days: specific number of days (overrides period)
    """
    try:
        # Parse UUID from string
        try:
            user_id = UUID(user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Get query parameters
        period = request.args.get('period', 'month')
        days_param = request.args.get('days')

        # Determine number of days based on period or direct parameter
        if days_param:
            try:
                days = int(days_param)
                if days <= 0:
                    return jsonify({"error": "Days parameter must be a positive integer"}), 400
            except ValueError:
                return jsonify({"error": "Days parameter must be a valid integer"}), 400
        else:
            # Map period to days
            period_days = {
                'week': 7,
                'month': 30,
                'year': 365
            }
            days = period_days.get(period, 30)

        # Get both weight and calorie data
        weight_trends = client.get_user_weight_trend(user_id, period)
        meal_history = client.get_user_meal_history(user_id, days)

        # Get user data
        user = client.get_user_by_id(user_id)
        daily_goal = user.daily_calorie_goal if user and hasattr(user, 'daily_calorie_goal') else 2000
        goal_weight = user.target_weight if user and hasattr(user, 'target_weight') else None

        # Create combined response
        combined_data = {
            "weight": {
                "labels": [],
                "data": [],
                "goal": goal_weight
            },
            "calories": {
                "labels": [],
                "data": [],
                "goal": daily_goal
            }
        }

        # Process weight data
        for entry in weight_trends:
            entry_date = date.fromisoformat(entry['date'])
            combined_data["weight"]["labels"].append(entry_date.strftime('%b %d'))
            combined_data["weight"]["data"].append(entry['weight_kg'])

        # Process calorie data
        for entry in meal_history:
            entry_date = date.fromisoformat(entry['date'])
            combined_data["calories"]["labels"].append(entry_date.strftime('%b %d'))
            combined_data["calories"]["data"].append(entry.get('total_calories', 0))

        return jsonify({
            "success": True,
            "data": combined_data,
            "period": period,
            "days": days
        })

    except Exception as e:
        return jsonify({"error": f"Failed to fetch combined trends: {str(e)}"}), 500