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

## 📁 Project Structure

```
CalorIA/
├── CalorIA/
│   ├── __init__.py              # Python package initialization
│   ├── cli.py                   # Custom CLI commands
│   ├── types.py                 # Type definitions
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
│       ├── mongo.py            # MongoDB connection utilities
│       ├── tools.py            # Utility functions
│       └── routes/             # API route blueprints
│           ├── __init__.py
│           ├── user_routes.py  # User management endpoints
│           ├── meal_routes.py  # Meal tracking endpoints
│           ├── health_routes.py # Health monitoring endpoints
│           ├── weight_routes.py # Weight tracking endpoints
│           └── water_routes.py  # Water intake endpoints
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

## 🌐 API Endpoints

The CalorIA REST API provides the following endpoint categories:

### User Management
- **GET** `/api/user/<user_id>` - Get user information
- **POST** `/api/user` - Create new user
- **PUT** `/api/user/<user_id>` - Update user information
- **DELETE** `/api/user/<user_id>` - Delete user

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