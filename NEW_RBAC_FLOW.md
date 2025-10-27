# 🔐 New RBAC Flow & User Management Guide

## Overview
The system has been upgraded to support **multi-tenancy**, allowing Dynamic Crane Engineers (DCE) to act as a **Super Admin** and manage multiple client companies, each with their own admin and team.

---

## 🏗️ Role Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                    SUPER ADMIN                          │
│              (Dynamic Crane Engineers)                   │
│                                                          │
│  • Has Head-Office ID                                   │
│  • Can create and manage all client companies           │
│  • Access to financial and billing data                 │
│  • NO company assignment (global access)                │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Creates Companies & Admins
                  ▼
┌─────────────────────────────────────────────────────────┐
│                      ADMIN                              │
│              (Company Administrator)                     │
│                                                          │
│  • Assigned to ONE company                              │
│  • Can create Managers, Supervisors, Operators          │
│  • Manages company settings and resources               │
│  • Can view all cranes within their company             │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Creates Managers
                  ▼
┌─────────────────────────────────────────────────────────┐
│                     MANAGER                             │
│                                                          │
│  • Assigned to ONE company                              │
│  • Can create Supervisors and Operators                 │
│  • Manages crane assignments and operations             │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Creates Supervisors & Operators
                  ▼
┌─────────────────────────────────────────────────────────┐
│                   SUPERVISOR                            │
│                                                          │
│  • Assigned to ONE company                              │
│  • Can create Operators                                 │
│  • Manages specific crane operations                    │
│  • Assigned to specific cranes                          │
└─────────────────┬───────────────────────────────────────┘
                  │
                  │ Creates Operators
                  ▼
