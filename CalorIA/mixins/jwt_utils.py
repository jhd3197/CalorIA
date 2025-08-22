import jwt
import os
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import request, jsonify, current_app
from typing import Optional, Dict, Any
from CalorIA.types import User
from CalorIA.backend.app import get_client
from werkzeug.local import LocalProxy

# Use LocalProxy to defer client resolution until request context
client = LocalProxy(get_client)

class JWTConfig:
    """JWT Configuration constants"""
    SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'your-secret-key-change-this-in-production')
    ALGORITHM = 'HS256'
    EXPIRATION_HOURS = 24
    TOKEN_PREFIX = 'Bearer '

class JWTError(Exception):
    """Custom JWT exception"""
    pass

def generate_jwt_token(user_id: str) -> str:
    """
    Generate a JWT token for the given user ID.
    
    Args:
        user_id (str): The user's ID
        
    Returns:
        str: JWT token string
    """
    try:
        payload = {
            'user_id': user_id,
            'exp': datetime.now(timezone.utc) + timedelta(hours=JWTConfig.EXPIRATION_HOURS),
            'iat': datetime.now(timezone.utc)
        }
        
        token = jwt.encode(
            payload,
            JWTConfig.SECRET_KEY,
            algorithm=JWTConfig.ALGORITHM
        )
        
        return token
    except Exception as e:
        raise JWTError(f"Failed to generate JWT token: {str(e)}")

def decode_jwt_token(token: str) -> Dict[str, Any]:
    """
    Decode and validate a JWT token.
    
    Args:
        token (str): JWT token string
        
    Returns:
        Dict[str, Any]: Decoded token payload
        
    Raises:
        JWTError: If token is invalid or expired
    """
    try:
        # Remove Bearer prefix if present
        if token.startswith(JWTConfig.TOKEN_PREFIX):
            token = token[len(JWTConfig.TOKEN_PREFIX):]
        
        payload = jwt.decode(
            token,
            JWTConfig.SECRET_KEY,
            algorithms=[JWTConfig.ALGORITHM]
        )
        
        return payload
    except jwt.ExpiredSignatureError:
        raise JWTError("Token has expired")
    except jwt.InvalidTokenError:
        raise JWTError("Invalid token")
    except Exception as e:
        raise JWTError(f"Failed to decode token: {str(e)}")

def get_current_user_from_token(token: str) -> Optional[User]:
    """
    Get the current user from a JWT token.
    
    Args:
        token (str): JWT token string
        
    Returns:
        Optional[User]: User object if token is valid, None otherwise
    """
    try:
        payload = decode_jwt_token(token)
        user_id = payload.get('user_id')
        
        if not user_id:
            return None
        
        # Get user from database
        user = client.get_document('users', {'user_id': user_id}, User)
        return user
    except JWTError:
        return None
    except Exception:
        return None

def extract_token_from_request() -> Optional[str]:
    """
    Extract JWT token from the Authorization header.
    
    Returns:
        Optional[str]: Token string if present, None otherwise
    """
    auth_header = request.headers.get('Authorization')
    if not auth_header:
        return None
    
    if not auth_header.startswith(JWTConfig.TOKEN_PREFIX):
        return None
    
    return auth_header[len(JWTConfig.TOKEN_PREFIX):]

def jwt_required(f):
    """
    Decorator to require valid JWT token for route access.
    Adds 'current_user' to the request context.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_token_from_request()
        
        if not token:
            return jsonify({'error': 'Authorization token is required'}), 401
        
        try:
            payload = decode_jwt_token(token)
            user_id = payload.get('user_id')
            
            if not user_id:
                return jsonify({'error': 'Invalid token payload'}), 401
            
            # Get user from database
            current_user = client.get_document('users', {'user_id': user_id}, User)
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
            
            # Add current_user to request context
            request.current_user = current_user
            
        except JWTError as e:
            return jsonify({'error': str(e)}), 401
        except Exception as e:
            return jsonify({'error': 'Token validation failed'}), 401
        
        return f(*args, **kwargs)
    
    return decorated

def jwt_optional(f):
    """
    Decorator that allows optional JWT token.
    Adds 'current_user' to request context if token is valid, None otherwise.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = extract_token_from_request()
        
        if token:
            try:
                payload = decode_jwt_token(token)
                user_id = payload.get('user_id')
                
                if user_id:
                    current_user = client.get_document('users', {'user_id': user_id}, User)
                    request.current_user = current_user
                else:
                    request.current_user = None
            except:
                request.current_user = None
        else:
            request.current_user = None
        
        return f(*args, **kwargs)
    
    return decorated