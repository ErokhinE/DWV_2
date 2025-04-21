# Use Python 3.9 as base image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Set environment variable for Docker
ENV DOCKER_ENV=true

# Copy requirements first to leverage Docker cache
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the frontend and server directories to appropriate locations
COPY frontend /app/frontend
COPY server /app/server

# Expose port 5000 for Flask server
EXPOSE 5000

# Command to run the application
CMD ["python", "server/app.py"] 