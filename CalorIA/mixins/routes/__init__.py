from .user_routes import user_bp
from .meal_routes import meal_bp
from .health_routes import health_bp
from .weight_routes import weight_bp
from .water_routes import water_bp
from .auth_routes import auth_bp
from .ingredient_routes import ingredient_bp
from .dashboard_routes import dashboard_bp

def register_blueprints(app):
    """Register all blueprints with the Flask app"""
    app.register_blueprint(user_bp)
    app.register_blueprint(meal_bp)
    app.register_blueprint(health_bp)
    app.register_blueprint(weight_bp)
    app.register_blueprint(water_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(ingredient_bp)
    app.register_blueprint(dashboard_bp)