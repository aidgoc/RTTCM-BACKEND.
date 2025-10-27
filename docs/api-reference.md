# 📡 API Reference

Complete API documentation for Tower Dynamics backend.

## Base URL

```
Development: http://localhost:3001
Production: https://your-domain.com
```

## Authentication

All API requests (except authentication endpoints) require a valid JWT token in an httpOnly cookie.

### Headers
```
Cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Authentication Endpoints

### Login
```http
POST /api/auth/login
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password123",
  "headOfficeId": "optional-for-superadmin"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "admin@example.com",
    "role": "admin",
    "name": "Admin User"
  },
  "token": "jwt_token"
}
```

---

### Signup
```http
POST /api/auth/signup
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "operator",
  "phone": "+1234567890",
  "companyId": "company_id",
  "headOfficeId": "optional-for-superadmin"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "john@example.com",
    "role": "operator"
  }
}
```

---

### Get Current User
```http
GET /api/auth/me
```

**Response:**
```json
{
  "id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "operator",
  "companyId": "company_id",
  "assignedCranes": ["TC-001", "TC-002"]
}
```

---

### Logout
```http
POST /api/auth/logout
```

**Response:**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Company Endpoints

> **Note:** Most company endpoints require Super Admin role

### Get All Companies
```http
GET /api/companies
```

**Query Parameters:**
- `status` - Filter by status (active, inactive, suspended)
- `plan` - Filter by plan (basic, standard, enterprise)
- `page` - Page number
- `limit` - Items per page

**Response:**
```json
{
  "companies": [
    {
      "id": "company_id",
      "name": "ABC Construction",
      "admin": "admin@abc.com",
      "status": "active",
      "plan": "standard",
      "devices": {
        "total": 10,
        "active": 8,
        "offline": 2
      },
      "stats": {
        "totalCranes": 15,
        "users": 45
      },
      "financial": {
        "monthlyAmount": 30000,
        "paymentStatus": "paid",
        "lastPaymentDate": "2025-01-15"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

---

### Get Company Stats
```http
GET /api/companies/stats
```

**Response:**
```json
{
  "financial": {
    "totalRevenue": 500000,
    "activeSubscriptions": 15,
    "pendingPayments": 50000,
    "overduePayments": 25000
  },
  "hardware": {
    "totalDevices": 150,
    "activeDevices": 135,
    "maintenanceRequired": 10,
    "offlineDevices": 5
  },
  "companies": {
    "total": 15,
    "active": 12,
    "inactive": 2,
    "suspended": 1
  }
}
```

---

### Get Company by ID
```http
GET /api/companies/:id
```

**Response:**
```json
{
  "id": "company_id",
  "name": "ABC Construction",
  "admin": {
    "id": "admin_id",
    "name": "Admin User",
    "email": "admin@abc.com",
    "phone": "+1234567890"
  },
  "contact": {
    "address": "123 Main St",
    "city": "New York",
    "phone": "+1234567890"
  },
  "subscription": {
    "plan": "standard",
    "status": "active",
    "billingCycle": "monthly"
  },
  "financial": {
    "deviceCount": 10,
    "deviceRate": 3000,
    "monthlyAmount": 30000,
    "gst": 5400,
    "totalAmount": 35400,
    "paymentStatus": "paid",
    "lastPaymentDate": "2025-01-15",
    "nextBillingDate": "2025-02-15"
  },
  "stats": {
    "totalCranes": 15,
    "users": {
      "total": 45,
      "byRole": {
        "admin": 1,
        "manager": 5,
        "supervisor": 10,
        "operator": 29
      }
    },
    "devices": {
      "total": 10,
      "active": 8,
      "offline": 2
    }
  }
}
```

---

### Create Company
```http
POST /api/companies
```

**Request Body:**
```json
{
  "name": "XYZ Corporation",
  "adminEmail": "admin@xyz.com",
  "adminName": "Admin User",
  "adminPhone": "+1234567890",
  "contact": {
    "address": "456 Oak Ave",
    "city": "Los Angeles",
    "phone": "+1987654321"
  },
  "subscription": {
    "plan": "standard",
    "billingCycle": "monthly"
  },
  "financial": {
    "deviceCount": 5,
    "deviceRate": 3000
  }
}
```

**Response:**
```json
{
  "success": true,
  "company": {
    "id": "company_id",
    "name": "XYZ Corporation"
  },
  "adminCredentials": {
    "email": "admin@xyz.com",
    "password": "temporary_password"
  }
}
```

---

### Update Company
```http
PUT /api/companies/:id
```

**Request Body:**
```json
{
  "name": "Updated Name",
  "contact": {
    "phone": "+1999999999"
  },
  "subscription": {
    "status": "active"
  }
}
```

---

### Record Payment
```http
POST /api/companies/:id/payment
```

**Request Body:**
```json
{
  "amount": 35400,
  "paymentDate": "2025-01-15",
  "method": "bank_transfer",
  "reference": "TXN-12345",
  "notes": "Monthly subscription payment"
}
```

---

### Delete Company
```http
DELETE /api/companies/:id
```

**Response:**
```json
{
  "success": true,
  "message": "Company deactivated successfully"
}
```

---

### Get Company Users
```http
GET /api/companies/:id/users
```

**Response:**
```json
{
  "users": [
    {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "operator",
      "status": "active"
    }
  ]
}
```

---

## Crane Endpoints

### Get All Cranes
```http
GET /api/cranes
```

**Query Parameters:**
- `status` - Filter by status
- `assignment` - Filter by assignment status
- `companyId` - Filter by company (admin only)

**Response:**
```json
{
  "cranes": [
    {
      "id": "crane_id",
      "craneId": "TC-001",
      "name": "Crane A",
      "location": "Site A",
      "status": "online",
      "currentLoad": 85,
      "swl": 100,
      "lastUpdate": "2025-01-15T10:30:00Z"
    }
  ]
}
```

---

### Get Crane by ID
```http
GET /api/cranes/:id
```

**Response:**
```json
{
  "id": "crane_id",
  "craneId": "TC-001",
  "name": "Crane A",
  "location": "Site A",
  "locationData": {
    "coordinates": [-74.006, 40.7128],
    "siteAddress": "123 Main St, New York"
  },
  "specifications": {
    "swl": 100,
    "height": 150,
    "boomLength": 60
  },
  "status": {
    "online": true,
    "currentLoad": 85,
    "utilization": 85,
    "lastUpdate": "2025-01-15T10:30:00Z"
  },
  "telemetry": {
    "load": 85,
    "swl": 100,
    "ls1": "OK",
    "ls2": "OK",
    "ls3": "OK",
    "util": 85
  }
}
```

---

### Create Crane
```http
POST /api/cranes
```

**Request Body:**
```json
{
  "craneId": "TC-002",
  "name": "Crane B",
  "location": "Site B",
  "locationData": {
    "coordinates": [-74.006, 40.7128],
    "siteAddress": "456 Oak Ave, New York"
  },
  "specifications": {
    "swl": 120,
    "height": 180,
    "boomLength": 70
  },
  "companyId": "company_id"
}
```

---

### Update Crane
```http
PATCH /api/cranes/:id
```

---

### Delete Crane
```http
DELETE /api/cranes/:id
```

---

### Get Crane Telemetry
```http
GET /api/cranes/:id/telemetry
```

**Query Parameters:**
- `from` - Start date (ISO 8601)
- `to` - End date (ISO 8601)
- `limit` - Number of records

**Response:**
```json
{
  "telemetry": [
    {
      "timestamp": "2025-01-15T10:30:00Z",
      "load": 85,
      "swl": 100,
      "ls1": "OK",
      "ls2": "OK",
      "ls3": "OK",
      "util": 85
    }
  ]
}
```

---

## Ticket Endpoints

### Get All Tickets
```http
GET /api/tickets
```

**Query Parameters:**
- `status` - Filter by status
- `craneId` - Filter by crane
- `assigneeId` - Filter by assignee

---

### Create Ticket
```http
POST /api/tickets
```

**Request Body:**
```json
{
  "craneId": "TC-001",
  "type": "overload",
  "description": "Load exceeded SWL",
  "priority": "high",
  "assigneeId": "user_id"
}
```

---

### Update Ticket
```http
PATCH /api/tickets/:id
```

---

## User Endpoints

### Get All Users
```http
GET /api/users
```

**Query Parameters:**
- `role` - Filter by role
- `status` - Filter by status

---

### Create User
```http
POST /api/users
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "operator",
  "phone": "+1234567890",
  "companyId": "company_id"
}
```

---

### Update User
```http
PATCH /api/users/:id
```

---

### Delete User
```http
DELETE /api/users/:id
```

---

## Health Check

### Health Status
```http
GET /health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00Z",
  "services": {
    "database": "connected",
    "mqtt": "connected",
    "redis": "connected"
  }
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Invalid input data",
  "details": {
    "field": "error description"
  }
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid or expired token"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

---

## Rate Limiting

- **General**: 100 requests/minute
- **Authentication**: 5 requests/2 minutes
- **API**: 100 requests/minute

Headers returned on rate limit:
```
X-Rate-Limit-Limit: 100
X-Rate-Limit-Remaining: 45
X-Rate-Limit-Reset: 1642144800
```

---

## WebSocket Events

### Connection
Connect with JWT token in cookies.

### Telemetry Update
```javascript
socket.on('telemetry', (data) => {
  // craneId, load, swl, status, etc.
});
```

### Crane Created
```javascript
socket.on('crane:created', (data) => {
  // New crane added
});
```

### Alert
```javascript
socket.on('alert', (data) => {
  // Alert notification
});
```

---

## Response Codes Summary

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 429 | Too Many Requests |
| 500 | Internal Server Error |

---

For more information, see [Full Documentation](../docs/README.md)

