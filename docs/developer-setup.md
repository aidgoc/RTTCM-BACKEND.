# 👨‍💻 Developer Setup Guide

Complete guide for setting up the Tower Dynamics development environment.

## Prerequisites

- **Node.js**: v18 or higher
- **npm**: v8 or higher
- **Docker**: Latest version
- **Docker Compose**: v2.0 or higher
- **Git**: Latest version
- **MongoDB**: v5.0 or higher (or use Docker)
- **MQTT Broker**: Mosquitto (or use Docker)

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd R-T-T-C-M

# 2. Start Docker services
docker-compose up -d

# 3. Install backend dependencies
cd backend
npm install

# 4. Install frontend dependencies
cd ../frontend
npm install

# 5. Configure environment variables
# Copy .env.example files and update values
```

---

## Step-by-Step Setup

### 1. Environment Variables

#### Backend Configuration
Create `backend/.env`:

```env
# Server Configuration
NODE_ENV=development
PORT=3001

# MongoDB Configuration
MONGO_URI=mongodb://localhost:27017/cranefleet

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=7d

# MQTT Configuration
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
ENABLE_MQTT=true

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
FRONTEND_URL=http://localhost:3000

# Redis Configuration (Optional)
ENABLE_REDIS=false
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Security Configuration
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10

# Company Configuration
COMPANY_NAME=Dynamic Crane Engineers
ADMIN_EMAIL=admin@cranefleet.com
ADMIN_PASSWORD=admin123
```

#### Frontend Configuration
Create `frontend/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001

# Application Configuration
NEXT_PUBLIC_APP_NAME=Tower Dynamics
NEXT_PUBLIC_COMPANY_NAME=Dynamic Crane Engineers
```

---

### 2. Docker Services

#### Start All Services
```bash
docker-compose up -d
```

#### Check Service Status
```bash
docker-compose ps
```

#### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f mongo
docker-compose logs -f mosquitto
```

#### Stop Services
```bash
docker-compose down
```

---

### 3. Database Setup

#### Connect to MongoDB
```bash
docker exec -it mongo mongosh cranefleet
```

#### Seed Database
```bash
cd backend
npm run seed
```

This creates:
- Default admin user
- Sample cranes
- Sample companies
- Test data

#### Verify Database
```bash
# Check users
db.users.find()

# Check cranes
db.cranes.find()

# Check companies
db.companies.find()
```

---

### 4. Backend Development

#### Install Dependencies
```bash
cd backend
npm install
```

#### Run in Development Mode
```bash
npm run dev
```

The backend will run on `http://localhost:3001`

#### Available Scripts
```bash
# Development with auto-reload
npm run dev

# Production start
npm start

# Run tests
npm test

# Seed database
npm run seed

# Add sample data
npm run add-sample
```

#### Test Backend
```bash
# Test API connection
curl http://localhost:3001

# Test health endpoint
curl http://localhost:3001/health

# Test MQTT status
curl http://localhost:3001/api/mqtt/status
```

---

### 5. Frontend Development

#### Install Dependencies
```bash
cd frontend
npm install
```

#### Run in Development Mode
```bash
npm run dev
```

The frontend will run on `http://localhost:3000`

#### Available Scripts
```bash
# Development mode
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

#### Access Frontend
Open browser: `http://localhost:3000`

---

### 6. MQTT Setup

#### Connect to MQTT Broker
The backend automatically connects to the MQTT broker.

#### Test MQTT Connection
```bash
cd backend
node test-mqtt-connection.js
```

#### Publish Test Data
```bash
node publish-test-telemetry.js
```

#### Monitor MQTT Messages
```bash
node monitor-mqtt-data.js
```

---

## Development Workflow

### 1. Making Changes

#### Backend Changes
1. Edit files in `backend/src/`
2. Server auto-reloads with nodemon
3. Check terminal for errors
4. Test endpoints

#### Frontend Changes
1. Edit files in `frontend/pages/` or `frontend/src/`
2. Browser auto-refreshes
3. Check browser console for errors
4. Test UI functionality

### 2. Database Changes

