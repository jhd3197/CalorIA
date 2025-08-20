from flask import Blueprint, jsonify

# Create the health routes blueprint
health_bp = Blueprint('health', __name__)

@health_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "CalorIA Backend API",
        "version": "1.0.0"
    })