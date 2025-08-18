#!/bin/bash

# MLB Prediction System Development Mode Script

set -e

echo "🏈 Starting MLB Prediction System in Development Mode..."

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

# Create necessary directories
mkdir -p data/cache data/logs data/reports

# Start in development mode
echo "🚀 Starting in development mode..."
npm run dev