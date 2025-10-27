# CraneFleet Frontend

Frontend application for the Real-Time Tower Crane Monitoring System built with Next.js.

## Features

- **Role-based UI**: Different layouts for Admin, Manager, and Operator roles
- **Real-time Updates**: Live telemetry data via WebSocket
- **Interactive Dashboard**: Fleet overview with crane status cards
- **Crane Management**: Add, edit, and monitor individual cranes
- **Ticket System**: Create and manage alerts and tickets
- **User Management**: Admin interface for user and role management
- **Simulation Tools**: Test MQTT payload publishing

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create environment file:
```bash
cp .env.local.example .env.local
```

3. Update `.env.local` with your configuration

4. Start the development server:
```bash
npm run dev
```

## Environment Variables

- `NEXT_PUBLIC_API_URL` - Backend API URL (default: http://localhost:3001)
- `NEXT_PUBLIC_WS_URL` - WebSocket URL (default: http://localhost:3001)

## Pages

### Authentication
- `/login` - User login page
- `/signup` - User registration page

### Dashboard
- `/` - Main dashboard with fleet overview
- `/cranes/[id]` - Individual crane detail page

### Management (Admin/Manager)
- `/assets` - Crane management page
- `/tickets` - Ticket management page
- `/users` - User management page (Admin only)
- `/simulation` - MQTT simulation tools

## Components

### Layout Components
- `src/components/layout.jsx` - Role-based layout wrapper
- `src/components/Sidebar.jsx` - Collapsible sidebar for Admin/Manager
- `src/components/TopBar.jsx` - Top navigation for Operator

### UI Components
- `src/components/CraneCard.jsx` - Crane status card
- `src/components/StatusIndicator.jsx` - Status indicators and badges
- `src/components/Charts.jsx` - Recharts components for data visualization

### Forms
- `src/components/forms/LoginForm.jsx` - Login form
- `src/components/forms/CraneForm.jsx` - Crane add/edit form
- `src/components/forms/TicketForm.jsx` - Ticket creation form

## State Management

- **React Query**: Server state management and caching
- **Socket.IO**: Real-time WebSocket communication
- **Context API**: User authentication and role management

## Styling

- **Tailwind CSS**: Utility-first CSS framework
- **Custom Components**: Reusable UI components
- **Responsive Design**: Mobile-first approach

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Project Structure

```
src/
├── components/          # Reusable components
│   ├── layout.jsx      # Main layout component
│   ├── forms/          # Form components
│   └── ui/             # UI components
├── pages/              # Next.js pages
├── lib/                # Utility functions
│   ├── api.js          # API client
│   ├── auth.js         # Authentication utilities
│   └── socket.js       # WebSocket client
├── hooks/              # Custom React hooks
└── styles/             # Global styles
```

## Role-based Access

### Admin
- Full access to all features
- User management
- System configuration
- All cranes and tickets

### Manager
- Crane management for assigned cranes
- Ticket management
- Team oversight
- Simulation tools

### Operator
- Dashboard view only
- Assigned cranes only
- Limited ticket access
- No management features
