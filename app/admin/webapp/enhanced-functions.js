// **ENHANCED VALIDATION & CRUD FUNCTIONS**

// **1. VALIDATION FUNCTIONS**

async function validateUniqueFields(type, field, value, excludeId = null) {
    try {
        const response = await fetch(`/admin/${type}`);
        const data = await response.json();
        const items = data.value || [];
        
        return !items.some(item => 
            item[field]?.toLowerCase() === value.toLowerCase() && 
            item.ID !== excludeId
        );
    } catch (error) {
        console.error('Validation error:', error);
        return true; // Allow operation if validation fails
    }
}

// **2. ENHANCED STUDENT CREATION WITH VALIDATION**

async function createStudentWithValidation(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const studentNumber = formData.get('studentNumber');
    const email = formData.get('email');
    
    // Validate unique fields
    const isStudentNumberUnique = await validateUniqueFields('Students', 'studentNumber', studentNumber);
    const isEmailUnique = await validateUniqueFields('Students', 'email', email);
    
    if (!isStudentNumberUnique) {
        alert('❌ Student Number already exists! Please use a different number.');
        return;
    }
    
    if (!isEmailUnique) {
        alert('❌ Email already exists! Please use a different email address.');
        return;
    }
    
    const studentData = {
        studentNumber: studentNumber,
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: email,
        department_ID: parseInt(formData.get('department_ID')),
        ectsLimit: parseInt(formData.get('ectsLimit'))
    };

    try {
        const response = await fetch('/admin/Students', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to create student');
        }
        
        alert('✅ Student created successfully!');
        closeModal();
        loadAllAdminData();
        
    } catch (error) {
        alert('❌ Error creating student: ' + error.message);
    }
}

// **3. ENHANCED COURSE CREATION WITH VALIDATION**

async function createCourseWithValidation(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    
    const courseCode = formData.get('courseCode');
    
    // Validate unique course code
    const isCourseCodeUnique = await validateUniqueFields('Courses', 'courseCode', courseCode);
    
    if (!isCourseCodeUnique) {
        alert('❌ Course Code already exists! Please use a different code.');
        return;
    }
    
    const courseData = {
        courseCode: courseCode,
        courseName: formData.get('courseName'),
        description: formData.get('description'),
        ects: parseInt(formData.get('ects')),
        quota: parseInt(formData.get('quota')),
        enrolled: 0,
        isActive: true,
        semester: formData.get('semester'),
        instructor_ID: 1,
        department_ID: 1
    };

    try {
        const response = await fetch('/admin/Courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(courseData)
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(error || 'Failed to create course');
        }
        
        alert('✅ Course created successfully!');
        closeModal();
        loadAllAdminData();
        
    } catch (error) {
        alert('❌ Error creating course: ' + error.message);
    }
}

// **4. CASCADE DELETE FUNCTIONS**

async function deleteStudentCascade(id, name) {
    try {
        // First, get all enrollments for this student
        const enrollResponse = await fetch('/admin/Enrollments');
        const enrollData = await enrollResponse.json();
        const studentEnrollments = (enrollData.value || []).filter(e => e.student_ID === id);
        
        const confirmMessage = `🗑️ Delete student "${name}"?\n\n` +
            `This will also delete:\n` +
            `• ${studentEnrollments.length} enrollment(s)\n` +
            `• All associated academic records\n\n` +
            `This action cannot be undone!`;
        
        if (!confirm(confirmMessage)) return;
        
        // Delete enrollments first
        for (const enrollment of studentEnrollments) {
            await fetch(`/admin/Enrollments(${enrollment.ID})`, { method: 'DELETE' });
        }
        
        // Then delete the student
        const response = await fetch(`/admin/Students(${id})`, { method: 'DELETE' });
        
        if (!response.ok) {
            throw new Error('Failed to delete student');
        }
        
        alert(`✅ Student "${name}" and all associated records deleted successfully!`);
        loadAllAdminData();
        
    } catch (error) {
        alert('❌ Error deleting student: ' + error.message);
    }
}

