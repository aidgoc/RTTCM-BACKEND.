#!/bin/bash

# Update Vercel Environment Variables Script
# Replace YOUR_RAILWAY_URL with your actual Railway URL

echo "🔧 Updating Vercel environment variables..."

# Navigate to frontend
cd frontend

# Remove old placeholder variables
echo "🗑️  Removing old variables..."
vercel env rm NEXT_PUBLIC_API_URL production
vercel env rm NEXT_PUBLIC_WS_URL production

# Add new variables with your Railway URL
echo "✅ Adding new variables..."
echo "REPLACE_WITH_YOUR_RAILWAY_URL" | vercel env add NEXT_PUBLIC_API_URL production
echo "REPLACE_WITH_YOUR_RAILWAY_URL" | vercel env add NEXT_PUBLIC_WS_URL production

# Redeploy frontend
echo "🚀 Redeploying frontend..."
vercel --prod

echo "✅ Done! Your frontend is now connected to the backend!"

