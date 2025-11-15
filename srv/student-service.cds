using { com.sap.capire.courseregistration as db } from '../db/schema.cds';

service StudentService @(path: '/student') {

    entity Enrollments as projection on db.Enrollments;
    entity Departments as projection on db.Departments;
    
    // Student profile with department info - filtered by logged-in user in handler
    define view MyProfile as select from db.Students {
        *,
        department.departmentName,
        department.faculty
    };
    
    // Available courses (active only) - simple projection like admin service
    entity AvailableCourses as projection on db.Courses where isActive = true;
    
    // Student's enrollments - filtered by logged-in user in handler
    define view MyEnrollments as select from db.Enrollments {
        *,
        course.courseCode,
        course.courseName,
        course.ects,
        course.semester
    };
}
