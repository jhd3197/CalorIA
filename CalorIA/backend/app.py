from flask import Flask, jsonify, send_from_directory, send_file, g
from flask_cors import CORS
import os
import sys
import argparse
from pathlib import Path
import CalorIA as caloria

def get_db():
    """Get CalorIA client instance from Flask's g context"""
    if 'db' not in g:
        g.db = caloria.Client()
        # Test connection on first access
        connection = g.db.get_db_connection()
        if connection is None:
            print("Failed to connect to MongoDB")
        else:
            print("Successfully connected to MongoDB")
    return g.db

def close_db(error):
    """Close database connection when app context ends"""
    db = g.pop('db', None)
    if db is not None:
        # The CalorIA Client uses connection pooling, no explicit close needed
        pass

def create_app():
    """Create and configure the Flask application"""
    # Configure Flask to serve static files from React build
    static_folder = Path(__file__).parent.parent / "frontend" / "build"
    app = Flask(__name__, static_folder=str(static_folder))
    
    # Enable CORS for the frontend running on various local origins
    CORS(app, origins=['http://localhost:3852', 'http://127.0.0.1:3852', 'http://localhost:4032', 'http://127.0.0.1:4032'])
    
    # Register the database teardown function
    app.teardown_appcontext(close_db)
    
    # Import and register blueprints (inside function to prevent circular imports)
    from CalorIA.mixins.routes import register_blueprints
    register_blueprints(app)
    
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_react_app(path):
        """Serve React app for all non-API routes"""
        # If it's an API route, let it fall through to return 404
        if path.startswith('api/'):
            return jsonify({"error": "API endpoint not found"}), 404
        
        # For all other routes, serve the React app
        static_folder_path = Path(app.static_folder)
        
        # If the requested file exists in the build folder, serve it
        if path and (static_folder_path / path).exists():
            return send_from_directory(app.static_folder, path)
        
        # Otherwise, serve the main index.html for client-side routing
        index_path = static_folder_path / 'index.html'
        if index_path.exists():
            return send_file(str(index_path))
        else:
            return jsonify({
                "error": "Frontend build not found",
                "message": "Please run 'caloria build' first to build the frontend"
            }), 404
    
    return app

if __name__ == '__main__':
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Run CalorIA Flask backend server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', default=4032, type=int, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    
    args = parser.parse_args()
    
    # Create the Flask application using the factory
    app = create_app()
    
    # Run the Flask application with provided arguments
    app.run(host=args.host, port=args.port, debug=args.debug or os.getenv('FLASK_DEBUG') == '1')