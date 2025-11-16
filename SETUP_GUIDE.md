# Course Registration System - Complete Setup & Demonstration Guide

This guide provides step-by-step instructions for setting up and demonstrating the Course Registration System for assessments, presentations, or new team members.

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Auth0 Configuration](#auth0-configuration)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Creating Demo Users](#creating-demo-users)
7. [Demonstration Scenarios](#demonstration-scenarios)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

1. **Node.js** (v18 or higher)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js)
   - Verify installation: `npm --version`

3. **SQLite3**
   - Windows: Download from https://www.sqlite.org/download.html
   - Mac: `brew install sqlite3`
   - Linux: `sudo apt-get install sqlite3`
   - Verify installation: `sqlite3 --version`

4. **Git**
   - Download from: https://git-scm.com/
   - Verify installation: `git --version`

5. **Auth0 Account** (Free tier is sufficient)
   - Sign up at: https://auth0.com/

### Recommended Tools

- **VS Code** with SAP CDS extension
- **Postman** or similar API testing tool (optional)
- **SQLite Browser** for database inspection (optional)

---

## Initial Setup

### 1. Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd CourseRegistration

# Verify you're in the correct directory
ls
# You should see: app/, srv/, db/, package.json, etc.
```

### 2. Install Dependencies

```bash
# Install all project dependencies
npm install

# This will install:
# - SAP CAP framework
# - SAPUI5 dependencies
# - TypeScript compiler
# - All other required packages
```

**Expected output:** Installation should complete without errors. Warnings are generally okay.

---

## Auth0 Configuration

### 1. Create Auth0 Application

1. Log in to your Auth0 Dashboard: https://manage.auth0.com/
2. Navigate to **Applications** → **Applications**
3. Click **Create Application**
4. Name it: "Course Registration System"
5. Select: **Single Page Web Applications**
6. Click **Create**

### 2. Configure Application Settings

In your new application's settings:

1. **Allowed Callback URLs:**
   ```
   http://localhost:4004/app/student/webapp/index.html,
   http://localhost:4004/app/instructor/webapp/index.html,
   http://localhost:4004/app/admin/webapp/index.html,
   http://localhost:4004/launchpad.html
   ```

2. **Allowed Logout URLs:**
   ```
   http://localhost:4004/launchpad.html
   ```

3. **Allowed Web Origins:**
   ```
   http://localhost:4004
   ```

4. **Save Changes**

5. **Note down these values** (you'll need them):
   - Domain (e.g., `dev-xxxxx.us.auth0.com`)
   - Client ID (e.g., `abc123...`)

### 3. Create Auth0 Post-Login Action

This action adds user email and role to the JWT token.

1. Navigate to **Actions** → **Flows** → **Login**
2. Click **+ (Add Action)** → **Build Custom**
3. Name: "Add User Claims"
4. Code:

```javascript
exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://courseregistration.com/';
  
  // Add email to token
  if (event.user.email) {
    api.idToken.setCustomClaim(`${namespace}email`, event.user.email);
    api.accessToken.setCustomClaim(`${namespace}email`, event.user.email);
  }
  
  // Add role from app_metadata
  const role = event.user.app_metadata?.role || 'student';
  api.idToken.setCustomClaim(`${namespace}role`, role);
  api.accessToken.setCustomClaim(`${namespace}role`, role);
};
```

5. Click **Deploy**
6. Drag the action into the Login flow
7. Click **Apply**

### 4. Update Application Configuration Files

Update Auth0 credentials in these files:

**File: `app/student/webapp/index.html`**
```javascript
domain: 'YOUR_AUTH0_DOMAIN',
clientId: 'YOUR_CLIENT_ID',
```

**File: `app/instructor/webapp/index.html`**
```javascript
domain: 'YOUR_AUTH0_DOMAIN',
clientId: 'YOUR_CLIENT_ID',
```

**File: `app/admin/webapp/index.html`**
```javascript
domain: 'YOUR_AUTH0_DOMAIN',
clientId: 'YOUR_CLIENT_ID',
```

**File: `launchpad.html`**
```javascript
domain: 'YOUR_AUTH0_DOMAIN',
clientId: 'YOUR_CLIENT_ID',
```

Replace `YOUR_AUTH0_DOMAIN` and `YOUR_CLIENT_ID` with your actual values.

---

## Database Setup

### 1. Deploy Database Schema

```bash
# Deploy the CDS schema to SQLite
cds deploy --to sqlite:db.sqlite
```

**Expected output:** "Successfully deployed to db.sqlite"

### 2. Load Sample Data

**Windows (PowerShell):**
```powershell
Get-Content test-data.sql | sqlite3 db.sqlite
```

**Mac/Linux:**
```bash
sqlite3 db.sqlite < test-data.sql
```

### 3. Verify Data Load

```bash
# Check if data was loaded
sqlite3 db.sqlite "SELECT COUNT(*) FROM com_sap_capire_courseregistration_Students;"
```

**Expected output:** Should show `4` (number of students in sample data)

### 4. Fix Enrolled Counts (Important!)

```bash
# Run the SQL script to recalculate enrolled counts
Get-Content scripts/fix-enrolled-counts.sql | sqlite3 db.sqlite
```

**Expected output:** Shows course codes with their enrolled/quota numbers

---

## Running the Application

### 1. Start the Server

```bash
npm start
```

**Expected output:**
```
[cds] - server listening on { url: 'http://localhost:4004' }
[cds] - launched at 11/15/2025, 10:30:00 AM
```

### 2. Verify Server is Running

Open your browser and navigate to:
- http://localhost:4004

You should be automatically redirected to the launchpad.

### 3. Access the Launchpad

Navigate to: http://localhost:4004 or http://localhost:4004/launchpad.html

**Note:** The root URL (`http://localhost:4004`) automatically redirects to the launchpad for convenience.

