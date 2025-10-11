# Hostinger Deployment Guide - Use Your Existing Hosting!

## 🎉 Great News!

Since you already have Hostinger, you can use it to host your backend **at NO additional cost**!

## ✅ What You Need from Hostinger

Your Hostinger plan must support:
- ✅ Node.js applications (most plans include this)
- ✅ SSH access
- ✅ MongoDB (or use MongoDB Atlas - FREE)
- ✅ Port forwarding for WebSocket/MQTT

### Check Your Hostinger Plan

**Plans that work:**
- ✅ Business Hosting
- ✅ Cloud Hosting
- ✅ VPS Hosting
- ❌ Basic Shared Hosting (may not support Node.js)

**To check**: Login to Hostinger → Check if you see "Node.js" in your control panel

---

## 🚀 Deployment Options with Hostinger

### Option 1: Hostinger VPS/Cloud (BEST if you have it)

If you have VPS or Cloud hosting, this is perfect!

#### Step 1: Connect via SSH

```bash
ssh your-username@your-hostinger-server.com
```

#### Step 2: Install Node.js (if not installed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

#### Step 3: Clone Your Repository

```bash
# Navigate to your web directory
cd /home/your-username/public_html

# Clone your repository
git clone https://github.com/aidgoc/REAL-TIME-TOWER-CRANE.git
cd REAL-TIME-TOWER-CRANE/backend

# Install dependencies
npm install
```

#### Step 4: Create .env File

```bash
# Create environment file
nano .env
```

Add this content (edit with your values):

```env
NODE_ENV=production
PORT=3001

# MongoDB Atlas (FREE - recommended)
MONGO_URI=mongodb+srv://craneadmin:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/cranefleet

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# Frontend URL (your Vercel URL)
FRONTEND_URL=https://real-time-tower-crane.vercel.app
CORS_ORIGIN=https://real-time-tower-crane.vercel.app

# MQTT Configuration
MQTT_BROKER_URL=mqtt://broker.hivemq.com:1883
TOPIC_TELEMETRY=crane/+/telemetry
TOPIC_STATUS=crane/+/status
TOPIC_LOCATION=crane/+/location
TOPIC_TEST=crane/+/test
TOPIC_ALARM=crane/+/alarm
TOPIC_HEARTBEAT=crane/+/heartbeat

# Settings
BCRYPT_ROUNDS=12
ENABLE_REDIS=false
ENABLE_MQTT=true
ENABLE_SOCKET_IO=true
JWT_EXPIRES_IN=24h
LOG_LEVEL=info
```

Save: `Ctrl+X`, then `Y`, then `Enter`

#### Step 5: Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start your backend
cd /home/your-username/public_html/REAL-TIME-TOWER-CRANE/backend
pm2 start src/index.js --name crane-backend

# Save PM2 configuration
pm2 save

