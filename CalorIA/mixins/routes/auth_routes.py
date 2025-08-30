from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from CalorIA.backend.app import get_client
from CalorIA.types import User, UserPreferences, Sex
from CalorIA.mixins.jwt_utils import generate_jwt_token, jwt_required, extract_token_from_request, get_current_user_from_token
from werkzeug.local import LocalProxy
from uuid import uuid4, UUID

auth_bp = Blueprint('auth_bp', __name__)

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        name = data.get('name')
        email = data.get('email')
        password = data.get('password')
        
        if not name or not email or not password:
            return jsonify({'error': 'Name, email, and password are required'}), 400
        
        # Hash the password
        password_hash = generate_password_hash(password)

        # Check if user already exists
        existing_user = client.get_document('users', {'email': email}, User)
        if existing_user:
            return jsonify({'error': 'User with this email already exists'}), 409
        
        # Create default preferences
        preferences = UserPreferences(
            sex=Sex.OTHER,  # Default to OTHER for new registrations
            daily_calorie_goal=2000,
            daily_water_goal_ml=2000,
            target_weight=70.0
        )
        
        # Create new user
        new_user = User(
            user_id=uuid4(),
            name=name,
            email=email,
            password_hash=password_hash,
            preferences=preferences
        )
        
        # Save user to database
        client.create_user(new_user)
        
        # Return user data (without password hash)
        response_data = new_user.to_dict()
        response_data['user_id'] = str(response_data['user_id'])
        response_data.pop('password_hash', None)  # Remove password hash from response
        
        return jsonify({
            'message': 'User registered successfully',
            'user': response_data
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        # Find user by email
        user_data = client.get_document('users', {'email': email}, User)
        if not user_data:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check password
        if not check_password_hash(user_data.password_hash, password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Generate JWT token
        token = generate_jwt_token(str(user_data.user_id))
        
        # Convert to dict and remove password hash from response
        user_dict = user_data.to_dict()
        user_dict['user_id'] = str(user_dict['user_id'])
        user_dict.pop('password_hash', None)
        
        return jsonify({
            'message': 'Login successful',
            'user': user_dict,
            'token': token
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/me', methods=['GET'])
@jwt_required
def get_current_user():
    """
    Get current user data from JWT token.
    Requires valid JWT token in Authorization header.
    """
    try:
        # current_user is available from jwt_required decorator
        user_dict = request.current_user.to_dict()
        user_dict['user_id'] = str(user_dict['user_id'])
        user_dict.pop('password_hash', None)

        # Get the latest weight entry for the user
        user_id = UUID(user_dict['user_id'])
        latest_weight_entry = client.get_latest_weight_entry(user_id)

        if latest_weight_entry:
            # Add latest weight to the user data
            user_dict['latest_weight'] = {
                'weight': latest_weight_entry.weight,
                'unit': latest_weight_entry.unit,
                'on_date': latest_weight_entry.on_date.isoformat() if latest_weight_entry.on_date else None
            }

        return jsonify({
            'user': user_dict
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/api/auth/health', methods=['GET'])
def check_auth_health():
    """
    Check if the current session/token is valid.
    Returns session validity status.
    """
    try:
        token = extract_token_from_request()
        
        if not token:
            return jsonify({
                'valid': False,
                'message': 'No token provided'
            }), 200
        
        # Try to get user from token
        user = get_current_user_from_token(token)
        
        if user:
            return jsonify({
                'valid': True,
                'message': 'Session is valid',
                'user_id': str(user.user_id)
            }), 200
        else:
            return jsonify({
                'valid': False,
                'message': 'Invalid or expired token'
            }), 200
            
    except Exception as e:
        return jsonify({
            'valid': False,
            'message': f'Health check failed: {str(e)}'
        }), 200

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    """
    Logout endpoint. Since JWT is stateless, we just return success.
    Client should remove the token from storage.
    """
    return jsonify({
        'message': 'Logout successful. Please remove token from client storage.'
    }), 200