You'll be redirected to Auth0 login.

---

## Creating Demo Users

### 1. Create Users in Auth0

1. Go to **User Management** → **Users** in Auth0 Dashboard
2. Click **Create User**
3. Create the following users:

#### Student Users

**User 1: Alice Johnson**
- Email: `alice.test@university.edu`
- Password: (set a secure password)
- Email Verified: ✓ Yes

**User 2: Bob Smith**
- Email: `bob.test@university.edu`
- Password: (set a secure password)
- Email Verified: ✓ Yes

#### Instructor User

**User 3: John Instructor**
- Email: `john.instructor@university.edu`
- Password: (set a secure password)
- Email Verified: ✓ Yes

#### Admin User

**User 4: Admin User**
- Email: `admin.test@university.edu`
- Password: (set a secure password)
- Email Verified: ✓ Yes

### 2. Assign Roles via app_metadata

For each user, click on their name, then:

1. Scroll to **Metadata** section
2. Click **app_metadata** tab
3. Add the following JSON:

**For Students (Alice, Bob):**
```json
{
  "role": "student"
}
```

**For Instructor (John):**
```json
{
  "role": "instructor"
}
```

**For Admin:**
```json
{
  "role": "admin"
}
```

4. Click **Save**

### 3. Test Login

1. Navigate to: http://localhost:4004 (automatically redirects to launchpad)
2. Log in with one of the test users
3. You should see the appropriate portal tiles based on the user's role

---

## Demonstration Scenarios

### Scenario 1: Student Enrollment Flow

**Objective:** Show how students browse and enroll in courses

1. **Login as Alice** (`alice.test@university.edu`)
2. **View Profile:**
   - Navigate to "My Profile" tab
   - Show ECTS limit and available ECTS
3. **Browse Courses:**
   - Navigate to "Available Courses" tab
   - Show course filtering (only shows courses not enrolled/passed)
   - Point out course details: ECTS, quota, instructor
4. **Enroll in Course:**
   - Click "Enroll" on CS101 (Introduction to Programming)
   - Show confirmation dialog with ECTS impact
   - Confirm enrollment
   - Show success message
5. **View Enrollments:**
   - Navigate to "My Enrollments" tab
   - Show the newly enrolled course with status "ENROLLED"
   - Point out that ECTS are now allocated

**Key Points to Highlight:**
- ECTS validation prevents over-enrollment
- Course quota checking prevents enrollment in full courses
- Students can't enroll in courses they've already passed
- Real-time updates to available ECTS

### Scenario 2: Instructor Grading

**Objective:** Show how instructors manage courses and grade students

1. **Login as John** (`john.instructor@university.edu`)
2. **View Courses:**
   - Navigate to "My Courses" tab
   - Show courses assigned to this instructor
3. **View Enrollments:**
   - Navigate to "Enrollments" tab
   - Show list of students enrolled in instructor's courses
4. **Grade a Student:**
   - Find Alice's enrollment in CS101
   - Enter grade: `18.5`
   - Click "Update Grade"
   - Show confirmation dialog explaining status change
   - Confirm update
   - Show that status changed to "EXCELLENT"
5. **Clear a Grade (Optional):**
   - Clear the grade field for Alice
   - Click "Update Grade"
   - Show confirmation dialog explaining reversion to ENROLLED
   - Confirm update
   - Show that status reverted to "ENROLLED"

**Key Points to Highlight:**
- Automatic status calculation based on grade
- Grade validation (0-20 range)
- Confirmation dialogs prevent accidental changes
- Clearing grades reverts status and affects course quota

### Scenario 3: Admin Management

**Objective:** Show comprehensive admin capabilities

1. **Login as Admin** (`admin.test@university.edu`)
2. **Dashboard Overview:**
   - Show analytics charts on dashboard
   - Point out student distribution, course enrollment, grade distribution
