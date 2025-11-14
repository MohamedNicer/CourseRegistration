using { com.sap.capire.courseregistration as db } from '../db/schema.cds';

service AdminService @(path: '/admin') {
    entity Students as projection on db.Students;
    entity Instructors as projection on db.Instructors;
    entity Courses as projection on db.Courses;
    entity Enrollments as projection on db.Enrollments;
    entity Departments as projection on db.Departments;
    entity Universities as projection on db.Universities;
}
