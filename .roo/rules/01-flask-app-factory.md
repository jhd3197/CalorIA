# Flask Application Architecture Guide

When developing Flask applications, especially those with blueprints and database connections, adhere to the following architectural pattern to avoid circular imports and ensure a scalable structure. This pattern is based on the "Application Factory" model combined with a central `Client` class.

## Core Principles

1.  **Application Factory (`create_app`)**: The main Flask `app` object should be created and configured inside a function, typically named `create_app()`. This prevents the `app` object from being a global variable, which is the primary cause of circular imports.

2.  **Central Client (`CalorIA/Client`)**: A central client class should manage access to external services, primarily the database. This class initializes the database connection.

3.  **Request-Scoped Connections (`g`)**: The actual database connection object should be managed using Flask's application context (`g`). A `get_db()` function will retrieve the connection from `g` or create it if it doesn't exist for the current request. A `close_db()` function, registered with `app.teardown_appcontext`, will ensure the connection is closed after each request.

## Implementation Steps

### 1. The Application Factory (`CalorIA/backend/app.py`)

The main `app.py` file should contain the `create_app` factory.

```python
# CalorIA/backend/app.py
from flask import Flask, g
from CalorIA import Client # Import the central client
from CalorIA.mixins.routes import register_blueprints

# This function manages the DB connection for each request
def get_db():
    if 'db' not in g:
        g.db = Client().get_db_connection()
    return g.db

# This function closes the DB connection after each request
def close_db(e=None):
    db = g.pop('db', None)
    # In a real app, you might close the client connection if needed
    # if db is not None:
    #     db.client.close()

def create_app():
    app = Flask(__name__)

    # Register blueprints inside the factory
    register_blueprints(app)

    # Register the teardown function
    app.teardown_appcontext(close_db)

    # Other app configurations...
    return app
```

### 2. The Route Blueprints (`CalorIA/mixins/routes/*.py`)

Each blueprint file will import `get_db` from the `app.py` module to access the database within its routes.

```python
# CalorIA/mixins/routes/user_routes.py
from flask import Blueprint
from CalorIA.backend.app import get_db # Import from app.py

user_bp = Blueprint('user_bp', __name__)

@user_bp.route('/api/user/<uuid:user_id>')
def get_user(user_id):
    db = get_db() # Get the request-specific DB connection
    user_data = db.get_user_by_id(user_id)
    # ... return user data
```

This structure ensures that imports are resolved correctly and avoids the circular dependency, as the blueprints are imported and registered *after* the `app` object has been created within the factory function.