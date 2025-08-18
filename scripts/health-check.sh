#!/bin/bash

# MLB Prediction System Health Check Script

set -e

PORT=${PORT:-3000}
HOST=${HOST:-localhost}

echo "🏥 Running health check on $HOST:$PORT..."

# Check if the service is running
if curl -f -s "http://$HOST:$PORT/health" > /dev/null; then
    echo "✅ Service is healthy"
    
    # Get detailed health status
    echo "📊 Health status:"
    curl -s "http://$HOST:$PORT/health" | python3 -m json.tool 2>/dev/null || curl -s "http://$HOST:$PORT/health"
    
    echo ""
    echo "📈 System metrics:"
    curl -s "http://$HOST:$PORT/metrics" | python3 -m json.tool 2>/dev/null || curl -s "http://$HOST:$PORT/metrics"
    
    exit 0
else
    echo "❌ Service is not responding or unhealthy"
    exit 1
fi