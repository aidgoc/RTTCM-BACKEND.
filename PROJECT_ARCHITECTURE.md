# Tower Dynamics - Project Architecture

## System Overview

The Tower Dynamics system is a comprehensive industrial crane monitoring solution with role-based access control, real-time telemetry processing, and automated ticket management.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           TOWER DYNAMICS SYSTEM ARCHITECTURE                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   ADMIN USER    │    │  MANAGER USER   │    │ SUPERVISOR USER │    │ OPERATOR USER   │
│                 │    │                 │    │                 │    │                 │
│ • Full Access   │    │ • Manage Cranes │    │ • Assign Cranes │    │ • Monitor Cranes│
│ • User Mgmt     │    │ • View Reports  │    │ • View Alerts   │    │ • View Tickets  │
│ • System Config │    │ • Create Users  │    │ • Create Tickets│    │ • Update Status │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │                      │
          └──────────────────────┼──────────────────────┼──────────────────────┘
                                 │                      │
                    ┌─────────────▼──────────────────────▼─────────────┐
                    │              FRONTEND LAYER                      │
                    │                                                 │
                    │  ┌─────────────────────────────────────────┐   │
                    │  │           NEXT.JS APPLICATION           │   │
                    │  │                                         │   │
                    │  │  • Dashboard (Role-based Views)         │   │
                    │  │  • Crane Management Interface           │   │
                    │  │  • Ticket Management System             │   │
                    │  │  • User Management (Admin Only)         │   │
                    │  │  • Real-time WebSocket Updates          │   │
                    │  └─────────────────────────────────────────┘   │
                    └─────────────────────┬───────────────────────────┘
                                          │
                    ┌─────────────────────▼───────────────────────────┐
                    │              API GATEWAY LAYER                  │
                    │                                                 │
                    │  ┌─────────────────────────────────────────┐   │
                    │  │           EXPRESS.JS SERVER             │   │
                    │  │                                         │   │
                    │  │  • Authentication & Authorization      │   │
                    │  │  • Role-based Access Control           │   │
                    │  │  • Rate Limiting & Security            │   │
                    │  │  • Request Validation                  │   │
                    │  │  • Error Handling & Logging            │   │
                    │  └─────────────────────────────────────────┘   │
                    └─────────────────────┬───────────────────────────┘
                                          │
┌─────────────────────────────────────────▼─────────────────────────────────────────┐
│                              BUSINESS LOGIC LAYER                                │
│                                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   AUTH      │  │   CRANES    │  │   TICKETS   │  │   USERS     │            │
│  │  SERVICE    │  │  SERVICE    │  │  SERVICE    │  │  SERVICE    │            │
│  │             │  │             │  │             │  │             │            │
│  │ • Login     │  │ • CRUD Ops  │  │ • Create    │  │ • CRUD Ops  │            │
│  │ • JWT Auth  │  │ • Real-time │  │ • Assign    │  │ • Role Mgmt │            │
│  │ • Role Check│  │ • Telemetry │  │ • Update    │  │ • Assignments│           │
│  │ • Permissions│  │ • Alerts   │  │ • Status    │  │ • Validation│            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
┌─────────────────────────────────────────▼─────────────────────────────────────────┐
│                              DATA LAYER                                          │
│                                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │
│  │   USERS     │  │   CRANES    │  │  TELEMETRY  │  │   TICKETS   │            │
│  │ COLLECTION  │  │ COLLECTION  │  │ COLLECTION  │  │ COLLECTION  │            │
│  │             │  │             │  │             │  │             │            │
│  │ • User Data │  │ • Crane Info│  │ • Real-time │  │ • Issue Data│            │
│  │ • Roles     │  │ • Status    │  │ • Sensor    │  │ • Status    │            │
│  │ • Permissions│  │ • Assignments│ │ • Alerts   │  │ • Assignments│           │
│  │ • Login Info│  │ • Telemetry │  │ • Historical│  │ • Resolution│            │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘            │
└─────────────────────────────────────────┬─────────────────────────────────────────┘
                                          │
                    ┌─────────────────────▼───────────────────────────┐
                    │              EXTERNAL SYSTEMS                  │
                    │                                                 │
                    │  ┌─────────────────────────────────────────┐   │
                    │  │           MQTT BROKER                   │   │
                    │  │                                         │   │
                    │  │  • Real-time Telemetry Data            │   │
                    │  │  • Crane Status Updates                │   │
                    │  │  • Alert Notifications                 │   │
                    │  │  • WebSocket Integration               │   │
                    │  └─────────────────────────────────────────┘   │
                    └─────────────────────────────────────────────────┘
