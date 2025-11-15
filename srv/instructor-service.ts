import cds from '@sap/cds';
const { SELECT } = cds.ql;

export default cds.service.impl(async function(this: any) {
    const { Enrollments, Courses, Instructors } = this.entities;

    // Enforce role-based access - only instructors and admins can access
    this.before('*', '*', async (req: any) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        const allowedRoles = ['instructor', 'admin'];
        
        console.log(`[InstructorService] Access check - Email: ${userEmail}, Role: ${userRole}, Event: ${req.event}, Target: ${req.target?.name || 'unknown'}`);
        
        if (!allowedRoles.includes(userRole)) {
            console.log(`[InstructorService] ACCESS DENIED - Role '${userRole}' not in allowed roles: ${allowedRoles.join(', ')}`);
            req.reject(403, `Access denied. Required roles: ${allowedRoles.join(', ')}`);
        } else {
            console.log(`[InstructorService] ACCESS GRANTED - Role '${userRole}' is allowed`);
        }
    });

    // Before enrollment update - automatically set status based on grade
    this.before('UPDATE', Enrollments, async (req: any) => {
        // Check if grade is being updated
        if (req.data.grade !== undefined && req.data.grade !== null) {
            const grade = parseFloat(req.data.grade);
            console.log(`[InstructorService] Enrollments UPDATE - Grade entered: ${grade}`);
            
            // Automatically set status based on grade
            if (grade >= 18) {
                req.data.status = 'EXCELLENT';
                console.log(`[InstructorService] Auto-setting status to EXCELLENT (grade >= 18)`);
            } else if (grade >= 16) {
                req.data.status = 'VERY_GOOD';
                console.log(`[InstructorService] Auto-setting status to VERY_GOOD (grade >= 16)`);
            } else if (grade >= 14) {
                req.data.status = 'GOOD';
                console.log(`[InstructorService] Auto-setting status to GOOD (grade >= 14)`);
            } else if (grade >= 12) {
                req.data.status = 'SATISFACTORY';
                console.log(`[InstructorService] Auto-setting status to SATISFACTORY (grade >= 12)`);
            } else if (grade >= 10) {
                req.data.status = 'PASSED';
                console.log(`[InstructorService] Auto-setting status to PASSED (grade >= 10)`);
            } else {
                req.data.status = 'FAILED';
                console.log(`[InstructorService] Auto-setting status to FAILED (grade < 10)`);
            }
        }
    });

    // Filter Enrollments by logged-in instructor's courses (admins see all)
    this.before('READ', Enrollments, async (req: any) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        
        console.log('[InstructorService] Enrollments READ - User email:', userEmail, 'Role:', userRole);
        
        // Admins can see all enrollments, no filtering needed
        if (userRole === 'admin') {
            console.log('[InstructorService] Enrollments - Admin user, no filtering applied');
            return;
        }
        
        // For instructors, filter by their courses
        if (userEmail) {
            // First, verify the instructor exists
            const instructor = await SELECT.one.from(Instructors).where({ email: userEmail });
            
            if (instructor) {
                console.log(`[InstructorService] Enrollments - Found instructor ID: ${instructor.ID} for email: ${userEmail}`);
                
                // Get all courses taught by this instructor
                const courses = await SELECT.from(Courses).where({ instructor_ID: instructor.ID });
                const courseIds = courses.map((c: any) => c.ID);
                
                console.log(`[InstructorService] Enrollments - Instructor teaches ${courseIds.length} courses: [${courseIds.join(', ')}]`);
                
                if (courseIds.length > 0) {
                    req.query.where({ 'course_ID': { in: courseIds } });
                    console.log('[InstructorService] Enrollments - Applied filter: { course_ID: { in:', courseIds, '} }');
                } else {
                    console.warn(`[InstructorService] Enrollments - Instructor has no courses, returning empty result`);
                    req.query.where({ 'course_ID': -1 }); // Ensure no data is returned
                }
            } else {
                console.warn(`[InstructorService] Enrollments - No instructor found with email: ${userEmail}`);
                req.query.where({ 'course_ID': -1 }); // Ensure no data is returned
            }
        } else {
            console.warn('[InstructorService] Enrollments - No email found, query will return no results');
            req.query.where({ 'course_ID': -1 }); // Ensure no data is returned
        }
    });

    // Filter Instructors by logged-in user (admins see all)
    this.before('READ', Instructors, async (req: any) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        
        console.log('[InstructorService] Instructors READ - User email:', userEmail, 'Role:', userRole);
        
        // Admins can see all instructors, no filtering needed
        if (userRole === 'admin') {
            console.log('[InstructorService] Instructors - Admin user, no filtering applied');
            return;
        }
        
        // For instructors, filter by their email
        if (userEmail) {
            req.query.where({ email: userEmail });
            console.log('[InstructorService] Instructors - Applied filter: { email:', userEmail, '}');
        } else {
            console.warn('[InstructorService] Instructors - No email found, query will return no results');
            req.query.where({ 'ID': -1 }); // Ensure no data is returned
        }
    });

    // Filter Courses by logged-in instructor (admins see all)
    this.before('READ', Courses, async (req: any) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        
        console.log('[InstructorService] Courses READ - User email:', userEmail, 'Role:', userRole);
        
        // Admins can see all courses, no filtering needed
        if (userRole === 'admin') {
            console.log('[InstructorService] Courses - Admin user, no filtering applied');
            return;
        }
        
        // For instructors, filter by their email
        if (userEmail) {
            req.query.where({ 'instructor.email': userEmail });
            console.log('[InstructorService] Courses - Applied filter: { instructor.email:', userEmail, '}');
        } else {
            console.warn('[InstructorService] Courses - No email found, query will return no results');
            req.query.where({ 'instructor_ID': -1 }); // Ensure no data is returned
        }
    });

    // Add department info to courses after read
    this.after('READ', Courses, async (results: any, req: any) => {
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
        }
        
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[InstructorService] Courses READ completed - User: ${userEmail}, Role: ${userRole}, Records returned: ${count}`);
        
        return results;
    });
    
    // Log successful reads for auditing
    this.after('READ', Enrollments, async (results: any, req: any) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[InstructorService] Enrollments READ completed - User: ${userEmail}, Role: ${userRole}, Records returned: ${count}`);
    });
});

