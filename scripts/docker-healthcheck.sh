#!/bin/bash

# Docker Health Check Script
# Used by docker-compose healthcheck for the application

set -e

# Check if the server is responding
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ || echo "000")

if [ "$response" = "200" ] || [ "$response" = "307" ]; then
  echo "Health check passed: HTTP $response"
  exit 0
else
  echo "Health check failed: HTTP $response"
  exit 1
fi