```

## Role-Based Access Control Architecture

### User Hierarchy & Permissions

```
ADMIN (Level 4)
├── Full System Access
├── User Management
├── System Configuration
├── All Crane Operations
└── All Ticket Operations

MANAGER (Level 3)
├── Assigned Crane Management
├── User Creation (Supervisor/Operator)
├── Crane Assignment
├── Report Generation
└── Ticket Management

SUPERVISOR (Level 2)
├── Assigned Crane Monitoring
├── Operator Assignment
├── Ticket Creation & Assignment
├── Alert Management
└── Status Updates

OPERATOR (Level 1)
├── Assigned Crane Monitoring
├── Ticket Status Updates
├── Alert Acknowledgment
└── Basic Operations
```

## Crane Management System

### Real-Time Monitoring Flow

```
CRANE SENSORS → MQTT BROKER → BACKEND PROCESSING → DATABASE → FRONTEND DISPLAY
     │              │                │                    │            │
     │              │                │                    │            │
     ▼              ▼                ▼                    ▼            ▼
┌─────────┐   ┌─────────┐    ┌─────────────┐    ┌─────────┐   ┌─────────┐
│ Load    │   │ Topic:  │    │ Parse &     │    │ Store   │   │ Real-time│
│ SWL     │   │ crane/  │    │ Validate    │    │ Data    │   │ Dashboard│
│ Limit   │   │ +/telemetry│  │ Data        │    │         │   │         │
│ Switches│   │         │    │             │    │         │   │         │
│ Util%   │   │         │    │ Check       │    │         │   │         │
│         │   │         │    │ Alerts      │    │         │   │         │
└─────────┘   └─────────┘    └─────────────┘    └─────────┘   └─────────┘
```

### Crane Assignment Workflow

```
MANAGER → ASSIGNS CRANES → SUPERVISOR → ASSIGNS TO OPERATORS → OPERATOR MONITORS
   │           │              │              │                    │
   │           │              │              │                    │
   ▼           ▼              ▼              ▼                    ▼
┌─────────┐ ┌─────────┐   ┌─────────┐   ┌─────────┐         ┌─────────┐
│ Select  │ │ Update  │   │ Receive │   │ Assign  │         │ Monitor │
│ Cranes  │ │ Database│   │ Assignment│  │ to Ops  │         │ Assigned│
│         │ │         │   │         │   │         │         │ Cranes  │
└─────────┘ └─────────┘   └─────────┘   └─────────┘         └─────────┘
```

## Ticket Management System

### Automatic Ticket Generation

```
CRANE TELEMETRY → ALERT DETECTION → TICKET CREATION → ASSIGNMENT → RESOLUTION
       │                │                │              │            │
       │                │                │              │            │
       ▼                ▼                ▼              ▼            ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐  ┌─────────┐
│ Load > SWL  │  │ Overload    │  │ Create      │  │ Assign  │  │ Update  │
│ Limit Switch│  │ Detection   │  │ Ticket      │  │ to User │  │ Status  │
│ Failure     │  │             │  │             │  │         │  │         │
│ High Util%  │  │             │  │             │  │         │  │         │
└─────────────┘  └─────────────┘  └─────────────┘  └─────────┘  └─────────┘
```

### Ticket Lifecycle

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
  │         │           │         │
  │         │           │         │
  ▼         ▼           ▼         ▼
┌─────┐  ┌─────────┐  ┌─────┐  ┌─────┐
│ New │  │ Assigned│  │Fixed│  │Done │
│Issue│  │ Working │  │Issue│  │Issue│
└─────┘  └─────────┘  └─────┘  └─────┘
```

