# CraneFleet Backend

Backend API for the Real-Time Tower Crane Monitoring System.

## Features

- Express.js REST API
- MongoDB with Mongoose ODM
- MQTT client for real-time telemetry
- Socket.IO for WebSocket communication
- JWT authentication with role-based access control
- Automatic alert generation and ticket management

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp env.example .env
```

3. Update `.env` with your configuration

4. Start the development server:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - User logout

### Cranes
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
npm test
```

## Environment Variables

- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `MQTT_BROKER_URL` - MQTT broker URL
- `MQTT_USERNAME` - MQTT username (optional)
- `MQTT_PASSWORD` - MQTT password (optional)
- `PORT` - Server port (default: 3001)
