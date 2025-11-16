"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cds_1 = __importDefault(require("@sap/cds"));
const { SELECT } = cds_1.default.ql;
const { normalizeEmail } = require('./utils/email-utils');
exports.default = cds_1.default.service.impl(async function () {
    const { Enrollments, Courses, Instructors } = this.entities;
    // Get database entities (unfiltered) for lookups - use cds.entities directly
    const { Instructors: InstructorsDB, Courses: CoursesDB } = cds_1.default.entities('com.sap.capire.courseregistration');
    // Enforce role-based access - only instructors and admins can access
    this.before('*', '*', async (req) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        const allowedRoles = ['instructor', 'admin'];
        console.log(`[InstructorService] Access check - Email: ${userEmail}, Role: ${userRole}, Event: ${req.event}, Target: ${req.target?.name || 'unknown'}`);
        if (!allowedRoles.includes(userRole)) {
            console.log(`[InstructorService] ACCESS DENIED - Role '${userRole}' not in allowed roles: ${allowedRoles.join(', ')}`);
            req.reject(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
        }
        else {
            console.log(`[InstructorService] ACCESS GRANTED - Role '${userRole}' is allowed`);
        }
    });
    // Before enrollment update - automatically set status based on grade and capture course_ID
    this.before('UPDATE', Enrollments, async (req) => {
        // Get the enrollment to capture course_ID for later use
        const enrollmentId = req.data.ID;
        const { Enrollments: EnrollmentsDB } = cds_1.default.entities('com.sap.capire.courseregistration');
        const enrollment = await SELECT.one.from(EnrollmentsDB).where({ ID: enrollmentId });
        if (enrollment) {
            req._courseId = enrollment.course_ID;
            req._oldStatus = enrollment.status;
        }
        // Check if grade is being updated or cleared
        console.log(`[InstructorService] Enrollments UPDATE - req.data:`, JSON.stringify(req.data));
        if (req.data.grade !== undefined) {
            if (req.data.grade === null || req.data.grade === '' || req.data.grade === 0) {
                // Grade is being cleared - revert to ENROLLED status and ensure grade is null
                req.data.status = 'ENROLLED';
                req.data.grade = null;
                console.log(`[InstructorService] Enrollments UPDATE - Grade cleared (was: ${req.data.grade}), reverting status to ENROLLED`);
            }
            else {
                const grade = parseFloat(req.data.grade);
                // Check if grade is a valid number
                if (isNaN(grade)) {
                    console.log(`[InstructorService] Enrollments UPDATE - Invalid grade value: ${req.data.grade}, reverting to ENROLLED`);
                    req.data.status = 'ENROLLED';
                    req.data.grade = null;
                }
                else {
                    console.log(`[InstructorService] Enrollments UPDATE - Grade entered: ${grade}`);
                    // Automatically set status based on grade
                    if (grade >= 18) {
                        req.data.status = 'EXCELLENT';
                        console.log(`[InstructorService] Auto-setting status to EXCELLENT (grade >= 18)`);
                    }
                    else if (grade >= 16) {
                        req.data.status = 'VERY_GOOD';
                        console.log(`[InstructorService] Auto-setting status to VERY_GOOD (grade >= 16)`);
                    }
                    else if (grade >= 14) {
                        req.data.status = 'GOOD';
                        console.log(`[InstructorService] Auto-setting status to GOOD (grade >= 14)`);
                    }
                    else if (grade >= 12) {
                        req.data.status = 'SATISFACTORY';
                        console.log(`[InstructorService] Auto-setting status to SATISFACTORY (grade >= 12)`);
                    }
                    else if (grade >= 10) {
                        req.data.status = 'PASSED';
                        console.log(`[InstructorService] Auto-setting status to PASSED (grade >= 10)`);
                    }
                    else {
                        req.data.status = 'FAILED';
                        console.log(`[InstructorService] Auto-setting status to FAILED (grade < 10)`);
                    }
                }
            }
        }
    });
    // After enrollment update - recalculate course enrolled count if status changed
    this.after('UPDATE', Enrollments, async (data, req) => {
        const courseId = req._courseId;
        const oldStatus = req._oldStatus;
        const newStatus = data.status;
        // Only update enrolled count if status changed from or to ENROLLED
        if (courseId && oldStatus !== newStatus && (oldStatus === 'ENROLLED' || newStatus === 'ENROLLED')) {
            console.log(`[InstructorService] Enrollments UPDATE - Status changed from ${oldStatus} to ${newStatus}, recalculating enrolled count for course ${courseId}`);
            const { Enrollments: EnrollmentsDB, Courses } = cds_1.default.entities('com.sap.capire.courseregistration');
            // Count current enrollments with status ENROLLED
            const enrolledCount = await SELECT.from(EnrollmentsDB)
                .where({ course_ID: courseId })
                .and({ status: 'ENROLLED' });
            // Update the course enrolled count
            await cds_1.default.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
            console.log(`[InstructorService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
        }
    });
    // Filter Enrollments by logged-in instructor's courses (admins see all)
    this.before('READ', Enrollments, async (req) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        console.log(`[InstructorService] Enrollments READ - Request started - Email: ${userEmail}, Role: ${userRole}`);
        // Admins can see all enrollments, no filtering needed
        if (userRole === 'admin') {
            console.log('[InstructorService] Enrollments - Admin user, no filtering applied');
            return;
        }
        // For instructors, filter by their courses
        if (userEmail) {
            // First, verify the instructor exists (case-insensitive) - use cds.run to bypass any filtering
            const result = await cds_1.default.run(`SELECT ID, email FROM com_sap_capire_courseregistration_Instructors`);
            const instructor = result.find((i) => i.email.toLowerCase() === userEmail.toLowerCase());
            if (instructor) {
                console.log(`[InstructorService] Enrollments - Database lookup: FOUND - Instructor ID: ${instructor.ID}, Email: ${instructor.email}`);
                // Get all courses taught by this instructor
                const courses = await cds_1.default.run(`SELECT ID FROM com_sap_capire_courseregistration_Courses WHERE instructor_ID = ${instructor.ID}`);
                const courseIds = courses.map((c) => c.ID);
                console.log(`[InstructorService] Enrollments - Instructor teaches ${courseIds.length} courses: [${courseIds.join(', ')}]`);
                if (courseIds.length > 0) {
                    req.query.where({ 'course_ID': { in: courseIds } });
                    console.log('[InstructorService] Enrollments - Applied filter: { course_ID: { in:', courseIds, '} }');
                }
                else {
                    console.warn(`[InstructorService] Enrollments - Instructor has no courses, returning empty result`);
                    req.query.where({ 'course_ID': -1 }); // Ensure no data is returned
                }
            }
            else {
                console.warn(`[InstructorService] Enrollments - Database lookup: NOT FOUND - No instructor record with email: ${userEmail}`);
                req.query.where({ 'course_ID': -1 }); // Ensure no data is returned
            }
        }
        else {
            console.warn('[InstructorService] Enrollments - No email found in authentication context, query will return no results');
            req.query.where({ 'course_ID': -1 }); // Ensure no data is returned
        }
    });
    // Filter Instructors by logged-in user (admins see all)
    this.before('READ', Instructors, async (req) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        console.log(`[InstructorService] Instructors READ - Request started - Email: ${userEmail}, Role: ${userRole}`);
        // Admins can see all instructors, no filtering needed
        if (userRole === 'admin') {
            console.log('[InstructorService] Instructors - Admin user, no filtering applied');
            return;
        }
        // For instructors, filter by their email
        if (userEmail) {
            // Check if instructor exists in database (case-insensitive) - use cds.run to bypass any filtering
            const result = await cds_1.default.run(`SELECT ID, email, firstName, lastName FROM com_sap_capire_courseregistration_Instructors`);
            console.log(`[InstructorService] Instructors - Total instructors in DB (via cds.run): ${result.length}`);
            if (result.length > 0) {
                console.log(`[InstructorService] Instructors - All emails:`, result.map((i) => `${i.ID}:${i.email}`));
            }
            const instructor = result.find((i) => i.email.toLowerCase() === userEmail.toLowerCase());
            if (instructor) {
                console.log(`[InstructorService] Instructors - Database lookup: FOUND - Instructor ID: ${instructor.ID}, Email: ${instructor.email}`);
                req.query.where({ 'ID': instructor.ID });
                console.log('[InstructorService] Instructors - Applied filter: { ID:', instructor.ID, '}');
            }
            else {
                console.warn(`[InstructorService] Instructors - Database lookup: NOT FOUND - No instructor record with email: ${userEmail}`);
                console.warn(`[InstructorService] Instructors - Looking for: ${userEmail}, Available:`, result.map((i) => i.email));
                req.query.where({ 'ID': -1 }); // Ensure no data is returned
            }
        }
        else {
            console.warn('[InstructorService] Instructors - No email found in authentication context, query will return no results');
            req.query.where({ 'ID': -1 }); // Ensure no data is returned
        }
    });
    // Filter Courses by logged-in instructor (admins see all)
    this.before('READ', Courses, async (req) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        console.log(`[InstructorService] Courses READ - Request started - Email: ${userEmail}, Role: ${userRole}`);
        // Admins can see all courses, no filtering needed
        if (userRole === 'admin') {
            console.log('[InstructorService] Courses - Admin user, no filtering applied');
            return;
        }
        // For instructors, filter by their email
        if (userEmail) {
            // Check if instructor exists in database (case-insensitive) - use cds.run to bypass any filtering
            const result = await cds_1.default.run(`SELECT ID, email FROM com_sap_capire_courseregistration_Instructors`);
            const instructor = result.find((i) => i.email.toLowerCase() === userEmail.toLowerCase());
            if (instructor) {
                console.log(`[InstructorService] Courses - Database lookup: FOUND - Instructor ID: ${instructor.ID}, Email: ${instructor.email}`);
                req.query.where({ 'instructor_ID': instructor.ID });
                console.log('[InstructorService] Courses - Applied filter: { instructor_ID:', instructor.ID, '}');
            }
            else {
                console.warn(`[InstructorService] Courses - Database lookup: NOT FOUND - No instructor record with email: ${userEmail}`);
                req.query.where({ 'instructor_ID': -1 }); // Ensure no data is returned
            }
        }
        else {
            console.warn('[InstructorService] Courses - No email found in authentication context, query will return no results');
            req.query.where({ 'instructor_ID': -1 }); // Ensure no data is returned
        }
    });
    // Add department info to courses after read
    this.after('READ', Courses, async (results, req) => {
        if (!results)
            return results;
        const courses = Array.isArray(results) ? results : [results];
        const { Departments, Enrollments: EnrollmentsDB } = cds_1.default.entities('com.sap.capire.courseregistration');
        for (const course of courses) {
            if (course.department_ID) {
                const dept = await SELECT.one.from(Departments).where({ ID: course.department_ID });
                if (dept) {
                    course.departmentName = dept.departmentName;
                }
            }
            // Dynamically calculate enrolled count to ensure accuracy
            if (course.ID) {
                const enrolledCount = await SELECT.from(EnrollmentsDB)
                    .where({ course_ID: course.ID })
                    .and({ status: 'ENROLLED' });
                // Update the course object with the live count
                course.enrolled = enrolledCount.length;
                // Also update the database to keep it in sync
                const { Courses: CoursesDB } = cds_1.default.entities('com.sap.capire.courseregistration');
                await cds_1.default.update(CoursesDB).set({ enrolled: enrolledCount.length }).where({ ID: course.ID });
            }
        }
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[InstructorService] Courses READ completed - User: ${userEmail}, Role: ${userRole}, Records returned: ${count}`);
        if (count === 0 && userEmail && userRole === 'instructor') {
            console.warn(`[InstructorService] Courses - WARNING: No records returned for authenticated instructor ${userEmail}. This may indicate an email mismatch between Auth0 and database, or the instructor has no courses assigned.`);
        }
        return results;
    });
    // Log successful reads for auditing
    this.after('READ', Enrollments, async (results, req) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[InstructorService] Enrollments READ completed - User: ${userEmail}, Role: ${userRole}, Records returned: ${count}`);
        if (count === 0 && userEmail && userRole === 'instructor') {
            console.warn(`[InstructorService] Enrollments - WARNING: No records returned for authenticated instructor ${userEmail}. This may indicate an email mismatch between Auth0 and database, or the instructor has no courses assigned.`);
        }
    });
    this.after('READ', Instructors, async (results, req) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[InstructorService] Instructors READ completed - User: ${userEmail}, Role: ${userRole}, Records returned: ${count}`);
        if (count === 0 && userEmail && userRole === 'instructor') {
            console.warn(`[InstructorService] Instructors - WARNING: No records returned for authenticated instructor ${userEmail}. This may indicate an email mismatch between Auth0 and database.`);
        }
    });
});
/**
 * Extract email from request user info
 * Returns the authenticated user's email from JWT token or test headers
 * Email is normalized (lowercase, trimmed) for consistent comparison
 */