## Data Flow Architecture

### Real-Time Data Processing

```
1. CRANE SENSORS
   ↓
2. MQTT BROKER (Mosquitto)
   ↓
3. BACKEND MQTT CLIENT
   ↓
4. DATA PARSING & VALIDATION
   ↓
5. DATABASE STORAGE (MongoDB)
   ↓
6. WEBSOCKET BROADCAST
   ↓
7. FRONTEND REAL-TIME UPDATE
```

### User Authentication Flow

```
1. USER LOGIN
   ↓
2. CREDENTIAL VALIDATION
   ↓
3. JWT TOKEN GENERATION
   ↓
4. ROLE-BASED PERMISSIONS
   ↓
5. DASHBOARD RENDERING
   ↓
6. API ACCESS CONTROL
```

## Security Architecture

### Multi-Layer Security

```
┌─────────────────────────────────────────────────────────────────┐
│                        SECURITY LAYERS                         │
├─────────────────────────────────────────────────────────────────┤
│ 1. RATE LIMITING     │ 100 requests/minute per IP              │
│ 2. INPUT VALIDATION  │ Joi schema validation on all inputs    │
│ 3. AUTHENTICATION    │ JWT tokens with httpOnly cookies        │
│ 4. AUTHORIZATION     │ Role-based access control               │
│ 5. CORS PROTECTION   │ Configured for specific origins        │
│ 6. SECURITY HEADERS  │ Helmet.js security headers             │
│ 7. ERROR HANDLING    │ Structured error responses             │
│ 8. AUDIT LOGGING     │ Complete request/response logging      │
└─────────────────────────────────────────────────────────────────┘
```

## Scalability & Performance

### Horizontal Scaling

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   LOAD      │    │   LOAD      │    │   LOAD      │
│  BALANCER   │    │  BALANCER   │    │  BALANCER   │
└─────┬───────┘    └─────┬───────┘    └─────┬───────┘
      │                  │                  │
      ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   BACKEND   │    │   BACKEND   │    │   BACKEND   │
│   SERVER 1  │    │   SERVER 2  │    │   SERVER 3  │
└─────┬───────┘    └─────┬───────┘    └─────┬───────┘
      │                  │                  │
      └──────────────────┼──────────────────┘
                         │
                         ▼
                ┌─────────────┐
                │   MONGODB   │
                │   CLUSTER   │
                └─────────────┘
```

## Technology Stack

### Frontend
- **Next.js 14** - React framework with SSR
- **React 18** - Component-based UI
- **Tailwind CSS** - Utility-first styling
- **Socket.IO Client** - Real-time communication
- **React Query** - Data fetching and caching

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **Socket.IO** - WebSocket communication
- **MQTT.js** - MQTT client for telemetry
- **JWT** - Authentication tokens
- **Joi** - Input validation

### Database
- **MongoDB** - NoSQL document database
- **Mongoose** - ODM for MongoDB

### Infrastructure
- **Docker** - Containerization
- **Docker Compose** - Multi-container orchestration
- **Mosquitto** - MQTT message broker

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRODUCTION SETUP                        │
├─────────────────────────────────────────────────────────────────┤
│ 1. REVERSE PROXY (Nginx)     │ SSL termination, load balancing │
│ 2. APPLICATION SERVERS       │ Multiple Node.js instances      │
│ 3. DATABASE CLUSTER          │ MongoDB replica set             │
│ 4. MQTT BROKER CLUSTER       │ High availability MQTT          │
│ 5. MONITORING STACK          │ Health checks, metrics, alerts  │
│ 6. BACKUP SYSTEM             │ Automated daily backups         │
└─────────────────────────────────────────────────────────────────┘
```

This architecture ensures high availability, scalability, and maintainability for industrial crane monitoring operations.
