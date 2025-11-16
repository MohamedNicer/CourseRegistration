# Course Registration System - Architecture Documentation

## 📋 Table of Contents
1. [System Overview](#system-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Diagrams](#architecture-diagrams)
4. [Data Model](#data-model)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Services](#api-services)
7. [Frontend Applications](#frontend-applications)
8. [Security](#security)
9. [Getting Started](#getting-started)

---

## System Overview

A comprehensive university course registration system with role-based access control, built using SAP Cloud Application Programming Model (CAP), SAPUI5, and Auth0 authentication.

### Key Features

**👨‍🎓 Student Portal**
- View and manage personal profile
- Browse available courses with filtering
- Enroll in courses (with ECTS limit validation)
- View enrollment history and grades
- Real-time analytics dashboard with charts

**👨‍🏫 Instructor Portal**
- View assigned courses
- Manage student enrollments
- Grade students with validation
- Teaching analytics dashboard

**🔧 Admin Portal**
- Complete CRUD operations for all entities
- Cascade delete warnings with impact analysis
- Comprehensive analytics (8+ charts)
- Auto-generated IDs for students, instructors, and courses

---

## Technology Stack

### Backend
- **Framework**: SAP CAP (Cloud Application Programming Model)
- **Runtime**: Node.js
- **Language**: TypeScript (compiled to JavaScript)
- **Database**: SQLite (development), PostgreSQL/HANA (production-ready)
- **API Protocol**: OData V4
- **Authentication**: Auth0 JWT tokens

### Frontend
- **Framework**: SAPUI5 v1.120.0
- **Charts**: Chart.js
- **Authentication**: Auth0 SPA SDK
- **Design**: SAP Fiori design principles
- **Responsive**: Mobile, tablet, and desktop support

### Development Tools
- **Build**: npm, mbt (Multi-Target Application)
- **TypeScript**: Service handlers written in TypeScript, compiled to JavaScript
- **Compiler**: tsx for TypeScript execution, tsc for compilation
- **Version Control**: Git

> **Note:** The backend is written in TypeScript (`.ts` files) and compiled to JavaScript (`.js` files) before execution. The `build-srv.js` script handles this compilation automatically.

---

## Architecture Diagrams

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend Applications                        │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│  Student App    │  Instructor App │       Admin App                 │
│  (SAPUI5)       │  (SAPUI5)       │       (SAPUI5)                  │
│                 │                 │                                 │
│  - Profile      │  - Enrollments  │       - All Students            │
│  - Courses      │  - Grades       │       - All Instructors         │
│  - Enroll       │  - Courses      │       - All Courses             │
│  - Analytics    │  - Analytics    │       - All Enrollments         │
│                 │                 │       - Analytics               │
└────────┬────────┴────────┬────────┴────────┬────────────────────────┘
         │                 │                 │
         │ Auth0 Login     │ Auth0 Login     │ Auth0 Login
         ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                            Auth0                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Authentication & Authorization                               │  │
│  │  - User Login                                                 │  │
│  │  - JWT Token Generation                                       │  │
│  │  - Custom Claims (email, custom:role)                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────┬────────────────────────────────────────────────────────────┘
         │ JWT Token with email & role
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Auth Middleware Layer                            │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  auth-middleware.js                                           │  │
│  │  - Validates JWT Token                                        │  │
│  │  - Extracts email and role claims                             │  │
│  │  - Attaches user info to request                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      CAP Services Layer                              │
├─────────────────┬─────────────────┬─────────────────────────────────┤
│ StudentService  │ InstructorSvc   │      AdminService               │
│                 │                 │                                 │
│ Handler:        │ Handler:        │      Handler:                   │
│ - Filters by    │ - Filters by    │      - No filtering             │
│   user email    │   instructor    │      - Full access              │
│                 │   email         │                                 │
└────────┬────────┴────────┬────────┴────────┬────────────────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Database (SQLite)                           │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐ │
│  │  Students    │  Instructors │  Courses     │  Enrollments     │ │
│  │  - email     │  - email     │  - courseCode│  - student       │ │
│  │  - firstName │  - firstName │  - ects      │  - course        │ │
│  │  - lastName  │  - lastName  │  - quota     │  - grade         │ │
│  │  - ectsLimit │  - department│  - instructor│  - status        │ │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘ │
│  ┌──────────────┬──────────────┐                                   │
│  │ Departments  │ Universities │                                   │
│  │ - name       │ - name       │                                   │
│  │ - faculty    │ - location   │                                   │
│  └──────────────┴──────────────┘                                   │
└─────────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
┌──────────┐                                                    ┌──────────┐
│  User    │                                                    │  Auth0   │
└────┬─────┘                                                    └────┬─────┘
     │                                                               │
     │ 1. Click Login                                                │
     ├──────────────────────────────────────────────────────────────►│
     │                                                               │
     │ 2. Redirect to Auth0 Login Page                               │
     │◄──────────────────────────────────────────────────────────────┤
     │                                                               │
     │ 3. Enter Credentials                                          │
     ├──────────────────────────────────────────────────────────────►│
     │                                                               │
     │                                    4. Validate Credentials    │
     │                                    5. Execute Action          │
     │                                    6. Add email & role claims │
     │                                                               │
     │ 7. Return JWT Token (with email & role)                       │
     │◄──────────────────────────────────────────────────────────────┤
     │                                                               │
     │ 8. Store Token in Memory                                      │
     │                                                               │
┌────┴─────┐                                                    ┌────┴─────┐
│  User    │                                                    │  Auth0   │
└──────────┘                                                    └──────────┘
```

### API Request Flow

```
┌──────────┐         ┌──────────────┐         ┌──────────────┐         ┌──────────┐
│ Frontend │         │     Auth     │         │   Service    │         │ Database │
│   App    │         │  Middleware  │         │   Handler    │         │          │
└────┬─────┘         └──────┬───────┘         └──────┬───────┘         └────┬─────┘
     │                      │                        │                      │
     │ 1. GET /student/MyProfile                     │                      │
     │      Authorization: Bearer <JWT>              │                      │
     ├─────────────────────►│                        │                      │
     │                      │                        │                      │
     │                      │ 2. Validate JWT        │                      │
     │                      │    Extract email       │                      │
     │                      │    Extract role        │                      │
     │                      │                        │                      │
     │                      │ 3. Attach user to req  │                      │
     │                      │                        │                      │
     │                      │ 4. Forward request     │                      │
     │                      ├───────────────────────►│                      │
     │                      │                        │                      │
     │                      │                        │ 5. Extract email     │
     │                      │                        │    from req.user     │
     │                      │                        │                      │
     │                      │                        │ 6. Add WHERE clause  │
     │                      │                        │    email = 'user@...'│
     │                      │                        │                      │
     │                      │                        │ 7. Execute query     │
     │                      │                        ├─────────────────────►│
     │                      │                        │                      │
     │                      │                        │ 8. Return results    │
     │                      │                        │◄─────────────────────┤
     │                      │                        │                      │
     │                      │ 9. Return filtered data│                      │
     │                      │◄───────────────────────┤                      │
     │                      │                        │                      │
     │ 10. Display data     │                        │                      │
     │◄─────────────────────┤                        │                      │
     │                      │                        │                      │
┌────┴─────┐         ┌──────┴───────┐         ┌──────┴───────┐         ┌────┴─────┐
│ Frontend │         │     Auth     │         │   Service    │         │ Database │
│   App    │         │  Middleware  │         │   Handler    │         │          │
└──────────┘         └──────────────┘         └──────────────┘         └──────────┘
```

### Role-Based Access Control

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Access Control Matrix                        │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────┤
│ Endpoint     │ Student      │ Instructor   │ Admin        │ Public  │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────┤
│ /            │      ✓       │      ✓       │      ✓       │    ✓    │
│ /launchpad   │      ✓       │      ✓       │      ✓       │    ✓    │
│ /resources   │      ✓       │      ✓       │      ✓       │    ✓    │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────┤
│ /student/**  │      ✓       │      ✗       │      ✗       │    ✗    │
│              │ (own data)   │              │              │         │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────┤
│ /instructor/**│     ✗       │      ✓       │      ✗       │    ✗    │
│              │              │ (own courses)│              │         │
├──────────────┼──────────────┼──────────────┼──────────────┼─────────┤
│ /admin/**    │      ✗       │      ✗       │      ✓       │    ✗    │
│              │              │              │ (all data)   │         │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────┘

Legend:
  ✓ = Allowed
  ✗ = Forbidden (403)
```

---

## Data Model

### Entity Relationship Diagram

```
┌─────────────────┐
│  Universities   │
│─────────────────│
│ ID (PK)         │
│ universityName  │
│ location        │
└────────┬────────┘
         │
         │ 1:N
         ▼
┌─────────────────┐
│  Departments    │
│─────────────────│
│ ID (PK)         │
│ departmentName  │
│ faculty         │
│ university (FK) │
└────┬───────┬────┘
     │       │
     │ 1:N   │ 1:N
     ▼       ▼
┌────────────────┐    ┌─────────────────┐
│   Students     │    │  Instructors    │
│────────────────│    │─────────────────│
│ ID (PK)        │    │ ID (PK)         │
│ studentNumber  │    │ instructorId    │
│ email          │    │ email           │
│ firstName      │    │ firstName       │
│ lastName       │    │ lastName        │
│ ectsLimit      │    │ department (FK) │
│ department (FK)│    └────────┬────────┘
└────────┬───────┘             │
         │                     │ 1:N
         │                     ▼
         │            ┌─────────────────┐
         │            │    Courses      │
         │            │─────────────────│
         │            │ ID (PK)         │
         │            │ courseCode      │
         │            │ courseName      │
         │            │ description     │
         │            │ ects            │
         │            │ quota           │
         │            │ enrolled        │
         │            │ isActive        │
         │            │ semester        │
         │            │ instructor (FK) │
         │            │ department (FK) │
         │            └────────┬────────┘
         │                     │
         │ N:M                 │ 1:N
         │                     │
         │            ┌────────▼────────┐
         └───────────►│  Enrollments    │
                      │─────────────────│
                      │ ID (PK)         │
                      │ student (FK)    │
                      │ course (FK)     │
                      │ enrollmentDate  │
                      │ status          │
                      │ grade           │
                      └─────────────────┘
```

### Entity Descriptions

**Universities**
- Represents educational institutions
- Contains basic information like name and location

**Departments**
- Organizational units within universities
- Linked to faculty and university
- Used for categorizing students, instructors, and courses

**Students**
- User accounts for students
- Auto-generated student numbers (STU001, STU002...)
- ECTS limit for enrollment validation
- Email used for Auth0 authentication

**Instructors**
- User accounts for teaching staff
- Auto-generated instructor IDs (INS001, INS002...)
- Email used for Auth0 authentication
- Assigned to specific departments

**Courses**
- Academic courses offered by the university
- Auto-generated course codes based on department (CS101, BA201...)
- Quota management for enrollment capacity
- Linked to instructor and department

**Enrollments**
- Junction table for student-course relationship
- Tracks enrollment status (ENROLLED, COMPLETED, DROPPED)
- Stores grades (0-20 scale)
- Includes enrollment date for auditing

---

## Authentication & Authorization

### Auth0 Integration

#### JWT Token Structure

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "abc123"
  },
  "payload": {
    "iss": "https://dev-abc123.us.auth0.com/",
    "sub": "auth0|123456789",
    "aud": "https://api.courseregistration.com",
    "iat": 1699999999,
    "exp": 1700003599,
    "email": "student@example.com",
    "email_verified": true,
    "custom:role": "student",
    "role": "student",
    "name": "John Doe"
  },
  "signature": "..."
}
```

#### Auth0 Action (Post-Login)

The system uses an Auth0 Action to add email and role claims to access tokens:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const userEmail = event.user.email;
  const userRole = event.user.app_metadata?.role || 'student';
  
  // Add email to access token
  if (userEmail) {
    api.accessToken.setCustomClaim('email', userEmail);
    api.accessToken.setCustomClaim('name', event.user.name || userEmail);
  }
  
  // Add role to access token
  api.accessToken.setCustomClaim('custom:role', userRole);
  api.accessToken.setCustomClaim('role', userRole);
};
```

#### Configuration

**Auth0 Application Settings:**
- Application Type: Single Page Application
- Allowed Callback URLs: `http://localhost:4004/*`
- Allowed Logout URLs: `http://localhost:4004/*`
- Allowed Web Origins: `http://localhost:4004`
- Token Endpoint Authentication Method: None

**Frontend Configuration (index.html):**
```javascript
window.Auth0Config = {
    domain: "your-domain.auth0.com",
    clientId: "your-client-id",
    redirectUri: "http://localhost:4004/app/student/webapp/index.html",
    audience: "https://api.courseregistration.com",
    scope: "openid profile email"
};
```

### Data Filtering Logic

#### Student Service
```javascript
// Extract email from JWT token
const userEmail = req.user.email;

// Filter queries to show only user's own data
req.query.where({ email: userEmail });

// Result: Student sees only their own profile and enrollments
```

#### Instructor Service
```javascript
// Extract email from JWT token
const instructorEmail = req.user.email;

// Filter queries to show only instructor's courses
req.query.where({ 'course.instructor.email': instructorEmail });

// Result: Instructor sees only their own courses and related enrollments
```

#### Admin Service
```javascript
// No filtering applied
// Result: Admin sees all data across the system
```

### Security Layers

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Security Layers                              │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 1: HTTPS (Transport Security)                                │
│  - Encrypts all data in transit                                     │
│  - Prevents man-in-the-middle attacks                               │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 2: JWT Token Validation (Authentication)                     │
│  - Validates token signature                                        │
│  - Checks token expiration                                          │
│  - Verifies issuer and audience                                     │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 3: Role-Based Access Control (Authorization)                 │
│  - Checks user role from custom:role claim                          │
│  - Enforces endpoint access rules                                   │
│  - Returns 403 if role doesn't match                                │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 4: Data Filtering (Data Security)                            │
│  - Filters queries by user email                                    │
│  - Ensures users see only their own data                            │
│  - Prevents unauthorized data access                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## API Services

### Student Service (`/student`)

**Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/MyProfile` | Get logged-in student's profile | Student only |
| GET | `/AvailableCourses` | List all active courses | Student only |
| GET | `/MyEnrollments` | Get student's enrollments | Student only |
| POST | `/Enrollments` | Enroll in a course | Student only |
| DELETE | `/Enrollments(ID)` | Drop a course | Student only |

**Business Logic:**
- ECTS limit validation before enrollment
- Course quota validation
- Duplicate enrollment prevention
- Automatic enrolled count update

### Instructor Service (`/instructor`)

**Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET | `/Instructors` | Get logged-in instructor's profile | Instructor only |
| GET | `/Courses` | Get instructor's assigned courses | Instructor only |
| GET | `/Enrollments` | Get enrollments for instructor's courses | Instructor only |
| PATCH | `/Enrollments(ID)` | Update student grade | Instructor only |

**Business Logic:**
- Filter enrollments by instructor's courses
- Grade validation (0-20 range)
- Status update on grade submission

### Admin Service (`/admin`)

**Endpoints:**

| Method | Endpoint | Description | Access |
|--------|----------|-------------|--------|
| GET/POST/PATCH/DELETE | `/Students` | Full CRUD on students | Admin only |
| GET/POST/PATCH/DELETE | `/Instructors` | Full CRUD on instructors | Admin only |
| GET/POST/PATCH/DELETE | `/Courses` | Full CRUD on courses | Admin only |
| GET/POST/PATCH/DELETE | `/Enrollments` | Full CRUD on enrollments | Admin only |
| GET/POST/PATCH/DELETE | `/Departments` | Full CRUD on departments | Admin only |
| GET/POST/PATCH/DELETE | `/Universities` | Full CRUD on universities | Admin only |

**Business Logic:**
- Auto-generate student numbers (STU001, STU002...)
- Auto-generate instructor IDs (INS001, INS002...)
- Auto-generate course codes based on department
- Cascade delete warnings with impact analysis
- Validation for all operations

---

## Frontend Applications

### Student Portal

**Features:**
- Personal profile view
- Course browsing with search and filters
- Enrollment management
- Grade viewing
- Analytics dashboard with charts:
  - Course capacity overview
  - ECTS distribution
  - Enrollment status breakdown

**Key Components:**
- `Main.controller.js` - Main view controller
- `AuthService.js` - Auth0 integration
- `manifest.json` - App configuration

### Instructor Portal

**Features:**
- Instructor profile view
- Course management
- Student enrollment list
- Grade submission
- Teaching analytics dashboard:
  - Course enrollment capacity
  - Grade distribution
  - Enrollment status overview

**Key Components:**
- `Main.controller.js` - Main view controller
- `AuthService.js` - Auth0 integration
- `manifest.json` - App configuration

### Admin Portal

**Features:**
- Complete CRUD for all entities
- Cascade delete warnings
- Comprehensive analytics (8+ charts):
  - Student distribution by department
  - Instructor distribution by faculty
  - Course capacity utilization
  - Enrollment status distribution
  - Grade distribution
  - ECTS limit analysis

**Key Components:**
- `Main.controller.js` - Main view controller
- `AuthService.js` - Auth0 integration
- `manifest.json` - App configuration

### Shared Components

**AuthService.js** - Centralized authentication service:
```javascript
// Initialize Auth0 client
// Handle login/logout
// Manage token storage
// Attach tokens to OData requests
// Handle token refresh
```

---

## Security

### Authentication
- ✅ Auth0 JWT tokens
- ✅ Token-based API authentication
- ✅ Automatic token refresh
- ✅ Secure logout

### Authorization
- ✅ Role-based access control (RBAC)
- ✅ Service-level data filtering
- ✅ Endpoint protection
- ✅ Cascade delete protection

### Data Privacy
- ✅ Users see only their own data
- ✅ Instructors see only their courses/students
- ✅ Admins have full access with audit logging
- ✅ Email-based data filtering

### Best Practices
- ✅ HTTPS in production
- ✅ Token expiration (24 hours)
- ✅ No sensitive data in tokens
- ✅ Secure token storage (memory, not localStorage)
- ✅ Input validation on all endpoints
- ✅ SQL injection prevention (OData/CDS)

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn
- SQLite3
- Auth0 account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CourseRegistration
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Auth0**
   
   Create an Auth0 application and update configuration in:
   - `app/student/webapp/index.html`
   - `app/instructor/webapp/index.html`
   - `app/admin/webapp/index.html`
   - `launchpad.html`

4. **Set up Auth0 Action**
   
   Create a Post-Login Action in Auth0 to add email and role claims (see Auth0 Integration section).

5. **Initialize database**
   ```bash
   cds deploy --to sqlite:db.sqlite
   ```

6. **Load test data**
   ```bash
   Get-Content test-data.sql | sqlite3 db.sqlite
   ```

7. **Start the application**
   ```bash
   npm start
   ```

8. **Access the application**
   - Launchpad: http://localhost:4004/launchpad.html
   - Student Portal: http://localhost:4004/app/student/webapp/index.html
   - Instructor Portal: http://localhost:4004/app/instructor/webapp/index.html
   - Admin Portal: http://localhost:4004/app/admin/webapp/index.html

### Test Users

Create these users in Auth0 with the specified roles in `app_metadata`.  
All users use the password: **`Test@123`**

**Admin:**
- Email: `admin.test@university.edu`
- Password: `Test@123`
- Role in app_metadata: `admin`

**Instructor:**
- Email: `john.instructor@university.edu`
- Password: `Test@123`
- Role in app_metadata: `instructor`

**Students:**
- Email: `alice.test@university.edu`
- Password: `Test@123`
- Role in app_metadata: `student`

- Email: `bob.test@university.edu`
- Password: `Test@123`
- Role in app_metadata: `student`

- Email: `henry.test@university.edu`
- Password: `Test@123`
- Role in app_metadata: `student`

### Development Commands

```bash
# Start development server
npm start

# Build all apps
npm run build:apps

# Build backend services
npm run build:srv

# Watch for changes
npm run watch:srv
npm run watch:apps

# Clean build artifacts
npm run clean
```

### Database Commands

```bash
# Deploy schema
cds deploy --to sqlite:db.sqlite

# Load test data
Get-Content test-data.sql | sqlite3 db.sqlite

# Query database
sqlite3 db.sqlite "SELECT * FROM com_sap_capire_courseregistration_Students;"

# Check tables
node check-tables.js
```

---

## Project Structure

```
CourseRegistration/
├── app/
│   ├── student/              # Student portal (SAPUI5)
│   │   ├── webapp/
│   │   │   ├── controller/   # View controllers
│   │   │   ├── view/         # XML views
│   │   │   ├── index.html    # Entry point
│   │   │   └── manifest.json # App configuration
│   │   └── package.json
│   ├── instructor/           # Instructor portal (SAPUI5)
│   │   └── webapp/
│   ├── admin/                # Admin portal (SAPUI5)
│   │   └── webapp/
│   └── shared/
│       └── AuthService.js    # Shared Auth0 service
├── srv/
│   ├── student-service.cds   # Student service definition
│   ├── student-service.js    # Student service handler
│   ├── instructor-service.cds
│   ├── instructor-service.js
│   ├── admin-service.cds
│   ├── admin-service.js
│   ├── auth-middleware.js    # JWT validation middleware
│   └── server.js             # Custom server bootstrap
├── db/
│   ├── schema.cds            # Data model definitions
│   └── data/                 # CSV data files
├── test-data.sql             # Sample data for testing
├── launchpad.html            # Application launchpad
├── package.json              # Dependencies and scripts
└── PROJECT_ARCHITECTURE.md   # This file
```

---

## Benefits

✅ **Secure**: Industry-standard JWT authentication with Auth0  
✅ **Scalable**: Works with any number of users  
✅ **Automatic**: No manual user ID passing  
✅ **Role-Based**: Different access for different users  
✅ **User-Specific**: Each user sees only their data  
✅ **Maintainable**: Clean separation of concerns  
✅ **Modern**: Built with latest SAP CAP and SAPUI5  
✅ **Responsive**: Works on mobile, tablet, and desktop  
✅ **Analytics**: Rich visualizations with Chart.js  
✅ **Production-Ready**: Follows enterprise best practices  

---

## License

ISC

---

**Built with ❤️ for university course management**
