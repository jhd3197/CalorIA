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

# Create the AI assistant routes blueprint
ai_assistant_bp = Blueprint('ai_assistant', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@ai_assistant_bp.route('/api/ai-assistant/meal-recommendations/<profile_id>', methods=['GET'])
def get_meal_recommendations(profile_id):
    """Get AI-powered meal recommendations for a specific profile."""
    try:
        # Parse UUID from string
        try:
            profile_id = UUID(profile_id)
        except ValueError:
            return jsonify({"error": "Invalid profile ID format"}), 400

        # Get user_id from query parameters
        user_id_str = request.args.get('user_id')
        if not user_id_str:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        try:
            user_id = UUID(user_id_str)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Get number of meals from query parameters (default to 3)
        num_meals = int(request.args.get('num_meals', 3))
        if num_meals < 1 or num_meals > 10:
            return jsonify({"error": "num_meals must be between 1 and 10"}), 400

        # Get meal recommendations
        result = client.get_meal_recommendations(profile_id, user_id, num_meals)

        if result is None:
            return jsonify({"error": "Failed to generate meal recommendations"}), 500

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get meal recommendations: {str(e)}"}), 500

@ai_assistant_bp.route('/api/ai-assistant/shopping-list/<profile_id>', methods=['POST'])
def get_shopping_list(profile_id):
    """Get AI-generated shopping list for a specific profile."""
    try:
        # Parse UUID from string
        try:
            profile_id = UUID(profile_id)
        except ValueError:
            return jsonify({"error": "Invalid profile ID format"}), 400

        # Get user_id from query parameters
        user_id_str = request.args.get('user_id')
        if not user_id_str:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        try:
            user_id = UUID(user_id_str)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Get meals data from request body (optional)
        meals_data = None
        if request.is_json:
            data = request.get_json()
            meals_data = data.get('meals') if data else None

        # Get shopping list
        result = client.get_shopping_list(profile_id, user_id, meals_data)

        if result is None:
            return jsonify({"error": "Failed to generate shopping list"}), 500

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get shopping list: {str(e)}"}), 500

@ai_assistant_bp.route('/api/ai-assistant/meal-plan/<profile_id>', methods=['GET'])
def get_meal_plan_overview(profile_id):
    """Get comprehensive meal plan overview with recommendations and shopping list."""
    try:
        # Parse UUID from string
        try:
            profile_id = UUID(profile_id)
        except ValueError:
            return jsonify({"error": "Invalid profile ID format"}), 400

        # Get user_id from query parameters
        user_id_str = request.args.get('user_id')
        if not user_id_str:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        try:
            user_id = UUID(user_id_str)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Get comprehensive meal plan
        result = client.get_meal_plan_overview(profile_id, user_id)

        if result is None:
            return jsonify({"error": "Failed to generate meal plan overview"}), 500

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get meal plan overview: {str(e)}"}), 500

@ai_assistant_bp.route('/api/ai-assistant/insights/<profile_id>', methods=['GET'])
def get_ai_insights(profile_id):
    """Get AI insights and tips for a meal prep profile."""
    try:
        # Parse UUID from string
        try:
            profile_id = UUID(profile_id)
        except ValueError:
            return jsonify({"error": "Invalid profile ID format"}), 400

        # Get user_id from query parameters
        user_id_str = request.args.get('user_id')
        if not user_id_str:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        try:
            user_id = UUID(user_id_str)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Get AI insights
        result = client.get_ai_insights(profile_id, user_id)

        if result is None:
            return jsonify({"error": "Failed to generate AI insights"}), 500

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get AI insights: {str(e)}"}), 500

@ai_assistant_bp.route('/api/ai-assistant/regenerate/<profile_id>', methods=['POST'])
def regenerate_recommendations(profile_id):
    """Regenerate meal recommendations based on user feedback."""
    try:
        # Parse UUID from string
        try:
            profile_id = UUID(profile_id)
        except ValueError:
            return jsonify({"error": "Invalid profile ID format"}), 400

        # Get user_id from query parameters
        user_id_str = request.args.get('user_id')
        if not user_id_str:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        try:
            user_id = UUID(user_id_str)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Parse JSON request body
        data = request.get_json()
        if not data:
            return jsonify({"error": "Request body must be valid JSON"}), 400

        # Get previous recommendations and feedback
        previous_recommendations = data.get('previous_recommendations', [])
        feedback = data.get('feedback')

        if not previous_recommendations:
            return jsonify({"error": "previous_recommendations is required"}), 400

        # Regenerate recommendations
        result = client.regenerate_recommendations(
            profile_id, user_id, previous_recommendations, feedback
        )

        if result is None:
            return jsonify({"error": "Failed to regenerate recommendations"}), 500

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": f"Failed to regenerate recommendations: {str(e)}"}), 500

@ai_assistant_bp.route('/api/ai-assistant/history/<profile_id>', methods=['GET'])
def get_ai_response_history(profile_id):
    """Get AI response history for a profile."""
    try:
        # Parse UUID from string
        try:
            profile_id = UUID(profile_id)
        except ValueError:
            return jsonify({"error": "Invalid profile ID format"}), 400

        # Get user_id from query parameters
        user_id_str = request.args.get('user_id')
        if not user_id_str:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        try:
            user_id = UUID(user_id_str)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Get limit from query parameters (default to 10)
        limit = int(request.args.get('limit', 10))
        if limit < 1 or limit > 50:
            return jsonify({"error": "limit must be between 1 and 50"}), 400

        # Get AI response history
        history = client.get_ai_response_history(user_id, profile_id, limit)

        return jsonify({
            "history": history,
            "profile_id": str(profile_id),
            "limit": limit
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get AI response history: {str(e)}"}), 500

@ai_assistant_bp.route('/api/ai-assistant/latest/<profile_id>', methods=['GET'])
def get_latest_ai_responses(profile_id):
    """Get the latest AI responses for a profile to restore state."""
    try:
        # Parse UUID from string
        try:
            profile_id = UUID(profile_id)
        except ValueError:
            return jsonify({"error": "Invalid profile ID format"}), 400

        # Get user_id from query parameters
        user_id_str = request.args.get('user_id')
        if not user_id_str:
            return jsonify({"error": "Missing required parameter: user_id"}), 400

        try:
            user_id = UUID(user_id_str)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

        # Get latest AI responses
        latest_responses = client.get_latest_ai_responses(profile_id, user_id)

        # Convert to dict format for JSON response
        response_data = {}
        for response_type, ai_response in latest_responses.items():
            response_data[response_type] = {
                "id": str(ai_response.id),
                "response_type": ai_response.response_type.value,
                "ai_response": ai_response.ai_response,
                "created_at": ai_response.created_at.isoformat(),
                "request_data": ai_response.request_data
            }

        return jsonify({
            "latest_responses": response_data,
            "profile_id": str(profile_id)
        }), 200

    except Exception as e:
        return jsonify({"error": f"Failed to get latest AI responses: {str(e)}"}), 500

@ai_assistant_bp.route('/api/ai-assistant/health', methods=['GET'])
def check_ai_assistant_health():
    """Check if AI assistant services are available and properly configured."""
    try:
        # Check AI provider configuration
        ai_provider = client.ai_provider if hasattr(client, 'ai_provider') else 'unknown'

        health_status = {
            "ai_provider": ai_provider,
            "status": "healthy",
            "services": []
        }

        # Check OpenAI if configured
        if ai_provider == 'openai':
            openai_configured = hasattr(client, 'openai_api_key') and client.openai_api_key
            health_status["services"].append({
                "service": "openai",
                "configured": openai_configured,
                "model": getattr(client, 'openai_model', 'unknown')
            })

        # Check Ollama if configured
        elif ai_provider == 'ollama':
            ollama_configured = hasattr(client, 'ollama_base_url') and client.ollama_base_url
            health_status["services"].append({
                "service": "ollama",
                "configured": ollama_configured,
                "base_url": getattr(client, 'ollama_base_url', 'unknown'),
                "model": getattr(client, 'ollama_model', 'unknown')
            })

        return jsonify(health_status), 200

    except Exception as e:
        return jsonify({
            "status": "unhealthy",
            "error": str(e)
        }), 500