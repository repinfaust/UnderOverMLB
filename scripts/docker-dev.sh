#!/bin/bash

# Docker Development Environment Script

set -e

echo "🐳 Starting MLB Prediction System in Docker (Development Mode)..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found. Please copy .env.example to .env and configure your API keys."
    exit 1
fi

# Stop any running containers
echo "🛑 Stopping any running containers..."
docker-compose -f docker-compose.dev.yml down

# Build and start services
echo "🚀 Building and starting services..."
docker-compose -f docker-compose.dev.yml up --build -d

# Wait for services to be ready
echo "⏳ Waiting for services to start..."
sleep 10

# Show logs
echo "📋 Service logs:"
docker-compose -f docker-compose.dev.yml logs -f