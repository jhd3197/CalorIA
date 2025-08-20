from flask import Blueprint, request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from CalorIA.backend.app import get_db
from CalorIA.types import User, UserPreferences
from uuid import uuid4

auth_bp = Blueprint('auth_bp', __name__)

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
        
        # Get database connection
        db = get_db()
        
        # Check if user already exists
        existing_user = db.find_one('users', {'email': email})
        if existing_user:
            return jsonify({'error': 'User with this email already exists'}), 409
        
        # Create default preferences
        preferences = UserPreferences(
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
        user_dict = new_user.to_dict()
        user_dict['user_id'] = str(user_dict['user_id'])  # Convert UUID to string for MongoDB
        db.insert_one('users', user_dict)
        
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
        
        # Get database connection
        db = get_db()
        
        # Find user by email
        user_data = db.find_one('users', {'email': email})
        if not user_data:
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Check password
        if not check_password_hash(user_data['password_hash'], password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Remove password hash from response
        user_data.pop('password_hash', None)
        
        return jsonify({
            'message': 'Login successful',
            'user': user_data
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500