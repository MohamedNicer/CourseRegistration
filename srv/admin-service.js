"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cds_1 = __importDefault(require("@sap/cds"));
exports.default = cds_1.default.service.impl(async function () {
    const { Students, Instructors, Courses, Enrollments, Departments, Universities } = this.entities;
    // Enforce role-based access - only admins can access
    this.before('*', '*', async (req) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        const targetEntity = req.target?.name || 'unknown';
        const operation = req.event;
        console.log(`[AdminService] Access check - Email: ${userEmail}, Role: ${userRole}, Event: ${operation}, Target: ${targetEntity}`);
        if (userRole !== 'admin') {
            console.log(`[AdminService] ACCESS DENIED - Role '${userRole}' is not 'admin'`);
            req.reject(403, 'Access denied. Admin role required.');
        }
        else {
            console.log(`[AdminService] ACCESS GRANTED - Admin role verified`);
        }
        // Log admin operations for auditing
        console.log(`[AUDIT] Admin ${userEmail} performing ${operation} on ${targetEntity}`);
    });
    // Log all READ operations for auditing
    this.after('READ', Students, async (results, req) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[AdminService] Students READ completed - Admin: ${userEmail}, Records returned: ${count}`);
    });
    this.after('READ', Instructors, async (results, req) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[AdminService] Instructors READ completed - Admin: ${userEmail}, Records returned: ${count}`);
    });
    this.after('READ', Courses, async (results, req) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[AdminService] Courses READ completed - Admin: ${userEmail}, Records returned: ${count}`);
        // Dynamically calculate enrolled count for each course to ensure accuracy
        if (results) {
            const courses = Array.isArray(results) ? results : [results];
            const { SELECT } = cds_1.default.ql;
            for (const course of courses) {
                if (course.ID) {
                    // Count current enrollments with status ENROLLED
                    const enrolledCount = await SELECT.from(Enrollments)
                        .where({ course_ID: course.ID })
                        .and({ status: 'ENROLLED' });
                    // Update the course object with the live count
                    course.enrolled = enrolledCount.length;
                    // Also update the database to keep it in sync
                    await cds_1.default.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: course.ID });
                }
            }
        }
    });
    this.after('READ', Enrollments, async (results, req) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[AdminService] Enrollments READ completed - Admin: ${userEmail}, Records returned: ${count}`);
    });
    this.after('READ', Departments, async (results, req) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[AdminService] Departments READ completed - Admin: ${userEmail}, Records returned: ${count}`);
    });
    this.after('READ', Universities, async (results, req) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[AdminService] Universities READ completed - Admin: ${userEmail}, Records returned: ${count}`);
    });
    // Log CREATE operations for auditing
    this.after('CREATE', '*', async (data, req) => {
        const userEmail = getUserEmail(req);
        const targetEntity = req.target?.name || 'unknown';
        console.log(`[AUDIT] Admin ${userEmail} CREATED record in ${targetEntity}`);
    });
    // Log UPDATE operations for auditing
    this.after('UPDATE', '*', async (data, req) => {
        const userEmail = getUserEmail(req);
        const targetEntity = req.target?.name || 'unknown';
        console.log(`[AUDIT] Admin ${userEmail} UPDATED record in ${targetEntity}`);
    });
    // Log DELETE operations for auditing
    this.after('DELETE', '*', async (data, req) => {
        const userEmail = getUserEmail(req);
        const targetEntity = req.target?.name || 'unknown';
        console.log(`[AUDIT] Admin ${userEmail} DELETED record from ${targetEntity}`);
    });
    // Before enrollment update - automatically set status based on grade and capture course_ID
    this.before('UPDATE', Enrollments, async (req) => {
        const { SELECT } = cds_1.default.ql;
        // Get the enrollment to capture course_ID and old status for later use
        const enrollmentId = req.data.ID;
        const enrollment = await SELECT.one.from(Enrollments).where({ ID: enrollmentId });
        if (enrollment) {
            req._courseId = enrollment.course_ID;
            req._oldStatus = enrollment.status;
        }
        // Check if grade is being updated or cleared
        console.log(`[AdminService] Enrollments UPDATE - req.data:`, JSON.stringify(req.data));
        if (req.data.grade !== undefined) {
            if (req.data.grade === null || req.data.grade === '' || req.data.grade === 0) {
                // Grade is being cleared - revert to ENROLLED status and ensure grade is null
                req.data.status = 'ENROLLED';
                req.data.grade = null;
                console.log(`[AdminService] Enrollments UPDATE - Grade cleared (was: ${req.data.grade}), reverting status to ENROLLED`);
            }
            else {
                const grade = parseFloat(req.data.grade);
                // Check if grade is a valid number
                if (isNaN(grade)) {
                    console.log(`[AdminService] Enrollments UPDATE - Invalid grade value: ${req.data.grade}, reverting to ENROLLED`);
                    req.data.status = 'ENROLLED';
                    req.data.grade = null;
                }
                else {
                    console.log(`[AdminService] Enrollments UPDATE - Grade entered: ${grade}`);
                    // Automatically set status based on grade
                    if (grade >= 18) {
                        req.data.status = 'EXCELLENT';
                        console.log(`[AdminService] Auto-setting status to EXCELLENT (grade >= 18)`);
                    }
                    else if (grade >= 16) {
                        req.data.status = 'VERY_GOOD';
                        console.log(`[AdminService] Auto-setting status to VERY_GOOD (grade >= 16)`);
                    }
                    else if (grade >= 14) {
                        req.data.status = 'GOOD';
                        console.log(`[AdminService] Auto-setting status to GOOD (grade >= 14)`);
                    }
                    else if (grade >= 12) {
                        req.data.status = 'SATISFACTORY';
                        console.log(`[AdminService] Auto-setting status to SATISFACTORY (grade >= 12)`);
                    }
                    else if (grade >= 10) {
                        req.data.status = 'PASSED';
                        console.log(`[AdminService] Auto-setting status to PASSED (grade >= 10)`);
                    }
                    else {
                        req.data.status = 'FAILED';
                        console.log(`[AdminService] Auto-setting status to FAILED (grade < 10)`);
                    }
                }
            }
        }
    });
    // Before enrollment creation - validate no duplicate enrollments
    this.before('CREATE', Enrollments, async (req) => {
        const studentId = req.data.student_ID;
        const courseId = req.data.course_ID;
        if (studentId && courseId) {
            // Check for duplicate enrollment
            const { SELECT } = cds_1.default.ql;
            const existingEnrollment = await SELECT.one.from(Enrollments)
                .where({ student_ID: studentId })
                .and({ course_ID: courseId });
            if (existingEnrollment) {
                console.log(`[AdminService] Enrollments CREATE - Duplicate enrollment detected for student ${studentId} in course ${courseId}`);
                req.reject(400, 'This student is already enrolled in this course.');
                return;
            }
        }
    });
    // After enrollment creation - increment course enrolled count
    this.after('CREATE', Enrollments, async (data, req) => {
        const courseId = data.course_ID;
        console.log(`[AdminService] Enrollments CREATE completed - Updating enrolled count for course ${courseId}`);
        // Count current enrollments with status ENROLLED
        const { SELECT } = cds_1.default.ql;
        const enrolledCount = await SELECT.from(Enrollments)
            .where({ course_ID: courseId })
            .and({ status: 'ENROLLED' });
        // Update the course enrolled count
        await cds_1.default.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
        console.log(`[AdminService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
    });
    // Before enrollment deletion - capture course_ID for later use
    this.before('DELETE', Enrollments, async (req) => {
        const { SELECT } = cds_1.default.ql;
        // Get the enrollment being deleted to capture course_ID
        const enrollmentId = req.data.ID;
        const enrollment = await SELECT.one.from(Enrollments).where({ ID: enrollmentId });
        if (enrollment) {
            // Store course_ID in request context for use in after handler
            req._courseId = enrollment.course_ID;
            console.log(`[AdminService] Enrollments DELETE - Captured course_ID: ${enrollment.course_ID}`);
        }
    });
    // After enrollment update - recalculate course enrolled count if status changed
    this.after('UPDATE', Enrollments, async (data, req) => {
        const courseId = req._courseId;
        const oldStatus = req._oldStatus;
        const newStatus = data.status;
        // Only update enrolled count if status changed from or to ENROLLED
        if (courseId && oldStatus !== newStatus && (oldStatus === 'ENROLLED' || newStatus === 'ENROLLED')) {
            console.log(`[AdminService] Enrollments UPDATE - Status changed from ${oldStatus} to ${newStatus}, recalculating enrolled count for course ${courseId}`);
            const { SELECT } = cds_1.default.ql;
            // Count current enrollments with status ENROLLED
            const enrolledCount = await SELECT.from(Enrollments)
                .where({ course_ID: courseId })
                .and({ status: 'ENROLLED' });
            // Update the course enrolled count
            await cds_1.default.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
            console.log(`[AdminService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
        }
    });
    // After enrollment deletion - decrement course enrolled count
    this.after('DELETE', Enrollments, async (data, req) => {
        // Get course_ID from request context (captured in before handler)
        const courseId = req._courseId;
        if (!courseId) {
            console.warn(`[AdminService] Enrollments DELETE - No course_ID found in request context`);
            return;
        }
        console.log(`[AdminService] Enrollments DELETE completed - Updating enrolled count for course ${courseId}`);
        // Count current enrollments with status ENROLLED
        const { SELECT } = cds_1.default.ql;
        const enrolledCount = await SELECT.from(Enrollments)
            .where({ course_ID: courseId })
            .and({ status: 'ENROLLED' });
        // Update the course enrolled count
        await cds_1.default.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
        console.log(`[AdminService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
    });
});
/**
 * Extract email from request user info
 * Returns the authenticated user's email from JWT token or test headers
 */
function getUserEmail(req) {
    // Priority 1: Check custom header (for Auth0 integration)
    if (req.headers['x-user-email']) {
        console.log('[AdminService] getUserEmail - Using X-User-Email header:', req.headers['x-user-email']);
        return req.headers['x-user-email'];
    }
    // Priority 2: Check authUser (set by Auth0 middleware)
    if (req.authUser && req.authUser.email) {
        console.log('[AdminService] getUserEmail - Using Auth0 JWT email:', req.authUser.email);
        return req.authUser.email;
    }
    // Priority 3: Check req.user (may be overwritten by CDS)
    if (req.user && req.user.email) {
        console.log('[AdminService] getUserEmail - Using req.user email:', req.user.email);
        return req.user.email;
    }
    // No user info available
    console.warn('[AdminService] getUserEmail - No user email found! req.authUser:', JSON.stringify(req.authUser), 'req.user:', JSON.stringify(req.user));
    console.warn('[AdminService] getUserEmail - Available headers:', Object.keys(req.headers).join(', '));
    return null;
}
/**
 * Extract role from request user info
 * Returns the authenticated user's role from JWT token or test headers
 */
function getUserRole(req) {
    // Priority 1: Check custom header (for Auth0 integration)
    if (req.headers['x-user-role']) {
        console.log('[AdminService] getUserRole - Using X-User-Role header:', req.headers['x-user-role']);
        return req.headers['x-user-role'];
    }
    // Priority 2: Check authUser (set by Auth0 middleware)
    if (req.authUser) {
        const role = req.authUser['custom:role'] || req.authUser.role;
        if (role) {
            console.log('[AdminService] getUserRole - Using Auth0 JWT role:', role);
            return role;
        }
    }
    // Priority 3: Check req.user (may be overwritten by CDS)
    if (req.user) {
        const role = req.user['custom:role'] || req.user.role;
        if (role) {
            console.log('[AdminService] getUserRole - Using req.user role:', role);
            return role;
        }
    }
    // Default to admin if no role found (fallback for development)
    console.warn('[AdminService] getUserRole - No user role found! Defaulting to "admin"');
    console.warn('[AdminService] getUserRole - req.authUser:', JSON.stringify(req.authUser), 'req.user:', JSON.stringify(req.user));
    return 'admin';
}
