import cds from '@sap/cds';
const { SELECT } = cds.ql;
const { normalizeEmail } = require('./utils/email-utils');

export default cds.service.impl(async function(this: any) {
    const { MyProfile, MyEnrollments, AvailableCourses, Enrollments } = this.entities;
    const { Students, Enrollments: EnrollmentsDB, Courses } = cds.entities('com.sap.capire.courseregistration');

    // Enforce role-based access - only students, instructors, and admins can access
    this.before('*', '*', async (req: any) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        const allowedRoles = ['student', 'instructor', 'admin'];
        
        console.log(`[StudentService] Access check - Email: ${userEmail}, Role: ${userRole}, Event: ${req.event}, Target: ${req.target?.name || 'unknown'}`);
        
        if (!allowedRoles.includes(userRole)) {
            console.log(`[StudentService] ACCESS DENIED - Role '${userRole}' not in allowed roles: ${allowedRoles.join(', ')}`);
            req.reject(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
        } else {
            console.log(`[StudentService] ACCESS GRANTED - Role '${userRole}' is allowed`);
        }
    });

    // Handle enrollment creation - automatically set student_ID from logged-in user
    this.before('CREATE', Enrollments, async (req: any) => {
        const userEmail = getUserEmail(req);
        console.log('[StudentService] Enrollments CREATE - User email:', userEmail);
        
        if (userEmail) {
            const student = await SELECT.one.from(Students).where(`LOWER(email) = LOWER('${userEmail}')`);
            
            if (student) {
                console.log(`[StudentService] Enrollments CREATE - Setting student_ID to ${student.ID}`);
                req.data.student_ID = student.ID;
                
                // Check for duplicate enrollment - student cannot enroll in the same course twice
                const existingEnrollment = await SELECT.one.from(EnrollmentsDB)
                    .where({ student_ID: student.ID })
                    .and({ course_ID: req.data.course_ID });
                
                if (existingEnrollment) {
                    console.log(`[StudentService] Enrollments CREATE - Duplicate enrollment detected for student ${student.ID} in course ${req.data.course_ID}`);
                    req.reject(400, 'You are already enrolled in this course.');
                    return;
                }
                
                // Validate ECTS availability
                const course = await SELECT.one.from(Courses).where({ ID: req.data.course_ID });
                if (course) {
                    // Get current enrollments (exclude only those that are not ENROLLED)
                    // Count ENROLLED and all graded statuses (PASSED, FAILED, EXCELLENT, etc.)
                    const enrollments = await SELECT.from(EnrollmentsDB)
                        .where({ student_ID: student.ID })
                        .and({ status: { '!=': null } });
                    
                    const ectsUsed = enrollments.reduce((sum: number, e: any) => {
                        // Only count ECTS for enrollments that are active (ENROLLED) or graded
                        if (e.status && e.status !== '') {
                            return sum + (e.course?.ects || 0);
                        }
                        return sum;
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
            } else {
                req.reject(400, 'Student not found');
            }
        } else {
            req.reject(401, 'User email not found');
        }
    });

    // Filter MyProfile by logged-in user's email
    this.before('READ', MyProfile, async (req: any) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        
        console.log(`[StudentService] MyProfile READ - Request started - Email: ${userEmail}, Role: ${userRole}`);
        
        if (userEmail) {
            // Check if student exists in database
            const student = await SELECT.one.from(Students).where(`LOWER(email) = LOWER('${userEmail}')`);
            
            if (student) {
                console.log(`[StudentService] MyProfile - Database lookup: FOUND - Student ID: ${student.ID}, Email: ${student.email}`);
            } else {
                console.warn(`[StudentService] MyProfile - Database lookup: NOT FOUND - No student record with email: ${userEmail}`);
            }
            
            req.query.where(`LOWER(email) = LOWER('${userEmail}')`);
            console.log('[StudentService] MyProfile - Applied filter: { email:', userEmail, '}');
        } else {
            console.warn('[StudentService] MyProfile - No email found in authentication context, query will return no results');
            req.query.where({ email: 'no-user@invalid.com' }); // Ensure no data is returned
        }
    });

    // Filter AvailableCourses - exclude already enrolled courses (allow cross-department enrollment)
    this.before('READ', AvailableCourses, async (req: any) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        
        console.log(`[StudentService] AvailableCourses READ - Request started - Email: ${userEmail}, Role: ${userRole}`);
        
        if (userEmail) {
            // Get the student info
            const student = await SELECT.one.from(Students).where(`LOWER(email) = LOWER('${userEmail}')`);
            
            if (student) {
                console.log(`[StudentService] AvailableCourses - Database lookup: FOUND - Student ID: ${student.ID}, Email: ${student.email}`);
                
                // Get student's enrollments
                const allEnrollments = await SELECT.from(Enrollments)
                    .where({ student_ID: student.ID });
                
                // Exclude courses where:
                // 1. Status is ENROLLED (currently taking)
                // 2. Student has passed (grade >= 10) - includes PASSED, SATISFACTORY, GOOD, VERY_GOOD, EXCELLENT
                const excludedCourseIds = allEnrollments
                    .filter((e: any) => {
                        const isEnrolled = e.status === 'ENROLLED';
                        const hasPassed = e.grade !== null && e.grade >= 10;
                        return isEnrolled || hasPassed;
                    })
                    .map((e: any) => e.course_ID);
                
                console.log(`[StudentService] AvailableCourses - Student has ${excludedCourseIds.length} courses to exclude (enrolled/completed/passed)`);
                
                // Filter: exclude courses the student is enrolled in, completed, or passed
                if (excludedCourseIds.length > 0) {
                    req.query.where({ 
                        ID: { not: { in: excludedCourseIds } }
                    });
                    console.log(`[StudentService] AvailableCourses - Applied filter: excluding ${excludedCourseIds.length} courses`);
                } else {
                    console.log(`[StudentService] AvailableCourses - No filter applied, showing all courses`);
                }
            } else {
                console.warn(`[StudentService] AvailableCourses - Database lookup: NOT FOUND - No student record with email: ${userEmail}`);
                req.query.where({ ID: -1 }); // Ensure no data is returned
            }
        } else {
            console.warn('[StudentService] AvailableCourses - No email found in authentication context, query will return no results');
            req.query.where({ ID: -1 }); // Ensure no data is returned
        }
    });

    // Add department info to available courses after read
    this.after('READ', AvailableCourses, async (results: any, req: any) => {
        if (!results) return results;
        
        const courses = Array.isArray(results) ? results : [results];
        const { Departments } = cds.entities('com.sap.capire.courseregistration');
        
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
                await cds.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: course.ID });
            }
        }
        
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[StudentService] AvailableCourses READ completed - User: ${userEmail}, Records returned: ${count}`);
        
        return results;
    });

    // Filter MyEnrollments by logged-in user's student ID
    this.before('READ', MyEnrollments, async (req: any) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        
        console.log(`[StudentService] MyEnrollments READ - Request started - Email: ${userEmail}, Role: ${userRole}`);
        
        if (userEmail) {
            // First, get the student ID from the email
            const student = await SELECT.one.from(Students).where(`LOWER(email) = LOWER('${userEmail}')`);
            
            if (student) {
                console.log(`[StudentService] MyEnrollments - Database lookup: FOUND - Student ID: ${student.ID}, Email: ${student.email}`);
                req.query.where({ 'student_ID': student.ID });
                console.log('[StudentService] MyEnrollments - Applied filter: { student_ID:', student.ID, '}');
            } else {
                console.warn(`[StudentService] MyEnrollments - Database lookup: NOT FOUND - No student record with email: ${userEmail}`);
                req.query.where({ 'student_ID': -1 }); // Ensure no data is returned
            }
        } else {
            console.warn('[StudentService] MyEnrollments - No email found in authentication context, query will return no results');
            req.query.where({ 'student_ID': -1 }); // Ensure no data is returned
        }
    });

    // Before enrollment deletion - capture course_ID for later use
    this.before('DELETE', Enrollments, async (req: any) => {
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
    this.after('CREATE', Enrollments, async (data: any, req: any) => {
        const courseId = data.course_ID;
        console.log(`[StudentService] Enrollments CREATE completed - Incrementing enrolled count for course ${courseId}`);
        
        // Count current enrollments with status ENROLLED
        const enrolledCount = await SELECT.from(EnrollmentsDB)
            .where({ course_ID: courseId })
            .and({ status: 'ENROLLED' });
        
        // Update the course enrolled count
        await cds.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
        console.log(`[StudentService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
    });

    // After enrollment update - recalculate course enrolled count if status changed
    this.after('UPDATE', Enrollments, async (data: any, req: any) => {
        const courseId = data.course_ID;
        console.log(`[StudentService] Enrollments UPDATE completed - Recalculating enrolled count for course ${courseId}`);
        
        // Count current enrollments with status ENROLLED
        const enrolledCount = await SELECT.from(EnrollmentsDB)
            .where({ course_ID: courseId })
            .and({ status: 'ENROLLED' });
        
        // Update the course enrolled count
        await cds.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
        console.log(`[StudentService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
    });

    // After enrollment deletion - decrement course enrolled count
    this.after('DELETE', Enrollments, async (data: any, req: any) => {
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
        await cds.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
        console.log(`[StudentService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
    });

    // Log successful reads for auditing
    this.after('READ', MyProfile, async (results: any, req: any) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[StudentService] MyProfile READ completed - User: ${userEmail}, Records returned: ${count}`);
        
        if (count === 0 && userEmail) {
            console.warn(`[StudentService] MyProfile - WARNING: No records returned for authenticated user ${userEmail}. This may indicate an email mismatch between Auth0 and database.`);
        }
    });

    this.after('READ', MyEnrollments, async (results: any, req: any) => {
        if (!results) return results;
        
        const enrollments = Array.isArray(results) ? results : [results];
        const { Departments } = cds.entities('com.sap.capire.courseregistration');
        
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
        
        if (count === 0 && userEmail) {
            console.warn(`[StudentService] MyEnrollments - WARNING: No records returned for authenticated user ${userEmail}. This may indicate an email mismatch between Auth0 and database.`);
        }
        
        return results;
    });
});

/**
 * Extract email from request user info
 * Returns the authenticated user's email from JWT token or test headers
 * Email is normalized (lowercase, trimmed) for consistent comparison
 */
function getUserEmail(req: any): string | null {
    let email: string | null = null;
    
    // Priority 1: Check custom header (for Auth0 integration)
    if (req.headers['x-user-email']) {
        console.log('[StudentService] getUserEmail - Using X-User-Email header:', req.headers['x-user-email']);
        email = req.headers['x-user-email'];
    }
    // Priority 2: Check authUser (set by Auth0 middleware)
    else if (req.authUser && req.authUser.email) {
        console.log('[StudentService] getUserEmail - Using Auth0 JWT email:', req.authUser.email);
        email = req.authUser.email;
    }
    // Priority 3: Check req.user (may be overwritten by CDS)
    else if (req.user && req.user.email) {
        console.log('[StudentService] getUserEmail - Using req.user email:', req.user.email);
        email = req.user.email;
    }
    
    if (!email) {
        // No user info available
        console.warn('[StudentService] getUserEmail - No user email found! req.authUser:', JSON.stringify(req.authUser), 'req.user:', JSON.stringify(req.user));
        console.warn('[StudentService] getUserEmail - Available headers:', Object.keys(req.headers).join(', '));
        return null;
    }
    
    // Normalize the email for consistent comparison
    const normalizedEmail = normalizeEmail(email);
    console.log('[StudentService] getUserEmail - Normalized email:', normalizedEmail);
    return normalizedEmail;
}

/**
 * Extract role from request user info
 * Returns the authenticated user's role from JWT token or test headers
 */
function getUserRole(req: any): string {
    // Priority 1: Check custom header (for Auth0 integration)
    if (req.headers['x-user-role']) {
        console.log('[StudentService] getUserRole - Using X-User-Role header:', req.headers['x-user-role']);
        return req.headers['x-user-role'];
    }
    
    // Priority 2: Check authUser (set by Auth0 middleware)
    if (req.authUser) {
        const role = req.authUser['custom:role'] || req.authUser.role;
        if (role) {
            console.log('[StudentService] getUserRole - Using Auth0 JWT role:', role);
            return role;
        }
    }
    
    // Priority 3: Check req.user (may be overwritten by CDS)
    if (req.user) {
        const role = req.user['custom:role'] || req.user.role;
        if (role) {
            console.log('[StudentService] getUserRole - Using req.user role:', role);
            return role;
        }
    }
    
    // Default to student if no role found (fallback for development)
    console.warn('[StudentService] getUserRole - No user role found! Defaulting to "student"');
    console.warn('[StudentService] getUserRole - req.authUser:', JSON.stringify(req.authUser), 'req.user:', JSON.stringify(req.user));
    return 'student';
}
