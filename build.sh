#!/bin/bash
# Build script: build Angular and copy to backend's expected path
set -e
echo "📦 Building Angular frontend..."
cd frontend && yarn build && cd ..
echo "✅ Build complete. Frontend is at frontend/dist/frontend/browser"
echo "▶️  Start backend with: cd backend && node src/app.js"
