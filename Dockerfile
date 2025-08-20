# Frontend Build Stage
FROM node:18-alpine as builder

WORKDIR /app/frontend

# Copy package files
COPY CalorIA/frontend/package.json CalorIA/frontend/package-lock.json ./

# Install dependencies
RUN npm ci

# Copy frontend source code
COPY CalorIA/frontend/ ./

# Build the frontend
RUN npm run build

# Final Application Stage
FROM python:3.11-slim

WORKDIR /app

# Copy built frontend from builder stage
COPY --from=builder /app/frontend/build ./CalorIA/frontend/build

# Copy backend requirements and install Python dependencies
COPY CalorIA/backend/requirements.txt ./CalorIA/backend/
RUN pip install --no-cache-dir -r CalorIA/backend/requirements.txt

# Copy entire application source code and setup.py
COPY CalorIA/ ./CalorIA/
COPY setup.py ./

# Install the application
RUN pip install .

# Expose port 4032
EXPOSE 4032

# Set the command to run the application
CMD ["caloria", "backend", "--host", "0.0.0.0"]