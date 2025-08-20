from flask import Flask, jsonify, send_from_directory, send_file, g
from flask_cors import CORS
import os
import sys
import argparse
from pathlib import Path
from CalorIA.mixins.routes import register_blueprints
from CalorIA.mixins.mongo import MongoMixin

# Configure Flask to serve static files from React build
static_folder = Path(__file__).parent.parent / "frontend" / "build"
app = Flask(__name__, static_folder=str(static_folder))

# Enable CORS for the frontend running on localhost:3852
CORS(app, origins=['http://localhost:3852'])

# Create database mixin class
class AppDatabase(MongoMixin):
    pass

def get_db():
    """Get database instance from Flask's g context"""
    if 'db' not in g:
        g.db = AppDatabase()
        # Test connection on first access
        connection = g.db.get_db_connection()
        if connection is None:
            print("Failed to connect to MongoDB")
        else:
            print("Successfully connected to MongoDB")
    return g.db

# Register all blueprints
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

if __name__ == '__main__':
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Run CalorIA Flask backend server')
    parser.add_argument('--host', default='0.0.0.0', help='Host to bind to')
    parser.add_argument('--port', default=4032, type=int, help='Port to bind to')
    parser.add_argument('--debug', action='store_true', help='Run in debug mode')
    
    args = parser.parse_args()
    
    # Run the Flask application with provided arguments
    app.run(host=args.host, port=args.port, debug=args.debug or os.getenv('FLASK_DEBUG') == '1')