┌─────────────────────────────────────────────────────────┐
│                    OPERATOR                             │
│                                                          │
│  • Assigned to ONE company                              │
│  • Operates assigned cranes                             │
│  • Cannot create other users                            │
└─────────────────────────────────────────────────────────┘
```

---

## 🔑 Authentication Flow

### Super Admin Login
1. Navigate to login page
2. Check "Login as Super Admin" checkbox
3. Enter credentials:
   - **Email**: superadmin email
   - **Password**: superadmin password
   - **Head-Office ID**: Your DCE head office ID
4. Login redirects to Super Admin Dashboard

### Other Roles Login (Admin, Manager, Supervisor, Operator)
1. Navigate to login page
2. **DO NOT** check "Login as Super Admin"
3. Enter credentials:
   - **Email**: Your company email
   - **Password**: Your password
4. Login redirects to role-specific dashboard

---

## 👥 User Creation Flow

### 1️⃣ Super Admin Creates Company & Admin

**Who can do this?** Only Super Admin

**Steps:**
1. Super Admin logs in with Head-Office ID
2. Goes to Super Admin Dashboard
3. Clicks "Add New Company"
4. Fills in company details:
   - Company Name
   - Contact Person
   - Email (will be admin's email)
   - Phone
   - **Admin Full Name**
   - **Admin Password** (must be at least 6 characters)
   - Address
   - Billing Information (devices, price, billing cycle)
5. Submits form
6. System automatically:
   - ✅ Creates the Company record
   - ✅ Creates an Admin user account for that company
   - ✅ Links admin to the company
7. Modal displays admin credentials:
   - Admin Name
   - Admin Email
   - Admin Password
8. Super Admin copies credentials and shares with client securely

**Result:**
- ✅ Company is created with billing setup
- ✅ Admin can now login with email + password
- ✅ Admin is assigned to that specific company

---

### 2️⃣ Admin Creates Managers, Supervisors, Operators

**Who can do this?** Admin (of the company)

**Steps:**
1. Admin logs in (without Head-Office ID)
2. Goes to "Users" or "Team Management" page
3. Clicks "Create New User"
4. Fills in user details:
   - Name
   - Email
   - Password
   - Role (Manager, Supervisor, or Operator)
   - Assigned Cranes (if applicable)
5. Submits form
6. System automatically:
   - ✅ Creates user account
   - ✅ **Automatically assigns them to the SAME company** as the admin
   - ✅ Sets up permissions based on role

**Result:**
- ✅ New user can login with their email + password
- ✅ User is isolated to their company's data
- ❌ User CANNOT see or access other companies' data

---

### 3️⃣ Manager Creates Supervisors & Operators

**Who can do this?** Manager (within their company)

**Steps:**
1. Manager logs in
2. Goes to "Users" or "Team Management" page
3. Can only create:
   - Supervisors
   - Operators
4. Same process as Admin, but limited role options
5. System automatically assigns new users to **Manager's company**

**Result:**
- ✅ New users belong to the same company
- ✅ Users can only access their company's resources

---

### 4️⃣ Supervisor Creates Operators

**Who can do this?** Supervisor (within their company)

**Steps:**
1. Supervisor logs in
2. Goes to "Users" page
3. Can only create: **Operators**
4. System automatically assigns operator to **Supervisor's company**

**Result:**
- ✅ Operator belongs to the same company
- ✅ Limited permissions (crane operations only)

---

## 🔒 Key Security Features

### Company Isolation
- Each company has a unique `companyId`
- Users (Admin, Manager, Supervisor, Operator) are assigned to **ONE company only**
- Backend automatically filters:
  - Cranes: Users can only see/access cranes in their company
  - Users: Admins can only manage users in their company
  - Tickets: Only tickets for their company's cranes
  - Telemetry: Only data from their company's cranes

### Super Admin Privileges
- **Global Access**: Can view data from all companies
- **Billing Management**: Access to financial data
- **Company Management**: Create, update, disable companies
- **NOT company-bound**: No `companyId` (has `headOfficeId` instead)

### No Public Signup
- Signup page is **ONLY for Super Admin**
- All other roles (Admin, Manager, Supervisor, Operator) are created through:
  - Super Admin creates Admin (when creating company)
  - Admin/Manager/Supervisor create subordinates through the application

---

## 📊 Data Access Permissions

| Role | Can Access | Cannot Access |
|------|-----------|---------------|
| **Super Admin** | • All companies<br>• All users (global)<br>• All cranes (global)<br>• Billing & financial data<br>• System analytics | N/A (Full access) |
| **Admin** | • Their company's data<br>• All users in their company<br>• All cranes in their company<br>• Company settings | • Other companies' data<br>• Super Admin functions<br>• Billing details |
| **Manager** | • Their company's data<br>• Users they created<br>• Assigned cranes<br>• Tickets & telemetry | • Other companies<br>• Company billing<br>• System settings |
| **Supervisor** | • Their company's data<br>• Operators they created<br>• Specifically assigned cranes<br>• Tickets for assigned cranes | • Other companies<br>• Other cranes in company<br>• Financial data |
| **Operator** | • Their company's data<br>• Specifically assigned cranes<br>• Operations panel | • User management<br>• Other cranes<br>• System settings |

---

## 🎯 Example Workflow

### Scenario: DCE onboards "ABC Construction Ltd."

1. **Super Admin (DCE)** logs in with Head-Office ID
2. Clicks "Add New Company"
3. Fills form:
   - Company Name: "ABC Construction Ltd."
   - Contact: "Rajesh Kumar"
   - Email: `rajesh@abcconstruction.com`
   - Phone: +91 9876543210
   - Admin Name: "Rajesh Kumar"
   - Admin Password: "SecurePass123"
   - 25 DRM Devices @ ₹5,000/device
4. Submits → Modal shows:
   ```
   Company Admin Login Credentials
   
   Email: rajesh@abcconstruction.com
   Password: SecurePass123
   ```
5. Super Admin calls Rajesh and shares credentials
6. **Rajesh (Admin)** logs in:
   - Email: `rajesh@abcconstruction.com`
   - Password: `SecurePass123`
   - NO Head-Office ID required
7. Rajesh creates his team:
   - Manager: `suresh@abcconstruction.com`
   - Supervisor: `amit@abcconstruction.com`
   - Operator: `vijay@abcconstruction.com`
8. All users can now login and access **only ABC Construction's** data

---

## 🚫 What Changed?

### Before
- Single-tenant system
- All roles shared the same database without company separation
- No billing or financial tracking
- Public signup for all roles

### After
- ✅ Multi-tenant system with company isolation
- ✅ Super Admin role for DCE
- ✅ Automatic company assignment
- ✅ Billing & financial tracking
- ✅ Restricted signup (Super Admin only)
- ✅ Hierarchical user creation
- ✅ Data isolation per company

---

## 📝 Important Notes

1. **Head-Office ID**: Required ONLY for Super Admin login/signup
2. **Company ID**: Automatically assigned when users are created by their superior
3. **Password Security**: Admins should change their initial password after first login (recommend implementing this feature)
4. **Email Uniqueness**: Each email can only be used once across the entire system
5. **Company Name Uniqueness**: Each company must have a unique name
6. **Credentials Storage**: Super Admin must securely store and share admin credentials

---

## 🔧 Technical Implementation

### Database Schema Changes
- **User Model**: Added `companyId` and `headOfficeId`
- **Company Model**: New collection for company data
- **Middleware**: `enforceCompanyIsolation` ensures data separation

### Backend Routes
- `POST /api/companies` - Create company + admin
- `GET /api/companies` - List all companies (Super Admin)
- `GET /api/companies/:id` - View company details
- `PUT /api/companies/:id` - Update company
- `POST /api/companies/:id/payment` - Record payment
- `DELETE /api/companies/:id` - Deactivate company

### Frontend Pages
- `/superadmin` - Super Admin dashboard with company cards
- `/companies/add` - Create new company form
- `/companies/[id]/details` - Company detail view
- `/login` - Updated with Head-Office ID option
- `/signup` - Restricted to Super Admin only

---

## 🎉 Summary

The new RBAC system enables Dynamic Crane Engineers to operate as a **SaaS provider**, managing multiple client companies with:
- ✅ Complete data isolation
- ✅ Hierarchical user management
- ✅ Financial tracking & billing
- ✅ Scalable multi-tenant architecture
- ✅ Secure authentication flow

Each company operates independently within the system, while DCE maintains oversight through the Super Admin role.

