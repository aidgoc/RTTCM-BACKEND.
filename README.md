# Real-Time Tower Crane Monitoring Web Application

A comprehensive web application for monitoring tower cranes in real-time with MQTT telemetry, WebSocket updates, and role-based access control.

## Architecture

- **Frontend**: Next.js with React, Tailwind CSS, Recharts, React Query
- **Backend**: Node.js + Express with MQTT client, MongoDB, JWT auth
- **Real-time**: Socket.IO for WebSocket communication
- **MQTT Broker**: Eclipse Mosquitto
- **Database**: MongoDB
- **Containerization**: Docker Compose

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- **[Documentation Index](./docs/README.md)** - Complete documentation overview
- **[Quick Start Guide](./docs/quick-start.md)** - Get up and running in minutes
- **[User Guide](./docs/user-guide.md)** - Complete guide for all user roles
- **[Developer Setup](./docs/developer-setup.md)** - Local development environment
- **[API Reference](./docs/api-reference.md)** - Complete API documentation
- **[How to Document](./docs/how-to-document.md)** - Documentation guidelines
- **[Markdown Guide](./docs/MARKDOWN_GUIDE.md)** - Writing standards

### Quick Links

- [Installation Guide](./docs/developer-setup.md#step-by-step-setup)
- [API Documentation](./docs/api-reference.md)
- [User Roles & Permissions](./docs/user-guide.md#role-based-access-control)
- [Troubleshooting](./docs/troubleshooting.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)

## Quick Start

### Prerequisites
- Node.js 18+
- Docker and Docker Compose
- MongoDB URI (or use local MongoDB via Docker)

### Environment Variables

Create `.env` files in both `backend/` and `frontend/` directories:

**backend/.env:**
```
MONGO_URI=mongodb://localhost:27017/cranefleet
JWT_SECRET=your-super-secret-jwt-key-here
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=
PORT=3001
```

**frontend/.env.local:**
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=http://localhost:3001
```

### Running the Application

1. **Start services with Docker Compose:**
```bash
docker-compose up -d
```

2. **Install and run backend:**
```bash
cd backend
npm install
npm run dev
```

3. **Install and run frontend:**
```bash
cd frontend
npm install
npm run dev
```

4. **Seed the database:**
```bash
cd backend
npm run seed
```

### Demo Credentials

- **Admin**: admin@cranefleet.com / password123
- **Manager**: manager@cranefleet.com / password123  
- **Operator**: operator@cranefleet.com / password123

## Features

### Role-Based Access Control
- **Admin**: Full access to all features
- **Manager**: Access to assigned cranes and team management
- **Operator**: Limited access to assigned cranes only

### Real-Time Monitoring
- Live telemetry updates via MQTT and WebSocket
- Fleet overview dashboard
- Individual crane detail pages
- Alert system with automatic ticket creation

### MQTT Integration
- Subscribes to `crane/+/telemetry` and `crane/+/status` topics
- Robust parser for multiple payload formats
- Automatic alert generation for overloads and failures

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Cranes
<<<<<<< HEAD
- `GET /api/cranes` - List all cranes
- `GET /api/cranes/:id` - Get crane details
- `POST /api/cranes` - Create new crane
- `PATCH /api/cranes/:id` - Update crane
- `DELETE /api/cranes/:id` - Delete crane

### Telemetry
- `GET /api/cranes/:id/telemetry` - Get telemetry data
=======
- `GET /api/cranes` - List cranes (role-based filtering)
- `GET /api/cranes/:id` - Get crane details
- `POST /api/cranes` - Create crane (admin/manager only)
- `PATCH /api/cranes/:id` - Update crane (admin/manager only)
- `DELETE /api/cranes/:id` - Delete crane (admin only)

### Telemetry
- `GET /api/cranes/:id/telemetry` - Get telemetry data with time range

### Tickets
- `GET /api/tickets` - List tickets
- `POST /api/tickets` - Create ticket
- `PATCH /api/tickets/:id` - Update ticket status

### Users
- `GET /api/users` - List users (admin only)
- `POST /api/users` - Create user (admin only)
- `PATCH /api/users/:id` - Update user (admin only)

### Simulation
- `POST /api/sim/publish` - Publish test MQTT payload (admin/manager only)

## MQTT Payload Examples

The system supports multiple payload formats:

**Semicolon-delimited:**
```
TS=2025-09-09T12:05:10Z;ID=TC-004;LOAD=120;SWL=100;LS1=OK;LS2=OK;LS3=OK;UT=OK;UTIL=92
```

**Pipe-delimited:**
```
TC-001|2025-09-09T12:06:00Z|LOAD:85|SWL:100|LS1:OK|LS2:OK|LS3:FAIL|UT:OK|UTIL:78
```

**JSON:**
```json
{"id":"TC-002","ts":"2025-09-09T12:07:00Z","load":45,"swl":80,"ls1":"OK","ls2":"OK","ls3":"OK","ut":"OK","util":56}
```

## MQTT Integration

The backend subscribes to MQTT topics:
- `crane/+/telemetry` - Real-time telemetry data
- `crane/+/status` - Crane status updates

## Database Seeding

Seed the database with demo data:
```bash
npm run seed
```

This creates:
- Demo users (admin, manager, operator)
- Sample cranes
- Test telemetry data

## Testing

Run tests:
```bash
cd backend
npm test
```

## Development

### Backend Development
```bash
cd backend
npm run dev
```

### Frontend Development
```bash
cd frontend
npm run dev
```

## Docker Services

- **MongoDB**: Port 27017
- **Mosquitto MQTT**: Port 1883
- **Backend API**: Port 3001
- **Frontend**: Port 3000

## Environment Variables

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `MQTT_BROKER_URL` - MQTT broker URL
- `MQTT_USERNAME` - MQTT username (optional)
- `MQTT_PASSWORD` - MQTT password (optional)
- `PORT` - Server port (default: 3001)

## Security

- JWT tokens stored in httpOnly cookies
- Role-based middleware for API protection
- CORS configured for frontend origin only
- Password hashing with bcrypt
