# CalorIA 🍎

A comprehensive full-stack calorie tracking application built with Flask backend, React frontend, MongoDB database, and a custom CLI for easy management. The application is fully containerized with Docker for seamless deployment.

## ✨ Features

- **🏗️ Full-Stack Architecture**: Flask REST API backend with React frontend
- **🗄️ MongoDB Database**: NoSQL database for flexible data storage
- **⚡ Custom CLI Tool**: Command-line interface for managing the application
- **🐳 Docker Support**: Fully containerized with docker-compose
- **👤 User Management**: User registration and profile management
- **🍽️ Meal Tracking**: Log and track daily meals and nutrition
- **❤️ Health Monitoring**: Track weight and water intake
- **💻 Modern UI**: Responsive React frontend with component-based architecture
- **🔗 REST API**: Comprehensive API endpoints for all features
- **🌱 Database Seeding**: Built-in script for populating test data
- **🧪 AI-Powered Research**: Intelligent ingredient and recipe discovery using OpenAI or Ollama
- **📝 Letter-Based Research**: Systematic research organized by alphabet for comprehensive coverage

## 📁 Project Structure

```
CalorIA/
├── CalorIA/
│   ├── __init__.py              # Python package initialization
│   ├── cli.py                   # Custom CLI commands
│   ├── types.py                 # Type definitions
│   ├── research/                # AI-powered research system
│   │   ├── __init__.py         # Research package initialization
│   │   ├── tools.py            # Base research classes and utilities
│   │   ├── ingredients.py      # Ingredient research functionality
│   │   └── recipes.py          # Recipe research functionality
│   ├── backend/                 # Flask backend application
│   │   ├── app.py              # Main Flask application
│   │   ├── requirements.txt     # Python dependencies
│   │   └── package-lock.json
│   ├── frontend/               # React frontend application
│   │   ├── src/                # React source code
│   │   ├── public/             # Public assets
│   │   ├── package.json        # Node.js dependencies
│   │   └── build/              # Production build (generated)
│   └── mixins/                 # Shared modules and routes
│       ├── modules/            # Business logic modules
│       │   ├── activities.py   # Activity tracking functionality
│       │   ├── ingredients.py  # Ingredient management
│       │   ├── meals.py        # Meal tracking and management
│       │   ├── recipes.py      # Recipe management
│       │   ├── users.py        # User management
│       │   ├── water.py        # Water intake tracking
│       │   └── weight.py       # Weight tracking
│       ├── routes/             # API route handlers
│       │   ├── __init__.py
│       │   ├── activity_routes.py # Activity endpoints
│       │   ├── auth_routes.py     # Authentication endpoints
│       │   ├── dashboard_routes.py # Dashboard data endpoints
│       │   ├── health_routes.py   # Health monitoring endpoints
│       │   ├── ingredient_routes.py # Ingredient CRUD endpoints
│       │   ├── meal_routes.py     # Meal tracking endpoints
│       │   ├── recipe_routes.py   # Recipe management endpoints
│       │   ├── user_routes.py     # User management endpoints
│       │   ├── water_routes.py    # Water intake endpoints
│       │   └── weight_routes.py   # Weight tracking endpoints
│       ├── jwt_utils.py         # JWT utilities
│       ├── mongo.py            # MongoDB connection utilities
│       └── tools.py            # General utilities
├── docker-compose.yml          # Docker composition configuration
├── Dockerfile                  # Docker image configuration
├── setup.py                    # Python package setup
├── .env.copy                   # Environment variables template
└── README.md                   # This file
```

## 🚀 Local Development Setup

### Prerequisites

Before running the application locally, ensure you have the following installed:

