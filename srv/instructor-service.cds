using { com.sap.capire.courseregistration as db } from '../db/schema.cds';

service InstructorService @(path: '/instructor') {
    
    entity Students as projection on db.Students;
    entity Courses as projection on db.Courses;

    // Enrollments for instructor's courses
    define view Enrollments as select from db.Enrollments {
        *,
        student.firstName,
        student.lastName,
        student.studentNumber,
        student.email,
        course.courseCode,
        course.courseName,
        course.ects
    } where course.ID = 1; // Will be dynamic based on auth
}