3. **Manage Students:**
   - Navigate to "Students" tab
   - Show CRUD operations
   - Try to delete a student with enrollments
   - Show cascade delete warning
4. **Manage Courses:**
   - Navigate to "Courses" tab
   - Show enrolled/quota display
   - Edit a course
   - Show confirmation dialog
5. **Manage Enrollments:**
   - Navigate to "Enrollments" tab
   - Show all enrollments across all students
   - Edit an enrollment grade
   - Show confirmation with impact details
6. **View Analytics:**
   - Scroll through various charts
   - Show enrollment status distribution
   - Show grade distribution
   - Show department statistics

**Key Points to Highlight:**
- Full visibility across all entities
- Cascade delete warnings protect data integrity
- Comprehensive analytics for decision-making
- Audit logging for all admin operations

### Scenario 4: Role-Based Access Control

**Objective:** Demonstrate security and data isolation

1. **Login as Alice (Student):**
   - Show she only sees her own profile
   - Show she only sees her own enrollments
   - Show she can't access admin or instructor functions
2. **Login as John (Instructor):**
   - Show he only sees his own courses
   - Show he only sees enrollments for his courses
   - Show he can't see other instructors' data
3. **Login as Admin:**
   - Show full access to all data
   - Show ability to manage all entities

**Key Points to Highlight:**
- Email-based data filtering
- Role-based access control
- JWT token authentication
- No data leakage between users

### Scenario 5: Data Validation & Business Rules

**Objective:** Show system prevents invalid operations

1. **ECTS Limit Validation:**
   - Login as a student
   - Try to enroll in courses exceeding ECTS limit
   - Show error message
2. **Course Quota Validation:**
   - Login as admin
   - Show a course that's full (enrolled = quota)
   - Try to enroll a student
   - Show error message
3. **Grade Range Validation:**
   - Login as instructor
   - Try to enter grade > 20 or < 0
   - Show validation error
4. **Duplicate Enrollment Prevention:**
   - Try to enroll in same course twice
   - Show error message

**Key Points to Highlight:**
- Business rule enforcement
- Data integrity protection
- User-friendly error messages
- Real-time validation

---

## Troubleshooting

### Issue: "Cannot find module '@sap/cds'"

**Solution:**
```bash
npm install
```

### Issue: "Database file not found"

**Solution:**
```bash
cds deploy --to sqlite:db.sqlite
Get-Content test-data.sql | sqlite3 db.sqlite
```

### Issue: "Auth0 login fails"

**Solutions:**
1. Verify Auth0 domain and client ID in all HTML files
2. Check callback URLs in Auth0 application settings
3. Verify Post-Login Action is deployed and in the flow
4. Check browser console for specific error messages

### Issue: "User has no role"

**Solution:**
1. Go to Auth0 Dashboard → Users
2. Click on the user
3. Add `app_metadata` with role:
   ```json
   {
     "role": "student"
   }
   ```

### Issue: "Enrolled counts are wrong"

**Solution:**
```bash
Get-Content scripts/fix-enrolled-counts.sql | sqlite3 db.sqlite
```

### Issue: "Port 4004 already in use"

**Solution:**
```bash
# Find and kill the process using port 4004
# Windows:
netstat -ano | findstr :4004
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:4004 | xargs kill -9
```

### Issue: "TypeScript compilation errors"

**Solution:**
```bash
cd srv
npx tsc
```

### Issue: "Changes not reflecting"

**Solutions:**
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Restart the server
4. Check if you're editing the right file (`.ts` vs `.js`)

---

## Additional Resources

- **SAP CAP Documentation:** https://cap.cloud.sap/docs/
- **SAPUI5 Documentation:** https://sapui5.hana.ondemand.com/
- **Auth0 Documentation:** https://auth0.com/docs
- **Project Architecture:** See [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md)

---

## Quick Reference Commands

```bash
# Start server
npm start

# Deploy database
cds deploy --to sqlite:db.sqlite

# Load test data (Windows)
Get-Content test-data.sql | sqlite3 db.sqlite

# Fix enrolled counts (Windows)
Get-Content scripts/fix-enrolled-counts.sql | sqlite3 db.sqlite

# Compile TypeScript
npx tsc -p srv/tsconfig.json

# View database
sqlite3 db.sqlite

# Check running processes
netstat -ano | findstr :4004
```

---

## Demo Checklist

Before your demonstration:

- [ ] Server is running (`npm start`)
- [ ] Database is deployed and loaded with test data
- [ ] Enrolled counts are fixed
- [ ] All test users are created in Auth0 with correct roles
- [ ] Auth0 credentials are configured in all HTML files
- [ ] You can successfully login as each user type
- [ ] Root URL (http://localhost:4004) redirects to launchpad
- [ ] Browser cache is cleared
- [ ] You have prepared your demonstration scenarios
- [ ] You have a backup plan if internet/Auth0 is down

---

**Good luck with your demonstration! 🎉**
