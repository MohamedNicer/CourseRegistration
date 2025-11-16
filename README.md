# Course Registration System

A comprehensive university course registration system built with SAP CAP (Cloud Application Programming Model), SAPUI5, and Auth0 authentication.

> **📖 For detailed architecture documentation, see [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)**

## 🎯 Overview

This system provides three role-based portals for managing university course registrations:

- **👨‍🎓 Student Portal** - Profile management, course browsing, enrollment, and analytics
- **👨‍🏫 Instructor Portal** - Course management, student grading, and teaching analytics
- **🔧 Admin Portal** - Full CRUD operations on all entities with comprehensive analytics

## 🏗️ Technology Stack

**Backend:** SAP CAP (Node.js/TypeScript), SQLite, OData V4, Auth0 JWT  
**Frontend:** SAPUI5 v1.120.0, Chart.js, Auth0 SPA SDK  
**Security:** Role-based access control with email-based data filtering

## 🚀 Quick Start

> **📘 For complete setup instructions, demonstration scenarios, and troubleshooting, see [SETUP_GUIDE.md](SETUP_GUIDE.md)**  
> **☁️ For SAP BTP deployment, see [DEPLOYMENT.md](DEPLOYMENT.md)**

### Prerequisites

- Node.js v18+
- npm or yarn
- SQLite3
- Auth0 account
- (Optional) SAP BTP Cloud Foundry account for cloud deployment

### Installation

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd CourseRegistration
   npm install
   ```

2. **Configure Auth0**
   
   Update Auth0 credentials in these files:
   - `app/student/webapp/index.html`
   - `app/instructor/webapp/index.html`
   - `app/admin/webapp/index.html`
   - `launchpad.html`
   
   Set up an Auth0 Post-Login Action to add email and role claims to tokens.  
   See [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed Auth0 configuration.

3. **Initialize database**
   ```bash
   cds deploy --to sqlite:db.sqlite
   Get-Content test-data.sql | sqlite3 db.sqlite
   Get-Content scripts/fix-enrolled-counts.sql | sqlite3 db.sqlite
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Access the application**
   - Main URL: http://localhost:4004 (automatically redirects to launchpad)
   - Launchpad: http://localhost:4004/launchpad.html
   - Student Portal: http://localhost:4004/app/student/webapp/index.html
   - Instructor Portal: http://localhost:4004/app/instructor/webapp/index.html
   - Admin Portal: http://localhost:4004/app/admin/webapp/index.html

### Test Users

Create users in Auth0 with these roles in `app_metadata`.  
All users use the password: **`Test@123`**

- **Admin**: admin.test@university.edu (role: admin)
- **Instructor**: john.instructor@university.edu (role: instructor)
- **Students**: 
  - alice.test@university.edu (role: student)
  - bob.test@university.edu (role: student)
  - henry.test@university.edu (role: student)

> **💡 Tip:** See [SETUP_GUIDE.md](SETUP_GUIDE.md) for step-by-step user creation and demonstration scenarios

## 📊 Key Features

- **Auto-Generated IDs**: STU001, INS001, CS101 (department-based)
- **Cascade Delete Warnings**: Impact analysis before deletion
- **Data Validation**: ECTS limits, course quotas, grade ranges
- **Analytics**: 8+ interactive charts with Chart.js
- **Role-Based Access**: Email-based data filtering per user role

## 🗂️ Project Structure

```
CourseRegistration/
├── app/                  # Frontend applications (SAPUI5)
│   ├── student/          # Student portal
│   ├── instructor/       # Instructor portal
│   ├── admin/            # Admin portal
│   └── shared/           # Shared Auth0 service
├── srv/                  # Backend services (CAP - Node.js/TypeScript)
│   ├── *-service.cds     # Service definitions
│   ├── *-service.ts      # Service handlers (TypeScript)
│   ├── *-service.js      # Compiled JavaScript
│   ├── auth-middleware.js # JWT validation
│   ├── server.js         # Custom bootstrap
│   └── tsconfig.json     # TypeScript configuration
├── db/
│   └── schema.cds        # Data model
├── test-data.sql         # Sample data
├── launchpad.html        # App launchpad
├── README.md             # This file
├── PROJECT_ARCHITECTURE.md # Detailed documentation
└── CONTRIBUTING.md       # Contribution guidelines
```

> **Note:** The `app_old_backup/` folder is excluded from git and can be safely deleted locally.

## 🛠️ Development

```bash
# Start development server
npm start

# Build all apps
npm run build:apps

# Build backend services
npm run build:srv

# Clean build artifacts
npm run clean

# Deploy database schema
cds deploy --to sqlite:db.sqlite
```

## ☁️ Cloud Deployment (SAP BTP)

Deploy to SAP BTP Cloud Foundry with automatic database initialization:

```bash
# Login to Cloud Foundry
cf login -a <your-api-endpoint>

# Deploy (database auto-initializes with sample data)
cf push
```

The application automatically:
- ✅ Initializes SQLite database on first deployment
- ✅ Loads sample data from CSV files
- ✅ Preserves data on subsequent deployments
- ✅ Supports force reinitialization via `FORCE_DB_INIT=true`

**See [DEPLOYMENT.md](DEPLOYMENT.md) for complete deployment guide.**

## 📚 Documentation

- **[DEPLOYMENT.md](DEPLOYMENT.md)** - SAP BTP Cloud Foundry deployment guide
  - Quick deployment steps
  - Automatic database initialization
  - Environment configuration
  - Troubleshooting deployment issues
- **[SETUP_GUIDE.md](SETUP_GUIDE.md)** - Complete setup and demonstration guide
  - Step-by-step installation instructions
  - Auth0 configuration walkthrough
  - Database setup and data loading
  - Creating demo users
  - Demonstration scenarios for assessments
  - Troubleshooting common issues
- **[PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)** - Complete architecture documentation
  - System architecture diagrams
  - Authentication & authorization flows
  - Data model and API endpoints
  - Security implementation details
  - Technical design decisions
- **[db/schema.cds](db/schema.cds)** - Database schema
- **[srv/](srv/)** - Service definitions and handlers

## 📄 License

ISC

---

**Built with ❤️ for university course management**
