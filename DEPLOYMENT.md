# Deployment Guide - Course Registration System

This guide explains how to deploy the Course Registration System to SAP BTP (Business Technology Platform).

## Prerequisites

1. **SAP BTP Account** - You need access to an SAP BTP Cloud Foundry environment
2. **Cloud Foundry CLI** - Install from [cloudfoundry.org](https://docs.cloudfoundry.org/cf-cli/install-go-cli.html)
3. **Node.js** - Version 18 or higher
4. **Auth0 Account** - For authentication (optional, can be configured later)

## Quick Deployment

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd CourseRegistration
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Build the Application

```bash
npm run build
```

### 4. Login to Cloud Foundry

```bash
cf login -a <your-api-endpoint>
```

Example for US10 region:
```bash
cf login -a https://api.cf.us10-001.hana.ondemand.com
```

### 5. Deploy to BTP

```bash
cf push
```

**That's it!** The application will automatically:
- ✅ Deploy to Cloud Foundry
- ✅ Initialize the SQLite database
- ✅ Load sample data from CSV files
- ✅ Start the server

## Automatic Database Initialization

The application includes an intelligent database initialization system in `start-btp.js` that:

### On First Deployment
- Detects that no database exists
- Creates the database schema from `db/schema.cds`
- Loads sample data from CSV files in `db/data/`
- Creates an initialization marker file

### On Subsequent Deployments
- Checks if database and marker file exist
- Skips initialization if both are present
- Preserves your data across deployments

### Force Reinitialization (Optional)

If you need to reset the database with fresh sample data:

```bash
# Set the environment variable
cf set-env course-registration FORCE_DB_INIT true

# Restart the app
cf restart course-registration

# Remove the flag (optional)
cf unset-env course-registration FORCE_DB_INIT
cf restart course-registration
```

## Sample Data Included

The application comes with pre-configured sample data:

- **30 Students** across 8 departments
- **25 Instructors** teaching various courses
- **30 Courses** with varied ECTS credits (3-9)
- **70 Enrollments** with different statuses
- **8 Departments** across multiple faculties
- **1 University** (Tech University)

### Test Users

**Admin Portal:**
- Email: `admin.test@university.edu`
- Role: `admin`

**Instructor Portal:**
- Email: `john.instructor@university.edu`
- Role: `instructor`

**Student Portal:**
- Email: `alice.test@university.edu`
- Role: `student`

## Application URLs

After deployment, access your application at:

```
https://course-registration-<random-route>.cfapps.<region>.hana.ondemand.com
```

### Portal Access

- **Launchpad**: `/` (root URL)
- **Admin Portal**: `/app/admin/webapp/index.html`
- **Instructor Portal**: `/app/instructor/webapp/index.html`
- **Student Portal**: `/app/student/webapp/index.html`

## Configuration

### Environment Variables

The application uses these environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `CDS_REQUIRES_DB_KIND` | Database type | `sqlite` |
| `FORCE_DB_INIT` | Force database reinitialization | `false` |

### Manifest Configuration

The `manifest.yml` file contains deployment settings:

```yaml
applications:
  - name: course-registration
    memory: 512M
    disk_quota: 1024M
    command: node start-btp.js
    buildpack: nodejs_buildpack
    env:
      NODE_ENV: production
      CDS_REQUIRES_DB_KIND: sqlite
```

## Data Integrity Features

The system includes built-in data integrity constraints:

✅ **Unique Constraints:**
- Student emails must be unique
- Instructor emails must be unique
- Student numbers must be unique
- Instructor IDs must be unique
- Course codes must be unique

✅ **Enrollment Validation:**
- Students cannot enroll in the same course twice
- ECTS limit validation (students have a 60 ECTS limit)
- Course quota validation (courses have enrollment limits)
- Dynamic enrollment count calculation

## Troubleshooting

### Database Not Initializing

If the database doesn't initialize automatically:

1. Check the logs:
   ```bash
   cf logs course-registration --recent
   ```

2. Force reinitialization:
   ```bash
   cf set-env course-registration FORCE_DB_INIT true
   cf restart course-registration
   ```

### Application Not Starting

1. Check application status:
   ```bash
   cf app course-registration
   ```

2. View recent logs:
   ```bash
   cf logs course-registration --recent
   ```

3. Check for errors in the staging process:
   ```bash
   cf logs course-registration --recent | grep -i error
   ```

### Memory Issues

If the application runs out of memory, increase the memory allocation:

```bash
cf scale course-registration -m 1G
```

## Updating the Application

To deploy updates:

```bash
# Build the latest changes
npm run build

# Push to BTP
cf push
```

The database will be preserved unless you set `FORCE_DB_INIT=true`.

## Customizing Sample Data

To customize the sample data:

1. Edit CSV files in `db/data/`:
   - `com.sap.capire.courseregistration-Students.csv`
   - `com.sap.capire.courseregistration-Instructors.csv`
   - `com.sap.capire.courseregistration-Courses.csv`
   - `com.sap.capire.courseregistration-Enrollments.csv`
   - etc.

2. Force database reinitialization:
   ```bash
   cf set-env course-registration FORCE_DB_INIT true
   cf push
   ```

## Architecture

```
┌─────────────────────────────────────────┐
│         SAP BTP Cloud Foundry           │
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │   Node.js Application             │  │
│  │   - start-btp.js (startup)        │  │
│  │   - CDS Services (backend)        │  │
│  │   - SAPUI5 Apps (frontend)        │  │
│  └───────────────────────────────────┘  │
│  ┌───────────────────────────────────┐  │
│  │   SQLite Database                 │  │
│  │   - Auto-initialized on deploy    │  │
│  │   - Sample data from CSV          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

## Support

For issues or questions:
1. Check the logs: `cf logs course-registration --recent`
2. Review this deployment guide
3. Check the main README.md for application features

## License

ISC
