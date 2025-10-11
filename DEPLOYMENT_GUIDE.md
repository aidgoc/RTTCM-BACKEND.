# Deployment Guide - Real-Time Tower Crane Management System

## 🎯 Current Status

### ✅ Completed
- Git repository initialized and pushed to GitHub
- Frontend deployed to Vercel
- Environment variables configured and encrypted
- API error handling improved to prevent crashes

### 🔧 Production URLs
- **Frontend**: https://real-time-tower-crane.vercel.app
- **Latest Deployment**: https://real-time-tower-crane-gdjdgv983-hng-dgocins-projects.vercel.app
- **GitHub Repository**: https://github.com/aidgoc/REAL-TIME-TOWER-CRANE

## 🔐 Environment Variables (Securely Configured in Vercel)

### Frontend Environment Variables (Production)
All environment variables are encrypted in Vercel for security:

1. **NEXT_PUBLIC_API_URL** - Backend API URL (currently placeholder)
   - Current: `https://your-backend-api.railway.app`
   - **ACTION REQUIRED**: Update with actual backend URL once deployed

2. **NEXT_PUBLIC_WS_URL** - WebSocket URL for real-time updates
   - Current: `https://real-time-tower-crane.vercel.app`
   - **ACTION REQUIRED**: Update with actual WebSocket server URL

3. **NEXT_PUBLIC_GOOGLE_MAPS_API_KEY** - Google Maps API key for map features
   - Current: Placeholder
   - **ACTION REQUIRED**: Get API key from Google Cloud Console

### Backend Environment Variables (For Future Deployment)
The following variables need to be configured when deploying the backend:

#### Essential Variables
- `NODE_ENV=production`
- `PORT=3001`
- `MONGO_URI` - MongoDB connection string (use MongoDB Atlas or Railway)
- `JWT_SECRET` - Strong random string (minimum 32 characters)
- `FRONTEND_URL` - Your Vercel frontend URL
- `CORS_ORIGIN` - Your Vercel frontend URL

#### MQTT Configuration
- `MQTT_BROKER_URL` - MQTT broker URL (e.g., HiveMQ, CloudMQTT)
- `TOPIC_TELEMETRY=crane/+/telemetry`
- `TOPIC_STATUS=crane/+/status`
- `TOPIC_LOCATION=crane/+/location`
- `TOPIC_TEST=crane/+/test`
- `TOPIC_ALARM=crane/+/alarm`
- `TOPIC_HEARTBEAT=crane/+/heartbeat`

#### Optional but Recommended
- `ENABLE_REDIS=false` (or configure Redis for caching)
- `LOG_LEVEL=warn`
- `BCRYPT_ROUNDS=14`
- `RATE_LIMIT_MAX_REQUESTS=50`

## 📋 Next Steps to Complete Deployment

### 1. Deploy Backend (Choose One Option)

#### Option A: Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Navigate to backend
cd backend

# Initialize and deploy
railway init
railway up
```

#### Option B: Render
1. Go to https://render.com
2. Connect your GitHub repository
3. Create new Web Service
4. Set root directory to `backend`
5. Set build command: `npm install`
6. Set start command: `npm start`
7. Add environment variables from the list above

#### Option C: Heroku
```bash
# Install Heroku CLI
# Navigate to backend
cd backend

# Create Heroku app
heroku create your-crane-backend

# Add MongoDB addon
heroku addons:create mongolab

# Set environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-secret-key
heroku config:set FRONTEND_URL=https://real-time-tower-crane.vercel.app