# Set PM2 to start on boot
pm2 startup
```

#### Step 6: Configure Reverse Proxy (Nginx)

```bash
# Edit Nginx configuration
sudo nano /etc/nginx/sites-available/your-domain.conf
```

Add this configuration:

```nginx
server {
    listen 80;
    server_name api.your-domain.com;  # or use subdomain

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

#### Step 7: Setup SSL Certificate (FREE)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d api.your-domain.com

# Auto-renewal is set up automatically
```

---

### Option 2: Hostinger Node.js Hosting (If you have it)

If Hostinger provides Node.js hosting through cPanel:

#### Step 1: Login to Hostinger cPanel

1. Go to Hostinger dashboard
2. Find "Node.js" or "Node.js Selector"
3. Click to open

#### Step 2: Create Node.js Application

1. Click "Create Application"
2. **Node.js version**: 18.x
3. **Application mode**: Production
4. **Application root**: `/REAL-TIME-TOWER-CRANE/backend`
5. **Application URL**: Choose subdomain (e.g., `api.yourdomain.com`)
6. **Application startup file**: `src/index.js`

#### Step 3: Upload Your Code

Option A - Using Git (Recommended):
```bash
# In cPanel Terminal or SSH
cd /home/your-username
git clone https://github.com/aidgoc/REAL-TIME-TOWER-CRANE.git
cd REAL-TIME-TOWER-CRANE/backend
npm install
```

Option B - Using File Manager:
1. Compress your `backend` folder into a ZIP
2. Upload via Hostinger File Manager
3. Extract in your web directory

#### Step 4: Set Environment Variables

In cPanel Node.js section:
1. Click "Environment Variables"
2. Add each variable from the .env file above
3. Click "Save"

#### Step 5: Start Application

1. Click "Start" button in Node.js manager
2. Wait for status to show "Running"
3. Note your application URL

---

### Option 3: Hostinger + MongoDB Atlas (RECOMMENDED)

**Why this is best:**
- ✅ Use Hostinger for backend (no extra cost)
- ✅ Use MongoDB Atlas for database (FREE 512MB)
- ✅ Use HiveMQ for MQTT (FREE)
- ✅ Total additional cost: $0

#### MongoDB Atlas Setup

1. **Create FREE cluster**: https://www.mongodb.com/cloud/atlas
2. **Get connection string**
3. **Add to Hostinger environment variables**

This way you don't need to manage MongoDB on Hostinger!

---

## 🔧 Your Final Architecture

```
Frontend (Vercel - FREE)
    ↓
Backend (Hostinger - Already paid)
    ↓
MongoDB Atlas (FREE 512MB)
    ↓
HiveMQ MQTT (FREE)
```

**Total Additional Cost: $0** 🎉

---

## ✅ Update Vercel to Point to Hostinger

After deploying to Hostinger:

```bash
cd frontend

# Remove old variables
vercel env rm NEXT_PUBLIC_API_URL production
vercel env rm NEXT_PUBLIC_WS_URL production

# Add Hostinger backend URL
echo "https://api.your-hostinger-domain.com" | vercel env add NEXT_PUBLIC_API_URL production
echo "https://api.your-hostinger-domain.com" | vercel env add NEXT_PUBLIC_WS_URL production

# Redeploy
vercel --prod
```

---

## 🐛 Troubleshooting

### Check if Node.js is running
```bash
pm2 status
pm2 logs crane-backend
```

### Check if port 3001 is open
```bash
sudo netstat -tulpn | grep 3001
```

### Restart application
```bash
pm2 restart crane-backend
```

### View application logs
```bash
pm2 logs crane-backend --lines 100
```

---

## 📋 Checklist

Before testing:

- [ ] Hostinger plan supports Node.js
- [ ] SSH access to server
- [ ] Node.js 18+ installed
- [ ] Backend code uploaded
- [ ] .env file created with correct values
- [ ] MongoDB Atlas connection string added
- [ ] PM2 process manager running
- [ ] Nginx reverse proxy configured
- [ ] SSL certificate installed
- [ ] Firewall allows port 3001
- [ ] Backend URL accessible (test /health endpoint)
- [ ] Vercel environment variables updated
- [ ] Frontend redeployed

---

## 🎯 Quick Test

After deployment, test these URLs:

1. **Health Check**:
   ```bash
   curl https://api.your-domain.com/health
   ```
   Should return: `{"status":"ok","mongodb":"connected"}`

2. **Frontend Test**:
   Visit: https://real-time-tower-crane.vercel.app/signup
   Should work without 404 errors!

---

## 💡 Hostinger vs Other Options

| Option | Cost | Pros | Cons |
|--------|------|------|------|
| **Hostinger** | $0 extra | Already paid, full control | Requires setup, SSH access |
| **Railway** | $0 | Super easy, auto-deploy | Another service |
| **Vercel Functions** | $0 | Same account | Requires code restructure |

**Recommendation**: Since you already have Hostinger, use it! Save money and keep everything under your control.

---

## 🚀 Next Steps

1. **Tell me your Hostinger plan type** (Shared/VPS/Cloud)
2. **Check if Node.js is available** in your cPanel
3. I'll give you exact steps for your specific setup!

**Let me know what type of Hostinger hosting you have, and I'll create specific step-by-step instructions for you!**

