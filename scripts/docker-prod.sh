#!/bin/bash

# Docker Production Environment Script

set -e

echo "🐳 Starting MLB Prediction System in Docker (Production Mode)..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found. Please copy .env.example to .env and configure your API keys."
    exit 1
fi

# Generate SSL certificates if they don't exist
if [ ! -f docker/ssl/cert.pem ]; then
    echo "🔐 Generating self-signed SSL certificates..."
    mkdir -p docker/ssl
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout docker/ssl/key.pem \
        -out docker/ssl/cert.pem \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
fi

# Stop any running containers
echo "🛑 Stopping any running containers..."
docker-compose down

# Build and start services
echo "🚀 Building and starting services..."
docker-compose up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 15

# Run health check
echo "🏥 Running health check..."
if curl -f -s http://localhost/health > /dev/null; then
    echo "✅ Service is healthy and running on https://localhost"
else
    echo "❌ Service health check failed"
    docker-compose logs mlb-prediction-system
    exit 1
fi

echo "🎉 MLB Prediction System is running in production mode!"
echo "🌐 Access the system at: https://localhost"
echo "📊 Health check: https://localhost/health"
echo "📈 Metrics: https://localhost/metrics (internal access only)"