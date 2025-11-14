using { com.sap.capire.courseregistration as db } from '../db/schema.cds';

service StudentService @(path: '/student') {

    entity Enrollments as projection on db.Enrollments;
    entity Departments as projection on db.Departments;
    
    // Student profile with department info
    define view MyProfile as select from db.Students {
        *,
        department.departmentName,
        department.faculty
    } where ID = 1; // Will be dynamic based on auth
    
    // Available courses (active only)
    define view AvailableCourses as select from db.Courses {
        *,
        department.departmentName
    } where isActive = true;
    
    // Student's enrollments
    define view MyEnrollments as select from db.Enrollments {
        *,
        course.courseCode,
        course.courseName,
        course.ects,
        course.semester
    } where ID = 1; // Will be dynamic based on auth
}
