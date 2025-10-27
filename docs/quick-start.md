# ⚡ Quick Start Guide

Get Tower Dynamics up and running in minutes!

## 🎯 What You'll Need

- Docker & Docker Compose (recommended)
- OR Node.js 18+, MongoDB, MQTT Broker
- 10 minutes of your time

---

## 🚀 Quick Setup (Docker Method)

### 1. Clone & Configure

```bash
# Clone the repository
git clone <your-repo-url>
cd R-T-T-C-M

# Start all services with Docker
docker-compose up -d
```

### 2. Setup Environment

```bash
# Backend setup
cd backend
cp env.example .env
# Edit .env with your settings

# Frontend setup
cd ../frontend
cp env.local.example .env.local
# Edit .env.local with your settings
```

### 3. Install Dependencies & Seed

```bash
# Backend
cd ../backend
npm install
npm run seed

# Frontend
cd ../frontend
npm install
```

### 4. Start Development Servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **MongoDB**: localhost:27017
- **MQTT**: localhost:1883

### 6. Login

**Default Credentials:**
- **Email**: admin@cranefleet.com
- **Password**: password123
- **Role**: Admin

**Or create a Super Admin:**
- Go to http://localhost:3000/signup
- Select "Super Admin" role
- Enter Head Office ID: `DCE-2024-MASTER-KEY`
- Complete signup

---

## 📋 Manual Setup (No Docker)

### Prerequisites

Install separately:
- MongoDB (https://www.mongodb.com/try/download/community)
- Mosquitto MQTT (https://mosquitto.org/download/)
- Node.js 18+ (https://nodejs.org/)

### Step-by-Step

#### 1. MongoDB Setup
```bash
# Start MongoDB
mongod --dbpath=/path/to/data

# Or use MongoDB service
brew services start mongodb-community  # macOS
# OR
sudo systemctl start mongod            # Linux
```

#### 2. Mosquitto Setup
```bash
# Start Mosquitto
mosquitto -c mosquitto.conf

# Or as service
brew services start mosquitto         # macOS
# OR
sudo systemctl start mosquitto         # Linux
```

#### 3. Backend Setup
```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp env.example .env
# Edit .env file

# Start backend
npm run dev
```

#### 4. Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp env.local.example .env.local
# Edit .env.local file

# Start frontend
npm run dev
```

---

## ✅ Verify Installation

### Check Backend Health
```bash
curl http://localhost:3001/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "mqtt": "connected"
  }
}
```

### Check MQTT Connection
```bash
curl http://localhost:3001/api/mqtt/status
```

Expected response:
```json
{
  "connected": true,
  "broker": "mqtt://localhost:1883"
}
```

### Check Frontend
Open http://localhost:3000 in your browser. You should see the login page.

---

## 🎓 Next Steps

### 1. Explore the Application

#### As Super Admin
1. Login with Super Admin credentials
2. Visit `/superadmin` dashboard
3. View financial overview
4. Check company management

#### As Company Admin
1. Create a company (if Super Admin)
2. Login as company admin
3. Create users
4. Add cranes
5. Monitor operations

### 2. Test MQTT Integration

#### Publish Test Data
```bash
cd backend
node publish-test-telemetry.js
```

This will publish sample telemetry data to the MQTT broker.

#### Monitor Data Flow
1. Watch backend terminal for MQTT messages
2. Check frontend dashboard for real-time updates
3. Verify data in MongoDB

### 3. Explore Features

- **Dashboard**: View all cranes and status
- **Crane Details**: Click any crane for detailed view
- **Users**: Create and manage users
- **Tickets**: View and manage issues
- **Analytics**: View reports and statistics

---

## 🐛 Troubleshooting

### Backend Won't Start

**Problem**: `Port 3001 already in use`
```bash
# Kill the process
lsof -ti:3001 | xargs kill -9

# Or change port in backend/.env
PORT=3002
```

### Frontend Won't Start

**Problem**: `Port 3000 already in use`
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Or change port in frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### MongoDB Connection Error

**Problem**: `MongoServerError: connect ECONNREFUSED`
```bash
# Check if MongoDB is running
docker ps | grep mongo

# Start MongoDB
docker-compose up -d mongo

# Or start manually
mongod --dbpath=/path/to/data
```

### MQTT Connection Error

**Problem**: `MQTT connection failed`
```bash
# Check if Mosquitto is running
docker ps | grep mosquitto

# Start Mosquitto
docker-compose up -d mosquitto

# Or start manually
mosquitto -c mosquitto.conf
```

### Module Not Found Errors

```bash
# Reinstall dependencies
cd backend && rm -rf node_modules && npm install
cd ../frontend && rm -rf node_modules && npm install
```

---

## 📚 Next Documentation

After setup, check out:

1. **[User Guide](./user-guide.md)** - How to use the application
2. **[Developer Setup](./developer-setup.md)** - Detailed development guide
3. **[API Reference](./api-reference.md)** - API documentation
4. **[Architecture](./architecture.md)** - System architecture

---

## 🎉 Success!

You're all set! The application should now be running:

- ✅ Backend: http://localhost:3001
- ✅ Frontend: http://localhost:3000
- ✅ MongoDB: Running
- ✅ MQTT: Connected

**Happy monitoring! 🏗️**

