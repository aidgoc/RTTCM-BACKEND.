# Backend Deployment Guide - Fix the 404 Errors

## 🔴 Current Problem

Your frontend is deployed on Vercel and working, but it's showing 404 errors because:
- ❌ Backend API is NOT deployed
- ❌ MongoDB is NOT connected
- ❌ MQTT broker is NOT configured

**Result**: All API calls fail with 404 errors (as you see in the console)

## ✅ Solution: Deploy Backend to Railway

### Step 1: Set Up MongoDB Atlas (5 minutes)

1. **Create MongoDB Atlas Account**
   - Go to: https://www.mongodb.com/cloud/atlas
   - Sign up for free account

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose "M0 Sandbox" (FREE tier)
   - Select a region close to you
   - Click "Create Cluster"

3. **Create Database User**
   - Go to "Database Access" in left menu
   - Click "Add New Database User"
   - Username: `craneadmin`
   - Password: Generate a strong password (save it!)
   - Database User Privileges: "Atlas admin"
   - Click "Add User"

4. **Whitelist IP Addresses**
   - Go to "Network Access" in left menu
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (0.0.0.0/0)
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" in left menu
   - Click "Connect" on your cluster
   - Choose "Connect your application"
   - Copy the connection string
   - It looks like: `mongodb+srv://craneadmin:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`
   - **Replace `<password>` with your actual password**

### Step 2: Deploy Backend to Railway (10 minutes)

1. **Go to Railway Dashboard**
   - Visit: https://railway.app/
   - Sign in with GitHub

2. **Create New Project**
   - Click "New Project"
   - Choose "Deploy from GitHub repo"
   - Select your repository: `REAL-TIME-TOWER-CRANE`

3. **Configure Service**
   - Railway will detect your project
   - Click on "Settings"
   - Set "Root Directory" to: `backend`
   - Set "Start Command" to: `npm start`
   - Set "Build Command" to: `npm install`

4. **Add Environment Variables**
   Click on "Variables" tab and add these:

   ```
   NODE_ENV=production
   PORT=3001
   MONGO_URI=mongodb+srv://craneadmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/cranefleet?retryWrites=true&w=majority
   JWT_SECRET=super-secure-random-string-minimum-32-characters-please-change-this
   FRONTEND_URL=https://real-time-tower-crane.vercel.app
   CORS_ORIGIN=https://real-time-tower-crane.vercel.app
   MQTT_BROKER_URL=mqtt://broker.hivemq.com:1883
   TOPIC_TELEMETRY=crane/+/telemetry
   TOPIC_STATUS=crane/+/status
   TOPIC_LOCATION=crane/+/location
   TOPIC_TEST=crane/+/test
   TOPIC_ALARM=crane/+/alarm
   TOPIC_HEARTBEAT=crane/+/heartbeat
   LOG_LEVEL=info
   BCRYPT_ROUNDS=12
   ENABLE_REDIS=false
   ENABLE_MQTT=true
   ENABLE_SOCKET_IO=true
   JWT_EXPIRES_IN=24h
   ```

   **Important**: 
   - Replace `YOUR_PASSWORD` in MONGO_URI with your actual MongoDB password
   - Generate a strong JWT_SECRET (use a password generator)

5. **Deploy**
   - Click "Deploy"
   - Wait for deployment to complete
   - Copy your Railway URL (e.g., `https://your-app.railway.app`)

### Step 3: Update Vercel Environment Variables (5 minutes)

Now update your frontend to point to the real backend:

```bash
# Navigate to frontend directory
cd frontend

# Remove old placeholder variables
vercel env rm NEXT_PUBLIC_API_URL production
vercel env rm NEXT_PUBLIC_WS_URL production

# Add real backend URL (replace with your Railway URL)
echo "https://your-app.railway.app" | vercel env add NEXT_PUBLIC_API_URL production
echo "https://your-app.railway.app" | vercel env add NEXT_PUBLIC_WS_URL production

# Redeploy frontend
vercel --prod
```

### Step 4: Verify Deployment

1. **Test Backend Health**
   - Visit: `https://your-app.railway.app/health`
   - Should return: `{"status":"ok"}`

2. **Test Frontend**
   - Visit: https://real-time-tower-crane.vercel.app/signup
   - Try creating an account
   - Should work without 404 errors!

## 🎯 Alternative: Deploy to Render (If Railway doesn't work)

### Render Deployment Steps

1. **Go to Render Dashboard**
   - Visit: https://render.com/
   - Sign in with GitHub

2. **Create New Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select `REAL-TIME-TOWER-CRANE`

3. **Configure Service**
   - Name: `crane-backend`
   - Region: Choose closest to you
   - Branch: `main`
   - Root Directory: `backend`
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **Add Environment Variables**
   Use the same variables as listed in Railway section above

5. **Create Service**
   - Click "Create Web Service"
   - Wait for deployment
   - Copy your Render URL (e.g., `https://crane-backend.onrender.com`)

6. **Update Vercel** (same as Step 3 above)

## 🔧 Quick MongoDB Test Connection

After deploying, test if MongoDB is connected:

```bash
# Test MongoDB connection
curl https://your-app.railway.app/health

# Should return something like:
{
  "status": "ok",
  "mongodb": "connected",
  "uptime": 123
}
```

## 📋 Checklist

Before your app works completely, verify:

- [ ] MongoDB Atlas cluster created
- [ ] MongoDB user created with password
- [ ] IP whitelist configured (0.0.0.0/0)
- [ ] Connection string obtained
- [ ] Backend deployed to Railway/Render
- [ ] All environment variables added to Railway/Render
- [ ] Backend health endpoint returns 200 OK
- [ ] Vercel environment variables updated with real backend URL
- [ ] Frontend redeployed to Vercel
- [ ] Test signup page - no more 404 errors!

## 🐛 Troubleshooting

### Backend won't start
- Check Railway/Render logs for errors
- Verify MONGO_URI is correct (password, cluster name)
- Ensure all required environment variables are set

### Still getting 404 errors
- Verify backend URL is correct in Vercel
- Check if backend is actually running (visit /health endpoint)
- Clear browser cache and reload
- Check CORS_ORIGIN matches your frontend URL

### MongoDB connection failed
- Verify password is correct (no special characters that need encoding)
- Check IP whitelist includes 0.0.0.0/0
- Ensure connection string format is correct

## 💡 Pro Tips

1. **Use Strong Passwords**
   - MongoDB password: Use a password generator
   - JWT_SECRET: At least 32 random characters

2. **Monitor Your Backend**
   - Railway/Render provide logs and metrics
   - Check logs regularly for errors

3. **Free Tier Limitations**
   - MongoDB Atlas: 512MB storage (plenty for testing)
   - Railway: 500 hours/month (enough for development)
   - Render: May sleep after inactivity (first request slow)

4. **Environment Variables Security**
   - Never commit .env files
   - Never share your JWT_SECRET or MongoDB password
   - All sensitive values are encrypted in Railway/Render/Vercel

## 🚀 Next Steps After Backend is Live

1. Test all API endpoints
2. Create initial admin user
3. Test real-time MQTT data
4. Configure Google Maps API key
5. Set up monitoring and alerts

---

**Estimated Total Time**: 20-30 minutes
**Cost**: $0 (all free tiers)
**Result**: Fully functional app with no more 404 errors!