#### Model Updates
1. Update model file in `backend/src/models/`
2. Restart backend server
3. Check MongoDB for changes

#### Migration Scripts
```bash
cd backend/src/scripts
node migrateLocations.js
```

### 3. Testing Changes

#### Backend Testing
```bash
cd backend
npm test
```

#### Frontend Testing
```bash
cd frontend
npm test
```

#### Manual Testing
1. Test in browser (frontend)
2. Test with Postman/curl (backend)
3. Test with MQTT client

---

## Project Structure

### Backend Structure
```
backend/
├── src/
│   ├── config/        # Configuration files
│   ├── controllers/   # Business logic
│   ├── middleware/    # Express middleware
│   ├── models/        # MongoDB models
│   ├── routes/        # API routes
│   ├── services/      # Business services
│   ├── utils/         # Utility functions
│   └── index.js       # Entry point
├── tests/             # Test files
└── package.json       # Dependencies
```

### Frontend Structure
```
frontend/
├── pages/            # Next.js pages/routes
├── src/
│   ├── components/  # React components
│   ├── lib/         # API clients, utilities
│   ├── hooks/       # Custom React hooks
│   ├── contexts/    # React contexts
│   └── styles/      # CSS files
└── package.json     # Dependencies
```

---

## Common Tasks

### Adding a New API Endpoint

1. **Create Route**
```javascript
// backend/src/routes/newRoute.js
const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'New endpoint' });
});

module.exports = router;
```

2. **Register Route**
```javascript
// backend/src/index.js
app.use('/api/new-route', newRoute);
```

### Adding a New Database Model

1. **Create Model**
```javascript
// backend/src/models/NewModel.js
const mongoose = require('mongoose');

const newModelSchema = new mongoose.Schema({
  name: String,
  // ... other fields
});

module.exports = mongoose.model('NewModel', newModelSchema);
```

### Adding a New Frontend Page

1. **Create Page**
```javascript
// frontend/pages/new-page.jsx
export default function NewPage() {
  return <div>New Page</div>;
}
```

2. **Access**
Navigate to: `http://localhost:3000/new-page`

---

## Debugging

### Backend Debugging

#### Enable Debug Logs
```javascript
// backend/.env
DEBUG=*
```

#### Check Logs
```bash
tail -f backend/logs/error.log
tail -f backend/logs/combined.log
```

#### Database Debugging
```bash
# Connect to MongoDB
docker exec -it mongo mongosh cranefleet

# View collections
show collections

# Query data
db.users.find().pretty()
db.cranes.find().pretty()
```

### Frontend Debugging

#### Browser Console
Open DevTools (F12) and check:
- Console for errors
- Network tab for API calls
- React DevTools for components

#### Next.js Debug Mode
```bash
DEBUG=* npm run dev
```

---

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
docker ps | grep mongo

# Restart MongoDB
docker-compose restart mongo

# Check MongoDB logs
docker-compose logs mongo
```

### MQTT Connection Issues
```bash
# Check if Mosquitto is running
docker ps | grep mosquitto

# Restart Mosquitto
docker-compose restart mosquitto

# Check Mosquitto logs
docker-compose logs mosquitto
```

### Port Already in Use
```bash
# Kill process on port 3001 (backend)
lsof -ti:3001 | xargs kill -9

# Kill process on port 3000 (frontend)
lsof -ti:3000 | xargs kill -9
```

### Module Not Found
```bash
# Reinstall dependencies
cd backend && rm -rf node_modules && npm install
cd ../frontend && rm -rf node_modules && npm install
```

---

## Additional Resources

- [API Reference](./api-reference.md)
- [Architecture](./architecture.md)
- [Contributing Guide](./contributing.md)
- [Project Architecture](../PROJECT_ARCHITECTURE.md)

---

## Development Tips

1. **Always run tests** before committing
2. **Check linting** with `npm run lint`
3. **Follow coding standards** (ESLint + Prettier)
4. **Document your code** with comments
5. **Use meaningful commit messages**
6. **Keep environment variables secure**

---

Happy Coding! 🚀

