#!/bin/bash

# MLB Prediction System Setup Script

set -e

echo "🏈 Setting up MLB Prediction System..."

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your API keys before starting the system."
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create necessary directories
echo "📁 Creating data directories..."
mkdir -p data/cache data/logs data/reports

# Build the project
echo "🔨 Building project..."
npm run build

# Run type check
echo "🔍 Running type check..."
npm run type-check

# Run linting
echo "🧹 Running linter..."
npm run lint

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file and add your API keys"
echo "2. Run: npm start (or ./scripts/start.sh)"
echo "3. Or run in dev mode: npm run dev (or ./scripts/dev.sh)"