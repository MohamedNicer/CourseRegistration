import cds from '@sap/cds';

export default cds.service.impl(async function(this: any) {
    const { Students, Instructors, Courses, Enrollments, Departments, Universities } = this.entities;

    // Enforce role-based access - only admins can access
    this.before('*', '*', async (req: any) => {
        const userEmail = getUserEmail(req);
        const userRole = getUserRole(req);
        const targetEntity = req.target?.name || 'unknown';
        const operation = req.event;
        
        console.log(`[AdminService] Access check - Email: ${userEmail}, Role: ${userRole}, Event: ${operation}, Target: ${targetEntity}`);
        
        if (userRole !== 'admin') {
            console.log(`[AdminService] ACCESS DENIED - Role '${userRole}' is not 'admin'`);
            req.reject(403, 'Access denied. Admin role required.');
        } else {
            console.log(`[AdminService] ACCESS GRANTED - Admin role verified`);
        }
        
        // Log admin operations for auditing
        console.log(`[AUDIT] Admin ${userEmail} performing ${operation} on ${targetEntity}`);
    });

    // Log all READ operations for auditing
    this.after('READ', Students, async (results: any, req: any) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[AdminService] Students READ completed - Admin: ${userEmail}, Records returned: ${count}`);
    });

    this.after('READ', Instructors, async (results: any, req: any) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[AdminService] Instructors READ completed - Admin: ${userEmail}, Records returned: ${count}`);
    });

    this.after('READ', Courses, async (results: any, req: any) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[AdminService] Courses READ completed - Admin: ${userEmail}, Records returned: ${count}`);
    });

    this.after('READ', Enrollments, async (results: any, req: any) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[AdminService] Enrollments READ completed - Admin: ${userEmail}, Records returned: ${count}`);
    });

    this.after('READ', Departments, async (results: any, req: any) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[AdminService] Departments READ completed - Admin: ${userEmail}, Records returned: ${count}`);
    });

    this.after('READ', Universities, async (results: any, req: any) => {
        const userEmail = getUserEmail(req);
        const count = Array.isArray(results) ? results.length : (results ? 1 : 0);
        console.log(`[AdminService] Universities READ completed - Admin: ${userEmail}, Records returned: ${count}`);
    });

    // Log CREATE operations for auditing
    this.after('CREATE', '*', async (data: any, req: any) => {
        const userEmail = getUserEmail(req);
        const targetEntity = req.target?.name || 'unknown';
        console.log(`[AUDIT] Admin ${userEmail} CREATED record in ${targetEntity}`);
    });

    // Log UPDATE operations for auditing
    this.after('UPDATE', '*', async (data: any, req: any) => {
        const userEmail = getUserEmail(req);
        const targetEntity = req.target?.name || 'unknown';
        console.log(`[AUDIT] Admin ${userEmail} UPDATED record in ${targetEntity}`);
    });

    // Log DELETE operations for auditing
    this.after('DELETE', '*', async (data: any, req: any) => {
        const userEmail = getUserEmail(req);
        const targetEntity = req.target?.name || 'unknown';
        console.log(`[AUDIT] Admin ${userEmail} DELETED record from ${targetEntity}`);
    });

    // Before enrollment update - automatically set status based on grade
    this.before('UPDATE', Enrollments, async (req: any) => {
        const { SELECT } = cds.ql;
        
        // Check if grade is being updated
        if (req.data.grade !== undefined && req.data.grade !== null) {
            const grade = parseFloat(req.data.grade);
            console.log(`[AdminService] Enrollments UPDATE - Grade entered: ${grade}`);
            
            // Automatically set status based on grade
            if (grade >= 18) {
                req.data.status = 'EXCELLENT';
                console.log(`[AdminService] Auto-setting status to EXCELLENT (grade >= 18)`);
            } else if (grade >= 16) {
                req.data.status = 'VERY_GOOD';
                console.log(`[AdminService] Auto-setting status to VERY_GOOD (grade >= 16)`);
            } else if (grade >= 14) {
                req.data.status = 'GOOD';
                console.log(`[AdminService] Auto-setting status to GOOD (grade >= 14)`);
            } else if (grade >= 12) {
                req.data.status = 'SATISFACTORY';
                console.log(`[AdminService] Auto-setting status to SATISFACTORY (grade >= 12)`);
            } else if (grade >= 10) {
                req.data.status = 'PASSED';
                console.log(`[AdminService] Auto-setting status to PASSED (grade >= 10)`);
            } else {
                req.data.status = 'FAILED';
                console.log(`[AdminService] Auto-setting status to FAILED (grade < 10)`);
            }
        }
    });

    // After enrollment creation - increment course enrolled count
    this.after('CREATE', Enrollments, async (data: any, req: any) => {
        const courseId = data.course_ID;
        console.log(`[AdminService] Enrollments CREATE completed - Updating enrolled count for course ${courseId}`);
        
        // Count current enrollments with status ENROLLED
        const { SELECT } = cds.ql;
        const enrolledCount = await SELECT.from(Enrollments)
            .where({ course_ID: courseId })
            .and({ status: 'ENROLLED' });
        
        // Update the course enrolled count
        await cds.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
        console.log(`[AdminService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
    });

    // Before enrollment deletion - capture course_ID for later use
    this.before('DELETE', Enrollments, async (req: any) => {
        const { SELECT } = cds.ql;
        
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
    this.after('UPDATE', Enrollments, async (data: any, req: any) => {
        const courseId = data.course_ID;
        console.log(`[AdminService] Enrollments UPDATE completed - Recalculating enrolled count for course ${courseId}`);
        
        // Count current enrollments with status ENROLLED
        const { SELECT } = cds.ql;
        const enrolledCount = await SELECT.from(Enrollments)
            .where({ course_ID: courseId })
            .and({ status: 'ENROLLED' });
        
        // Update the course enrolled count
        await cds.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
        console.log(`[AdminService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
    });

    // After enrollment deletion - decrement course enrolled count
    this.after('DELETE', Enrollments, async (data: any, req: any) => {
        // Get course_ID from request context (captured in before handler)
        const courseId = req._courseId;
        
        if (!courseId) {
            console.warn(`[AdminService] Enrollments DELETE - No course_ID found in request context`);
            return;
        }
        
        console.log(`[AdminService] Enrollments DELETE completed - Updating enrolled count for course ${courseId}`);
        
        // Count current enrollments with status ENROLLED
        const { SELECT } = cds.ql;
        const enrolledCount = await SELECT.from(Enrollments)
            .where({ course_ID: courseId })
            .and({ status: 'ENROLLED' });
        
        // Update the course enrolled count
        await cds.update(Courses).set({ enrolled: enrolledCount.length }).where({ ID: courseId });
        console.log(`[AdminService] Course ${courseId} enrolled count updated to ${enrolledCount.length}`);
    });
});

/**
 * Extract email from request user info
 * Returns the authenticated user's email from JWT token or test headers
 */
function getUserEmail(req: any): string | null {
    // Priority 1: Check if user info is available from Auth0 JWT token
    if (req.user && req.user.email) {
        console.log('[AdminService] getUserEmail - Using Auth0 JWT email:', req.user.email);
        return req.user.email;
    }
    
    // Priority 2: Check for custom header (for testing/development)
    if (req.headers['x-user-email']) {
        console.log('[AdminService] getUserEmail - Using test header email:', req.headers['x-user-email']);
        return req.headers['x-user-email'];
    }
    
    // No user info available
    console.warn('[AdminService] getUserEmail - No user email found! req.user:', JSON.stringify(req.user));
    console.warn('[AdminService] getUserEmail - Available headers:', Object.keys(req.headers).join(', '));
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
            console.log('[AdminService] getUserRole - Using Auth0 JWT role:', role);
            return role;
        }
    }
    
    // Priority 2: Check for custom header (for testing/development)
    if (req.headers['x-user-role']) {
        console.log('[AdminService] getUserRole - Using test header role:', req.headers['x-user-role']);
        return req.headers['x-user-role'];
    }
    
    // Default to admin if no role found (fallback for development)
    console.warn('[AdminService] getUserRole - No user role found! Defaulting to "admin"');
    console.warn('[AdminService] getUserRole - req.user:', JSON.stringify(req.user));
    return 'admin';
}
