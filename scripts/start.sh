#!/bin/bash

# MLB Prediction System Startup Script

set -e

echo "🏈 Starting MLB Prediction System..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found. Please copy .env.example to .env and configure your API keys."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d node_modules ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build the project
echo "🔨 Building project..."
npm run build

# Create necessary directories
mkdir -p data/cache data/logs data/reports

# Start the system
echo "🚀 Starting MLB Prediction System..."
npm start