function getUserEmail(req) {
    let email = null;
    // Priority 1: Check custom header (for Auth0 integration)
    if (req.headers['x-user-email']) {
        console.log('[InstructorService] getUserEmail - Using X-User-Email header:', req.headers['x-user-email']);
        email = req.headers['x-user-email'];
    }
    // Priority 2: Check authUser (set by Auth0 middleware)
    else if (req.authUser && req.authUser.email) {
        console.log('[InstructorService] getUserEmail - Using Auth0 JWT email:', req.authUser.email);
        email = req.authUser.email;
    }
    // Priority 3: Check req.user (may be overwritten by CDS)
    else if (req.user && req.user.email) {
        console.log('[InstructorService] getUserEmail - Using req.user email:', req.user.email);
        email = req.user.email;
    }
    if (!email) {
        // No user info available
        console.warn('[InstructorService] getUserEmail - No user email found! req.authUser:', JSON.stringify(req.authUser), 'req.user:', JSON.stringify(req.user));
        console.warn('[InstructorService] getUserEmail - Available headers:', Object.keys(req.headers).join(', '));
        return null;
    }
    // Normalize the email for consistent comparison
    const normalizedEmail = normalizeEmail(email);
    console.log('[InstructorService] getUserEmail - Normalized email:', normalizedEmail);
    return normalizedEmail;
}
/**
 * Extract role from request user info
 * Returns the authenticated user's role from JWT token or test headers
 */
function getUserRole(req) {
    // Priority 1: Check custom header (for Auth0 integration)
    if (req.headers['x-user-role']) {
        console.log('[InstructorService] getUserRole - Using X-User-Role header:', req.headers['x-user-role']);
        return req.headers['x-user-role'];
    }
    // Priority 2: Check authUser (set by Auth0 middleware)
    if (req.authUser) {
        const role = req.authUser['custom:role'] || req.authUser.role;
        if (role) {
            console.log('[InstructorService] getUserRole - Using Auth0 JWT role:', role);
            return role;
        }
    }
    // Priority 3: Check req.user (may be overwritten by CDS)
    if (req.user) {
        const role = req.user['custom:role'] || req.user.role;
        if (role) {
            console.log('[InstructorService] getUserRole - Using req.user role:', role);
            return role;
        }
    }
    // Default to instructor if no role found (fallback for development)
    console.warn('[InstructorService] getUserRole - No user role found! Defaulting to "instructor"');
    console.warn('[InstructorService] getUserRole - req.authUser:', JSON.stringify(req.authUser), 'req.user:', JSON.stringify(req.user));
    return 'instructor';
}
