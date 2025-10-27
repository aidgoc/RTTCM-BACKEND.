# 👥 Tower Dynamics User Guide

Complete guide for all user roles in the Tower Dynamics system.

## 📋 Table of Contents

1. [Super Admin Guide](#super-admin-guide)
2. [Company Admin Guide](#company-admin-guide)
3. [Manager Guide](#manager-guide)
4. [Supervisor Guide](#supervisor-guide)
5. [Operator Guide](#operator-guide)
6. [Common Operations](#common-operations)

---

## Super Admin Guide

### Overview
Super Admins manage the entire system and all client companies. You work for **Dynamic Crane Engineers Pvt. Ltd.** and manage the SaaS platform.

### Getting Started

#### 1. Login
1. Navigate to `/login`
2. **Check "Login as Super Admin"** checkbox
3. Enter your credentials:
   - Email
   - Password
   - **Head Office ID** (secure access key)
4. Click "Login"

#### 2. Dashboard (`/superadmin`)

You'll see three main sections:

**Financial Overview:**
- 💰 **Total Revenue** - Monthly recurring revenue
- 📈 **Active Subscriptions** - Number of active clients
- ⚠️ **Pending Payments** - Payments due
- 📉 **Overdue Payments** - Unpaid subscriptions

**Hardware Deployment:**
- 📦 **Total DRM Devices** - All deployed devices
- ✅ **Active Devices** - Currently online
- ⚠️ **Maintenance Required** - Devices needing attention
- 🔴 **Offline Devices** - Not responding

**Company Cards:**
Each company card shows:
- Company name and status
- Admin contact information
- Device count and active cranes
- Monthly rental amount
- Payment status
- Last activity

### Key Features

#### Adding a New Company
1. Click **"Add New Company"** button
2. Fill in company details:
   - Company name
   - Contact information
   - Subscription plan
   - Payment details
3. Create Company Admin:
   - Email
   - Password
   - Assign admin role
4. Save

#### Managing Companies
- **View Details**: See company statistics
- **Billing**: Record payments and view history
- **Devices**: Monitor device health
- **Contact**: Access company information

#### Managing Payments
1. Go to company details
2. Click **"Record Payment"**
3. Enter:
   - Payment amount
   - Payment date
   - Payment method
   - Notes
4. Submit

### Permissions
✅ View all companies
✅ Create/edit/delete companies
✅ Manage all users
✅ Access financial reports
✅ Monitor all devices
✅ System configuration

---

## Company Admin Guide

### Overview
Company Admins manage their own company's operations, users, and cranes.

### Getting Started

#### 1. Login
1. Navigate to `/login`
2. **Do NOT** check "Login as Super Admin"
3. Enter:
   - Email (provided by Super Admin)
   - Password
4. Click "Login"

#### 2. Dashboard
After login, you'll see:
- **Fleet Overview** - All cranes in your company
- **Status Cards** - Online/Offline/Alerts
- **Recent Activity** - Latest telemetry
- **Quick Actions** - Common tasks

### Managing Users

#### Creating a Manager
1. Click **"Users"** → **"Create User"**
2. Fill in details:
   - Name
   - Email
   - Phone
   - Role: Manager
   - Password
3. Save

#### Assigning Cranes to Managers
1. Go to **"Cranes"** → Select a crane
2. Click **"Assignments"**
3. Choose Manager(s)
4. Save

### Managing Cranes

#### Adding a Crane
1. Click **"Add Crane"**
2. Enter:
   - Crane ID (e.g., TC-001)
   - Name
   - Location
   - Coordinates
   - SWL (Safe Working Load)
3. Save

#### Monitoring Cranes
- **Dashboard**: Overview of all cranes
- **Crane Cards**: Individual crane status
- **Map View**: Geographic locations
- **Details Page**: Real-time telemetry, charts, history

### Viewing Reports
1. Go to **"Analytics"**
2. Select:
   - Date range
   - Cranes
   - Metrics
3. Generate report

### Permissions
✅ Manage all users in your company
✅ Create/edit/delete cranes
✅ View all company data
✅ Generate reports
✅ Manage subscriptions

---

## Manager Guide

### Overview
Managers oversee crane operations and coordinate between supervisors and operators.

### Getting Started

#### Dashboard
You'll see:
- **Assigned Cranes** - Cranes you manage
- **Team Summary** - Supervisors and operators
- **Alerts** - Active issues
- **Performance Metrics** - Utilization, uptime

### Managing Team

#### Creating a Supervisor
1. Click **"Users"** → **"Create User"**
2. Select role: **Supervisor**
3. Fill in details
4. Assign cranes to the new supervisor

#### Creating an Operator
1. Click **"Users"** → **"Create User"**
2. Select role: **Operator**
3. Fill in details
4. Operator can be assigned by supervisors

### Monitoring Operations

#### Crane Status
- **Map View**: See all assigned cranes on map
- **Card View**: Status cards for each crane
- **Table View**: Detailed data table

#### Ticket Management
1. View active tickets
2. Assign tickets to operators
3. Track progress
4. Close resolved tickets

### Permissions
✅ View assigned cranes
✅ Create supervisors and operators
✅ Assign cranes to team members
✅ View reports
✅ Manage tickets for assigned cranes
❌ Cannot create/edit cranes
❌ Cannot manage company users

---

## Supervisor Guide

### Overview
Supervisors monitor specific cranes and manage operators.

### Getting Started

#### Dashboard
- **My Cranes** - Assigned cranes
- **Alerts** - Active issues
- **Operators** - Team members
- **Recent Activity** - Latest updates

### Monitoring Cranes

#### Real-Time View
1. Select a crane from dashboard
2. View live telemetry:
   - Current load
   - SWL (Safe Working Load)
   - Limit switch status
   - Utilization
   - Last communication

#### Creating Tickets
When an issue is detected:
1. Click **"Create Ticket"**
2. Fill in:
   - Issue type
   - Description
   - Priority
   - Assign to operator
3. Submit

### Managing Operators

#### Assigning Operators
1. Go to **"Users"** → **"Operators"**
2. Select an operator
3. Assign cranes
4. Save

### Permissions
✅ Monitor assigned cranes
✅ Create tickets
✅ Assign operators
✅ Update ticket status
✅ View alerts
❌ Cannot create users
❌ Cannot edit crane details

---

## Operator Guide

### Overview
Operators monitor assigned cranes and update ticket status.

### Getting Started

#### Dashboard
- **My Cranes** - Only your assigned cranes
- **Active Tickets** - Issues to resolve
- **Alerts** - Important notifications

### Monitoring

#### Checking Crane Status
1. Click on a crane card
2. View:
   - Current load vs SWL
   - Status indicators
   - Recent telemetry
   - Historical data

#### Viewing Tickets
1. Go to **"Tickets"**
2. See assigned tickets
3. Update status:
   - **In Progress** - Working on it
   - **Resolved** - Fixed
   - **Closed** - Confirmed

### Updating Ticket Status

#### Steps
1. Open a ticket
2. Add update/comment
3. Change status if applicable
4. Save

### Permissions
✅ View assigned cranes only
✅ View own tickets
✅ Update ticket status
✅ Acknowledge alerts
❌ Cannot create tickets
❌ Cannot manage users
❌ Cannot view reports

---

## Common Operations

### Viewing Crane Details

#### From Dashboard
1. Click any crane card
2. View modal with:
   - Status indicators
   - Recent telemetry
   - Location map
   - Quick actions

#### Full Details Page
1. Click **"View Details"** or crane ID
2. See complete information:
   - Telemetry charts
   - Historical data
   - Ticket history
   - Limit test results

### Understanding Crane Status

#### Status Indicators
- 🟢 **Online** - Connected and healthy
- 🟡 **Warning** - Minor issues
- 🔴 **Alert** - Critical issues
- ⚫ **Offline** - Not connected

#### Limit Status
- **OK** - Within normal range
- **WARNING** - Approaching limit
- **FAIL** - Exceeded limit
- **UNKNOWN** - Data unavailable

### Alert System

#### Alert Types
1. **Overload Alert** - Load > SWL
2. **Limit Switch Failure** - Switch not OK
3. **Offline Alert** - No recent data
4. **High Utilization** - Usage > threshold

#### Receiving Alerts
- Dashboard notifications
- Email notifications (if configured)
- Mobile alerts (if configured)

### Ticket Workflow

```
OPEN → IN_PROGRESS → RESOLVED → CLOSED
  ↓        ↓            ↓
New    Assigned    Fixed    Done
```

1. **Open** - Issue created
2. **In Progress** - Being worked on
3. **Resolved** - Issue fixed
4. **Closed** - Confirmed resolved

### Navigation Tips

#### Sidebar Menu
- **Dashboard** - Main overview
- **Cranes** - Crane management
- **Tickets** - Issue tracking
- **Users** - Team management
- **Analytics** - Reports
- **Settings** - Preferences

#### Keyboard Shortcuts
- `Ctrl + K` - Quick search
- `Alt + D` - Dashboard
- `Alt + C` - Cranes
- `Alt + T` - Tickets

### Best Practices

#### For Super Admins
- Regularly check financial status
- Monitor device health
- Follow up on overdue payments
- Keep company information updated

#### For Company Admins
- Regularly audit users
- Monitor crane assignments
- Review reports monthly
- Communicate with Super Admin

#### For Managers
- Daily crane status review
- Coordinate team operations
- Regular ticket updates
- Performance tracking

#### For Supervisors
- Monitor assigned cranes closely
- Quick ticket response
- Regular operator check-ins
- Alert management

#### For Operators
- Check crane status regularly
- Respond to tickets promptly
- Update status accurately
- Report issues immediately

---

## 🆘 Need Help?

- **Documentation**: Check [Troubleshooting](./troubleshooting.md)
- **FAQs**: See [FAQ](./faq.md)
- **Contact**: Reach out to your admin
- **Issues**: Report technical problems

---

**Remember**: Always log out when finished, especially on shared computers!