async function deleteCourseCascade(id, name) {
    try {
        // First, get all enrollments for this course
        const enrollResponse = await fetch('/admin/Enrollments');
        const enrollData = await enrollResponse.json();
        const courseEnrollments = (enrollData.value || []).filter(e => e.course_ID === id);
        
        // Get affected students
        const studentResponse = await fetch('/admin/Students');
        const studentData = await studentResponse.json();
        const affectedStudents = (studentData.value || []).filter(s => 
            courseEnrollments.some(e => e.student_ID === s.ID)
        );
        
        const confirmMessage = `🗑️ Delete course "${name}"?\n\n` +
            `This will also delete:\n` +
            `• ${courseEnrollments.length} enrollment(s)\n` +
            `• Academic records for ${affectedStudents.length} student(s)\n` +
            `• All grades and progress in this course\n\n` +
            `Affected students: ${affectedStudents.map(s => s.firstName + ' ' + s.lastName).join(', ')}\n\n` +
            `This action cannot be undone!`;
        
        if (!confirm(confirmMessage)) return;
        
        // Delete enrollments first
        for (const enrollment of courseEnrollments) {
            await fetch(`/admin/Enrollments(${enrollment.ID})`, { method: 'DELETE' });
        }
        
        // Then delete the course
        const response = await fetch(`/admin/Courses(${id})`, { method: 'DELETE' });
        
        if (!response.ok) {
            throw new Error('Failed to delete course');
        }
        
        alert(`✅ Course "${name}" and all associated enrollments deleted successfully!`);
        loadAllAdminData();
        
    } catch (error) {
        alert('❌ Error deleting course: ' + error.message);
    }
}

async function deleteInstructorCascade(id, name) {
    try {
        // Get courses taught by this instructor
        const courseResponse = await fetch('/admin/Courses');
        const courseData = await courseResponse.json();
        const instructorCourses = (courseData.value || []).filter(c => c.instructor_ID === id);
        
        if (instructorCourses.length > 0) {
            const confirmMessage = `⚠️ Instructor "${name}" is teaching ${instructorCourses.length} course(s):\n\n` +
                instructorCourses.map(c => `• ${c.courseCode} - ${c.courseName}`).join('\n') + '\n\n' +
                `You must either:\n` +
                `1. Reassign these courses to another instructor, OR\n` +
                `2. Delete these courses (and all their enrollments)\n\n` +
                `What would you like to do?`;
            
            const action = confirm(confirmMessage + '\n\nClick OK to DELETE courses, Cancel to abort.');
            
            if (!action) {
                alert('❌ Operation cancelled. Please reassign courses first.');
                return;
            }
            
            // Delete courses and their enrollments
            for (const course of instructorCourses) {
                await deleteCourseCascade(course.ID, course.courseName);
            }
        }
        
        // Now delete the instructor
        const response = await fetch(`/admin/Instructors(${id})`, { method: 'DELETE' });
        
        if (!response.ok) {
            throw new Error('Failed to delete instructor');
        }
        
        alert(`✅ Instructor "${name}" deleted successfully!`);
        loadAllAdminData();
        
    } catch (error) {
        alert('❌ Error deleting instructor: ' + error.message);
    }
}

// **5. ENHANCED ENROLLMENT MANAGEMENT**

async function deleteEnrollmentCascade(id) {
    try {
        // Get enrollment details
        const response = await fetch('/admin/Enrollments');
        const data = await response.json();
        const enrollment = (data.value || []).find(e => e.ID === id);
        
        if (!enrollment) {
            alert('❌ Enrollment not found');
            return;
        }
        
        const confirmMessage = `🗑️ Remove this enrollment?\n\n` +
            `• Student ID: ${enrollment.student_ID}\n` +
            `• Course ID: ${enrollment.course_ID}\n` +
            `• Status: ${enrollment.status}\n` +
            `• Grade: ${enrollment.grade || 'Not graded'}\n\n` +
            `This will permanently remove the student's progress in this course.`;
        
        if (!confirm(confirmMessage)) return;
        
        const deleteResponse = await fetch(`/admin/Enrollments(${id})`, { method: 'DELETE' });
        
        if (!deleteResponse.ok) {
            throw new Error('Failed to delete enrollment');
        }
        
        alert('✅ Enrollment removed successfully!');
        loadAllAdminData();
        
    } catch (error) {
        alert('❌ Error removing enrollment: ' + error.message);
    }
}

// **6. EXPORT ENHANCED FUNCTIONS TO GLOBAL SCOPE**
window.createStudentWithValidation = createStudentWithValidation;
window.createCourseWithValidation = createCourseWithValidation;
window.deleteStudentCascade = deleteStudentCascade;
window.deleteCourseCascade = deleteCourseCascade;
window.deleteInstructorCascade = deleteInstructorCascade;
window.deleteEnrollmentCascade = deleteEnrollmentCascade;