/**
 * Extract email from request user info
 * Returns the authenticated user's email from JWT token or test headers
 */
function getUserEmail(req: any): string | null {
    // Priority 1: Check if user info is available from Auth0 JWT token
    if (req.user && req.user.email) {
        console.log('[InstructorService] getUserEmail - Using Auth0 JWT email:', req.user.email);
        return req.user.email;
    }
    
    // Priority 2: Check for custom header (for testing/development)
    if (req.headers['x-user-email']) {
        console.log('[InstructorService] getUserEmail - Using test header email:', req.headers['x-user-email']);
        return req.headers['x-user-email'];
    }
    
    // No user info available
    console.warn('[InstructorService] getUserEmail - No user email found! req.user:', JSON.stringify(req.user));
    console.warn('[InstructorService] getUserEmail - Available headers:', Object.keys(req.headers).join(', '));
    return null;
}

/**
 * Extract role from request user info
 * Returns the authenticated user's role from JWT token or test headers
 */
function getUserRole(req: any): string {
    // Priority 1: Check if user info is available from Auth0 JWT token
    if (req.user) {
        const role = req.user['custom:role'] || req.user.role;
        if (role) {
            console.log('[InstructorService] getUserRole - Using Auth0 JWT role:', role);
            return role;
        }
    }
    
    // Priority 2: Check for custom header (for testing/development)
    if (req.headers['x-user-role']) {
        console.log('[InstructorService] getUserRole - Using test header role:', req.headers['x-user-role']);
        return req.headers['x-user-role'];
    }
    
    // Default to instructor if no role found (fallback for development)
    console.warn('[InstructorService] getUserRole - No user role found! Defaulting to "instructor"');
    console.warn('[InstructorService] getUserRole - req.user:', JSON.stringify(req.user));
    return 'instructor';
}