# Deploy
git push heroku main
```

### 2. Set Up MongoDB Atlas (Free Tier)
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free cluster
3. Create database user
4. Whitelist IP addresses (0.0.0.0/0 for public access)
5. Get connection string
6. Add to backend environment variables as `MONGO_URI`

### 3. Set Up MQTT Broker (Choose One)

#### Option A: HiveMQ Cloud (Free Tier)
1. Go to https://www.hivemq.com/mqtt-cloud-broker/
2. Create free cluster
3. Get broker URL and credentials
4. Add to backend environment variables

#### Option B: CloudMQTT (Free Tier)
1. Go to https://www.cloudmqtt.com/
2. Create free instance
3. Get broker details
4. Add to backend environment variables

### 4. Get Google Maps API Key
1. Go to https://console.cloud.google.com/
2. Create new project or select existing
3. Enable Maps JavaScript API
4. Create credentials (API Key)
5. Restrict API key to your domain
6. Update Vercel environment variable:
```bash
cd frontend
vercel env rm NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production
echo "YOUR_ACTUAL_API_KEY" | vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production
```

### 5. Update Frontend Environment Variables

After deploying backend, update these variables:

```bash
cd frontend

# Remove old variables
vercel env rm NEXT_PUBLIC_API_URL production
vercel env rm NEXT_PUBLIC_WS_URL production

# Add new variables with actual backend URLs
echo "https://your-actual-backend-url.com" | vercel env add NEXT_PUBLIC_API_URL production
echo "https://your-actual-backend-url.com" | vercel env add NEXT_PUBLIC_WS_URL production

# Redeploy
vercel --prod
```

## 🔒 Security Best Practices (Already Implemented)

### ✅ Environment Variables
- All environment variables are encrypted in Vercel
- Never committed to Git repository
- Separate variables for development/preview/production

### ✅ API Security
- CORS configured to allow only your frontend domain
- JWT authentication for API endpoints
- Rate limiting enabled
- Helmet.js for security headers
- BCrypt for password hashing

### ✅ Frontend Security
- API calls have error handling to prevent crashes
- No sensitive data in client-side code
- Environment variables prefixed with `NEXT_PUBLIC_` for client-side access

## 🚀 Deployment Commands Reference

### Git Commands
```bash
# Check status
git status

# Add changes
git add .

# Commit changes
git commit -m "Your message"

# Push to GitHub
git push origin main
```

### Vercel Commands
```bash
# Deploy to production
vercel --prod

# View environment variables
vercel env ls

# Add environment variable
vercel env add VARIABLE_NAME production

# Remove environment variable
vercel env rm VARIABLE_NAME production

# View logs
vercel logs

# Pull environment variables to local
vercel env pull
```

### GitHub CLI Commands
```bash
# Check authentication
gh auth status

# Create repository
gh repo create

# View repository
gh repo view
```

## 📊 Monitoring and Maintenance

### View Vercel Logs
```bash
vercel logs --follow
```

### Check Deployment Status
```bash
vercel ls
```

### Rollback Deployment
```bash
vercel rollback
```

## 🐛 Troubleshooting

### Issue: Frontend shows "Application error"
**Solution**: Check if backend is deployed and environment variables are set correctly

### Issue: Maps not loading
**Solution**: Verify Google Maps API key is valid and properly configured

### Issue: Real-time updates not working
**Solution**: Verify WebSocket URL and MQTT broker are configured correctly

### Issue: Authentication not working
**Solution**: Verify JWT_SECRET is set in backend and matches between deployments

## 📝 Important Notes

1. **Backend Deployment is Required**: The frontend is deployed but won't work fully until the backend is deployed

2. **Update Environment Variables**: After deploying backend, update the placeholder URLs in Vercel

3. **Database Setup**: Make sure MongoDB is configured before starting the backend

4. **MQTT Broker**: Required for real-time crane telemetry updates

5. **Google Maps**: Required for map visualization features

## 🔗 Useful Links

- **Vercel Dashboard**: https://vercel.com/dashboard
- **GitHub Repository**: https://github.com/aidgoc/REAL-TIME-TOWER-CRANE
- **MongoDB Atlas**: https://www.mongodb.com/cloud/atlas
- **HiveMQ Cloud**: https://www.hivemq.com/mqtt-cloud-broker/
- **Google Cloud Console**: https://console.cloud.google.com/

## 📞 Support

If you encounter any issues:
1. Check Vercel logs: `vercel logs`
2. Check browser console for errors
3. Verify all environment variables are set
4. Ensure backend is running and accessible
5. Check CORS configuration if API calls fail

---

**Last Updated**: October 11, 2025
**Version**: 1.0.0

