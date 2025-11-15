"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cds_1 = __importDefault(require("@sap/cds"));
const { SELECT } = cds_1.default.ql;
exports.default = cds_1.default.service.impl(async function () {
    const { MyProfile, MyEnrollments, AvailableCourses, Enrollments } = this.entities;
    const { Students, Enrollments: EnrollmentsDB, Courses } = cds_1.default.entities('com.sap.capire.courseregistration');
    // Enforce role-based access - only students, instructors, and admins can access
    this.before('*', '*', async (req) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        const allowedRoles = ['student', 'instructor', 'admin'];
        console.log(`[StudentService] Access check - Email: ${userEmail}, Role: ${userRole}, Event: ${req.event}, Target: ${req.target?.name || 'unknown'}`);
        if (!allowedRoles.includes(userRole)) {
            console.log(`[StudentService] ACCESS DENIED - Role '${userRole}' not in allowed roles: ${allowedRoles.join(', ')}`);
            req.reject(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
        }
        else {
            console.log(`[StudentService] ACCESS GRANTED - Role '${userRole}' is allowed`);
        }
    });
    // Handle enrollment creation - automatically set student_ID from logged-in user
    this.before('CREATE', Enrollments, async (req) => {
        const userEmail = getUserEmail(req);
        console.log('[StudentService] Enrollments CREATE - User email:', userEmail);
        if (userEmail) {
            const student = await SELECT.one.from(Students).where({ email: userEmail });
            if (student) {
                console.log(`[StudentService] Enrollments CREATE - Setting student_ID to ${student.ID}`);
                req.data.student_ID = student.ID;
                // Validate ECTS availability
                const course = await SELECT.one.from(Courses).where({ ID: req.data.course_ID });
                if (course) {
                    // Get current enrollments
                    const enrollments = await SELECT.from(EnrollmentsDB)
                        .where({ student_ID: student.ID })
                        .and({ status: { in: ['ENROLLED', 'COMPLETED'] } });
                    const ectsUsed = enrollments.reduce((sum, e) => {
                        return sum + (e.course?.ects || 0);
                    }, 0);
                    const ectsAvailable = student.ectsLimit - ectsUsed;
                    if (ectsAvailable < course.ects) {
                        req.reject(400, `Insufficient ECTS. You need ${course.ects} ECTS but only have ${ectsAvailable} available.`);
                        return;
                    }
                    // Check if course is full
                    const enrolledCount = await SELECT.from(EnrollmentsDB)
                        .where({ course_ID: req.data.course_ID })
                        .and({ status: 'ENROLLED' });
                    if (enrolledCount.length >= course.quota) {
                        req.reject(400, 'This course is full.');
                        return;
                    }
                    console.log(`[StudentService] Enrollments CREATE - Validation passed`);
                }
            }
            else {
                req.reject(400, 'Student not found');
            }
        }
        else {
            req.reject(401, 'User email not found');
        }
    });
    // Filter MyProfile by logged-in user's email
    this.before('READ', MyProfile, async (req) => {
        const userEmail = getUserEmail(req);
        console.log('[StudentService] MyProfile READ - Filtering by email:', userEmail);
        console.log('[StudentService] MyProfile - req.user object:', JSON.stringify(req.user, null, 2));
        if (userEmail) {
            req.query.where({ email: userEmail });
            console.log('[StudentService] MyProfile - Applied filter: { email:', userEmail, '}');
        }
        else {
            console.warn('[StudentService] MyProfile - No email found, query will return no results');
            req.query.where({ email: 'no-user@invalid.com' }); // Ensure no data is returned
        }
    });
    // Filter AvailableCourses - exclude already enrolled courses (allow cross-department enrollment)
    this.before('READ', AvailableCourses, async (req) => {
        const userEmail = getUserEmail(req);
        console.log('[StudentService] AvailableCourses READ - User email:', userEmail);
        if (userEmail) {
            // Get the student info
            const student = await SELECT.one.from(Students).where({ email: userEmail });
            if (student) {
                console.log(`[StudentService] AvailableCourses - Found student ID: ${student.ID}`);
                // Get student's enrollments (ENROLLED, COMPLETED, or passed with grade > 10)
                const allEnrollments = await SELECT.from(Enrollments)
                    .where({ student_ID: student.ID });
                // Exclude courses where:
                // 1. Status is ENROLLED or COMPLETED
                // 2. Student has passed (grade > 10)
                const excludedCourseIds = allEnrollments
                    .filter((e) => {
                    const isEnrolledOrCompleted = ['ENROLLED', 'COMPLETED'].includes(e.status);
                    const hasPassed = e.grade !== null && e.grade > 10;
                    return isEnrolledOrCompleted || hasPassed;
                })
                    .map((e) => e.course_ID);
                console.log(`[StudentService] AvailableCourses - Student has ${excludedCourseIds.length} courses to exclude (enrolled/completed/passed)`);
                // Filter: exclude courses the student is enrolled in, completed, or passed
                if (excludedCourseIds.length > 0) {
                    req.query.where({
                        ID: { not: { in: excludedCourseIds } }
                    });
                    console.log(`[StudentService] AvailableCourses - Applied filter: excluding ${excludedCourseIds.length} courses`);
                }
                else {
                    console.log(`[StudentService] AvailableCourses - No filter applied, showing all courses`);
                }
            }
            else {
                console.warn(`[StudentService] AvailableCourses - No student found with email: ${userEmail}`);
                req.query.where({ ID: -1 }); // Ensure no data is returned
            }
        }
        else {
            console.warn('[StudentService] AvailableCourses - No email found, query will return no results');
            req.query.where({ ID: -1 }); // Ensure no data is returned
        }
    });
    // Add department info to available courses after read
    this.after('READ', AvailableCourses, async (results) => {
        if (!results)
            return results;
        const courses = Array.isArray(results) ? results : [results];
        const { Departments } = cds_1.default.entities('com.sap.capire.courseregistration');
        for (const course of courses) {
            if (course.department_ID) {
                const dept = await SELECT.one.from(Departments).where({ ID: course.department_ID });
                if (dept) {
                    course.departmentName = dept.departmentName;
                }
            }
        }
        return results;
    });
    // Filter MyEnrollments by logged-in user's student ID
    this.before('READ', MyEnrollments, async (req) => {
        const userEmail = getUserEmail(req);
        console.log('[StudentService] MyEnrollments READ - User email:', userEmail);
        if (userEmail) {
            // First, get the student ID from the email
            const student = await SELECT.one.from(Students).where({ email: userEmail });
            if (student) {
                console.log(`[StudentService] MyEnrollments - Found student ID: ${student.ID} for email: ${userEmail}`);
                req.query.where({ 'student_ID': student.ID });
                console.log('[StudentService] MyEnrollments - Applied filter: { student_ID:', student.ID, '}');
            }
            else {
                console.warn(`[StudentService] MyEnrollments - No student found with email: ${userEmail}`);
                req.query.where({ 'student_ID': -1 }); // Ensure no data is returned
            }
        }
        else {
            console.warn('[StudentService] MyEnrollments - No email found, query will return no results');
            req.query.where({ 'student_ID': -1 }); // Ensure no data is returned
        }
    });
    // Before enrollment deletion - capture course_ID for later use
    this.before('DELETE', Enrollments, async (req) => {
        // Get the enrollment being deleted to capture course_ID
        const enrollmentId = req.data.ID;
        const enrollment = await SELECT.one.from(EnrollmentsDB).where({ ID: enrollmentId });
        if (enrollment) {
            // Store course_ID in request context for use in after handler
            req._courseId = enrollment.course_ID;
            console.log(`[StudentService] Enrollments DELETE - Captured course_ID: ${enrollment.course_ID}`);
        }
    });
    // After enrollment creation - increment course enrolled count
    this.after('CREATE', Enrollments, async (data, req) => {
        const courseId = data.course_ID;
        console.log(`[StudentService] Enrollments CREATE completed - Incrementing enrolled count for course ${courseId}`);
        // Count current enrollments with status ENROLLED
        const enrolledCount = await SELECT.from(EnrollmentsDB)
            .where({ course_ID: courseId })
            .and({ status: 'ENROLLED' });
        // Update the course enrolled count
        await cds_1.default.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
        console.log(`[StudentService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
    });
    // After enrollment update - recalculate course enrolled count if status changed
    this.after('UPDATE', Enrollments, async (data, req) => {
        const courseId = data.course_ID;
        console.log(`[StudentService] Enrollments UPDATE completed - Recalculating enrolled count for course ${courseId}`);
        // Count current enrollments with status ENROLLED
        const enrolledCount = await SELECT.from(EnrollmentsDB)
            .where({ course_ID: courseId })
            .and({ status: 'ENROLLED' });
        // Update the course enrolled count
        await cds_1.default.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
        console.log(`[StudentService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
    });
    // After enrollment deletion - decrement course enrolled count
    this.after('DELETE', Enrollments, async (data, req) => {
        // Get course_ID from request context (captured in before handler)
        const courseId = req._courseId;
        if (!courseId) {
            console.warn(`[StudentService] Enrollments DELETE - No course_ID found in request context`);
            return;
        }
        console.log(`[StudentService] Enrollments DELETE completed - Decrementing enrolled count for course ${courseId}`);
        // Count current enrollments with status ENROLLED
        const enrolledCount = await SELECT.from(EnrollmentsDB)
            .where({ course_ID: courseId })
            .and({ status: 'ENROLLED' });
        // Update the course enrolled count
        await cds_1.default.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
        console.log(`[StudentService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
    });
    // Log successful reads for auditing
    this.after('READ', MyProfile, async (results, req) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[StudentService] MyProfile READ completed - User: ${userEmail}, Records returned: ${count}`);
    });
    this.after('READ', MyEnrollments, async (results, req) => {
        if (!results)
            return results;
        const enrollments = Array.isArray(results) ? results : [results];
        const { Departments } = cds_1.default.entities('com.sap.capire.courseregistration');
        for (const enrollment of enrollments) {
            if (enrollment.course_ID) {
                const course = await SELECT.one.from(Courses).where({ ID: enrollment.course_ID });
                if (course && course.department_ID) {
                    const dept = await SELECT.one.from(Departments).where({ ID: course.department_ID });
                    if (dept) {
                        enrollment.departmentName = dept.departmentName;
                    }
                }
            }
        }
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[StudentService] MyEnrollments READ completed - User: ${userEmail}, Records returned: ${count}`);
        return results;
    });
});
/**
 * Extract email from request user info
 * Returns the authenticated user's email from JWT token or test headers
 */
function getUserEmail(req) {
    // Priority 1: Check if user info is available from Auth0 JWT token
    if (req.user && req.user.email) {
        console.log('[StudentService] getUserEmail - Using Auth0 JWT email:', req.user.email);
        return req.user.email;
    }
    // Priority 2: Check for custom header (for testing/development)
    if (req.headers['x-user-email']) {
        console.log('[StudentService] getUserEmail - Using test header email:', req.headers['x-user-email']);
        return req.headers['x-user-email'];
    }
    // No user info available
    console.warn('[StudentService] getUserEmail - No user email found! req.user:', JSON.stringify(req.user));
    console.warn('[StudentService] getUserEmail - Available headers:', Object.keys(req.headers).join(', '));
    return null;
}
/**
 * Extract role from request user info
 * Returns the authenticated user's role from JWT token or test headers
 */
function getUserRole(req) {
    // Priority 1: Check if user info is available from Auth0 JWT token
    if (req.user) {
        const role = req.user['custom:role'] || req.user.role;
        if (role) {
            console.log('[StudentService] getUserRole - Using Auth0 JWT role:', role);
            return role;
        }
    }
    // Priority 2: Check for custom header (for testing/development)
    if (req.headers['x-user-role']) {
        console.log('[StudentService] getUserRole - Using test header role:', req.headers['x-user-role']);
        return req.headers['x-user-role'];
    }
    // Default to student if no role found (fallback for development)
    console.warn('[StudentService] getUserRole - No user role found! Defaulting to "student"');
    console.warn('[StudentService] getUserRole - req.user:', JSON.stringify(req.user));
    return 'student';
}