- **Python 3.7+**: Download from [python.org](https://www.python.org/downloads/)
- **Node.js 16+**: Download from [nodejs.org](https://nodejs.org/downloads/)
- **MongoDB**: Download from [mongodb.com](https://www.mongodb.com/try/download/community)

### Environment Configuration

1. Copy the environment template and configure your settings:
   ```bash
   cp .env.copy .env
   ```

2. Edit the `.env` file with your configuration:
   ```
   MONGODB_URI=mongodb://localhost:27017/caloria
   FLASK_DEBUG=1
   SECRET_KEY=your-secret-key-here

   # AI Research Configuration (optional)
   AI_PROVIDER=openai  # or 'ollama'
   OPENAI_API_KEY=your_openai_api_key_here
   OPENAI_MODEL=gpt-4
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama2
   ```

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd CalorIA
   ```

2. **Install Python dependencies**:
   ```bash
   pip install -r CalorIA/backend/requirements.txt
   ```

3. **Install Node.js dependencies**:
   ```bash
   cd CalorIA/frontend
   npm install
   cd ../..
   ```

4. **Install the CLI tool**:
   ```bash
   pip install -e .
   ```

5. **Start MongoDB** (if running locally):
   ```bash
   mongod
   ```

6. **Seed the database** (optional):
   ```bash
   caloria seed
   ```

## 💻 CLI Usage

The `caloria` CLI provides several commands to manage the application:

### Available Commands

- **`caloria backend`** - Start the Flask backend server
  ```bash
  caloria backend --host 127.0.0.1 --port 4032 --debug
  ```
  - `--host`: Host to bind to (default: 127.0.0.1)
  - `--port`: Port to bind to (default: 4032)
  - `--debug`: Run in debug mode

- **`caloria frontend`** - Start the React development server
  ```bash
  caloria frontend --port 3000
  ```
  - `--port`: Port for development server (default: 3000)

- **`caloria build`** - Build the React frontend for production
  ```bash
  caloria build --output-dir build
  ```
  - `--output-dir`: Output directory for build (default: build)

- **`caloria seed`** - Seed the database with sample data
  ```bash
  caloria seed
  ```

- **`caloria unseed`** - Remove all system-generated sample data from the database
  ```bash
  caloria unseed --confirm
  ```
  - `--confirm`: Confirm deletion without prompting

- **`caloria research-ingredients`** - Research and add missing ingredients using AI
  ```bash
  caloria research-ingredients --category Vegetables --letters A,B,C --max-ingredients 10
  ```
  - `--category`: Specific category to research (Vegetables, Proteins, Fruits, etc.)
  - `--letters`: Comma-separated letters to research (e.g., "A,B,C")
  - `--max-ingredients`: Maximum number of ingredients to add
  - `--dry-run`: Show what would be added without actually adding

- **`caloria research-recipes`** - Research and add missing recipes using AI
  ```bash
  caloria research-recipes --category breakfast --letters A,B,C --max-recipes 5
  ```
  - `--category`: Specific category to research (breakfast, lunch, dinner, etc.)
  - `--letters`: Comma-separated letters to research (e.g., "A,B,C")
  - `--max-recipes`: Maximum number of recipes to add
  - `--dry-run`: Show what would be added without actually adding

### Example Usage

1. **Start the full application** (recommended for development):
   ```bash
   # Terminal 1: Start the backend (includes building frontend)
   caloria backend --debug
   
   # Terminal 2: Start the frontend dev server (for hot reloading)
   caloria frontend
   ```

2. **Production build**:
   ```bash
   caloria build
   caloria backend --host 0.0.0.0 --port 4032
   ```

3. **AI Research Examples**:
   ```bash
   # Research vegetables starting with A, B, C
   caloria research-ingredients --category Vegetables --letters A,B,C --max-ingredients 15

   # Research breakfast recipes (dry run)
   caloria research-recipes --category breakfast --dry-run

   # Research proteins systematically
   caloria research-ingredients --category Proteins --max-ingredients 20
   ```

## 🐳 Docker Usage

### Quick Start with Docker

1. **Build and run the entire application**:
   ```bash
   docker-compose up --build
   ```

2. **Run in detached mode**:
   ```bash
   docker-compose up -d --build
   ```

3. **Stop the application**:
   ```bash
   docker-compose down
   ```

4. **View logs**:
   ```bash
   docker-compose logs -f
   ```

### Docker Services

The docker-compose configuration includes:

- **app**: The main CalorIA application (Flask + React)
  - Exposed on port 4032
  - Automatically builds frontend and runs backend
- **mongo**: MongoDB database
  - Exposed on port 27017
  - Data persisted in `mongo-data` volume

## 🧪 AI-Powered Research

CalorIA includes an intelligent AI-powered research system that can discover and add missing ingredients and recipes to your database. The system supports both OpenAI and Ollama as AI providers.

### Research Features

- **Letter-Based Research**: Systematically research ingredients/recipes by alphabet for comprehensive coverage
- **Category-Specific**: Research specific categories like Vegetables, Proteins, Fruits, etc.
- **Duplicate Prevention**: Automatically checks for existing items before adding
- **Dry Run Mode**: Test research without modifying the database
- **Batch Processing**: Process multiple items efficiently with progress tracking

### AI Providers

#### OpenAI (Default)
- Requires API key
- Supports GPT-3.5-turbo and GPT-4 models
- Higher quality responses
- Requires internet connection

#### Ollama (Local)
- Runs locally on your machine
- Supports various open-source models (Llama, Mistral, etc.)
- No API costs
- Works offline

### Research Categories

**Ingredients:**
- Vegetables, Fruits, Proteins, Grains & Starches
- Dairy, Oils & Fats, Nuts & Seeds
- Condiments & Sauces, Sweeteners, Spices
- Beverages, Supplements, Baking & Flours

**Recipes:**
- Breakfast, Lunch, Dinner, Snacks
- Desserts, Beverages, Appetizers
- Soups, Salads, Main Courses, Side Dishes

### Usage Examples

```bash
# Research vegetables starting with specific letters
caloria research-ingredients --category Vegetables --letters A,B,C,D,E

# Research breakfast recipes (systematic approach)
caloria research-recipes --category breakfast --max-recipes 10

# Dry run to see what would be added
caloria research-ingredients --category Proteins --dry-run

# Research with custom limits
caloria research-recipes --category dinner --max-recipes 5 --letters M,N,O
```

### Setting Up AI Providers

#### For OpenAI:
1. Get an API key from [OpenAI](https://platform.openai.com/api-keys)
2. Add to your `.env` file:
   ```
   AI_PROVIDER=openai
   OPENAI_API_KEY=your_api_key_here
   OPENAI_MODEL=gpt-4
   ```

#### For Ollama:
1. Install Ollama from [ollama.ai](https://ollama.ai)
2. Pull a model: `ollama pull llama2`
3. Add to your `.env` file:
   ```
   AI_PROVIDER=ollama
   OLLAMA_BASE_URL=http://localhost:11434
   OLLAMA_MODEL=llama2
   ```

## 🌐 API Endpoints

The CalorIA REST API provides the following endpoint categories:

### Authentication
- **POST** `/api/auth/login` - User login
- **POST** `/api/auth/register` - User registration
- **POST** `/api/auth/logout` - User logout

### User Management
- **GET** `/api/user/<user_id>` - Get user information
- **POST** `/api/user` - Create new user
- **PUT** `/api/user/<user_id>` - Update user information
- **DELETE** `/api/user/<user_id>` - Delete user

### Ingredients
- **GET** `/api/ingredients` - Get all ingredients (with pagination and search)
  - Query parameters: `page`, `limit`, `search`, `is_system`
- **GET** `/api/ingredients/<ingredient_id>` - Get specific ingredient
- **POST** `/api/ingredients` - Create new ingredient
- **PUT** `/api/ingredients/<ingredient_id>` - Update ingredient
- **DELETE** `/api/ingredients/<ingredient_id>` - Delete ingredient

### Recipes
- **GET** `/api/recipes` - Get all recipes (with pagination and search)
- **GET** `/api/recipes/<recipe_id>` - Get specific recipe
- **POST** `/api/recipes` - Create new recipe
- **PUT** `/api/recipes/<recipe_id>` - Update recipe
- **DELETE** `/api/recipes/<recipe_id>` - Delete recipe

### Meal Tracking
- **GET** `/api/meals/<user_id>` - Get user's meals
- **POST** `/api/meals` - Log a new meal
- **PUT** `/api/meals/<meal_id>` - Update meal information
- **DELETE** `/api/meals/<meal_id>` - Delete meal

### Health Monitoring
- **GET** `/api/health/<user_id>` - Get health status
- **POST** `/api/health` - Update health metrics

### Weight Tracking
- **GET** `/api/weight/<user_id>` - Get weight history
- **POST** `/api/weight` - Log weight entry
- **PUT** `/api/weight/<entry_id>` - Update weight entry
- **DELETE** `/api/weight/<entry_id>` - Delete weight entry

### Water Intake
- **GET** `/api/water/<user_id>` - Get water intake history
- **POST** `/api/water` - Log water intake
- **PUT** `/api/water/<entry_id>` - Update water entry
- **DELETE** `/api/water/<entry_id>` - Delete water entry

### Dashboard
- **GET** `/api/dashboard/<user_id>` - Get user dashboard data

## Development

### Project Architecture

- **Backend**: Flask application with Blueprint-based routing
- **Frontend**: React application with component-based architecture
- **Database**: MongoDB with PyMongo driver
- **CLI**: Click-based command-line interface
- **Containerization**: Docker with multi-stage builds

### Key Technologies

- **Backend**: Flask, PyMongo, Click
- **Frontend**: React, Node.js, npm
- **Database**: MongoDB
- **DevOps**: Docker, docker-compose
- **Python**: 3.7+ compatible

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes and test them
4. Commit your changes: `git commit -m 'Add feature'`
5. Push to the branch: `git push origin feature-name`
6. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.