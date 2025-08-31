#!/bin/bash

# This script updates Vercel environment variables after Railway deployment
# Replace YOUR_RAILWAY_URL with your actual Railway backend URL

echo "Setting up Vercel environment variables..."

# Get your Railway URL first
echo "Please enter your Railway backend URL (e.g., https://cybertask-backend.railway.app):"
read RAILWAY_URL

# Remove trailing slash if present
RAILWAY_URL=${RAILWAY_URL%/}

# Set API URL
echo "Setting VITE_API_URL..."
vercel env add VITE_API_URL production <<< "${RAILWAY_URL}/api"

# Set WebSocket URL (convert https to wss)
WS_URL=${RAILWAY_URL/https:/wss:}
WS_URL=${WS_URL/http:/ws:}
echo "Setting VITE_WS_URL..."
vercel env add VITE_WS_URL production <<< "${WS_URL}"

# Set app configuration
echo "Setting VITE_APP_NAME..."
vercel env add VITE_APP_NAME production <<< "CyberTask"

echo "Setting VITE_APP_VERSION..."
vercel env add VITE_APP_VERSION production <<< "1.0.0"

echo "Environment variables set! Now redeploying to Vercel..."
vercel --prod --yes

echo "✅ Deployment complete! Your app should be live at:"
echo "https://frontend-2livxtzlf-straughterguthrie-gmailcoms-projects.vercel.app"