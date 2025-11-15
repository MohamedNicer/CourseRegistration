-- **DEPARTMENTS**
INSERT INTO com_sap_capire_courseregistration_Departments (ID, departmentName, faculty, university_ID) VALUES
(1, 'Computer Science', 'Engineering', 1),
(2, 'Business Administration', 'Business', 1),
(3, 'Mathematics', 'Science', 1),
(4, 'Psychology', 'Social Sciences', 1),
(5, 'Mechanical Engineering', 'Engineering', 1);

-- **INSTRUCTORS**
INSERT INTO com_sap_capire_courseregistration_Instructors (ID, instructorId, email, firstName, lastName, department_ID) VALUES
(1, 'INS001', 'john.instructor@university.edu', 'John', 'Smith', 1),
(2, 'INS002', 'jane.instructor@university.edu', 'Jane', 'Doe', 2),
(3, 'INS003', 'mike.instructor@university.edu', 'Mike', 'Wilson', 1),
(4, 'INS004', 'sarah.instructor@university.edu', 'Sarah', 'Brown', 3),
(5, 'INS005', 'david.instructor@university.edu', 'David', 'Lee', 2),
(6, 'INS006', 'emma.instructor@university.edu', 'Emma', 'Garcia', 4);

-- **STUDENTS**
INSERT INTO com_sap_capire_courseregistration_Students (ID, studentNumber, email, firstName, lastName, ectsLimit, department_ID) VALUES
(1, 'STU001', 'alice.test@university.edu', 'Alice', 'Johnson', 60, 1),
(2, 'STU002', 'bob.test@university.edu', 'Bob', 'Williams', 60, 1),
(3, 'STU003', 'carol.test@university.edu', 'Carol', 'Davis', 45, 2),
(4, 'STU004', 'daniel.test@university.edu', 'Daniel', 'Miller', 60, 2),
(5, 'STU005', 'eva.test@university.edu', 'Eva', 'Martinez', 75, 1),
(6, 'STU006', 'frank.test@university.edu', 'Frank', 'Taylor', 60, 3),
(7, 'STU007', 'grace.test@university.edu', 'Grace', 'Anderson', 60, 1),
(8, 'STU008', 'henry.test@university.edu', 'Henry', 'Thomas', 30, 2),
(9, 'STU009', 'iris.test@university.edu', 'Iris', 'White', 60, 4),
(10, 'STU010', 'jack.test@university.edu', 'Jack', 'Harris', 90, 1);

-- **COURSES**
INSERT INTO com_sap_capire_courseregistration_Courses (ID, courseCode, courseName, description, ects, quota, enrolled, isActive, semester, instructor_ID, department_ID) VALUES
-- Computer Science Courses
(1, 'CS101', 'Introduction to Programming', 'Basic programming concepts using Python', 6, 50, 3, true, 'Fall 2025', 1, 1),
(2, 'CS201', 'Data Structures', 'Advanced data structures and algorithms', 8, 40, 2, true, 'Fall 2025', 1, 1),
(3, 'CS301', 'Database Systems', 'Relational databases and SQL', 6, 35, 1, true, 'Spring 2026', 3, 1),
(4, 'CS401', 'Software Engineering', 'Large-scale software development', 8, 30, 0, true, 'Spring 2026', 3, 1),
(5, 'CS302', 'Web Development', 'Modern web technologies', 6, 25, 25, true, 'Fall 2025', 1, 1), -- FULL COURSE

-- Business Administration Courses  
(6, 'BA101', 'Business Fundamentals', 'Introduction to business concepts', 6, 60, 2, true, 'Fall 2025', 2, 2),
(7, 'BA201', 'Marketing Principles', 'Marketing strategies and consumer behavior', 6, 45, 1, true, 'Fall 2025', 5, 2),
(8, 'BA301', 'Financial Management', 'Corporate finance and investment', 8, 35, 1, true, 'Spring 2026', 2, 2),
(9, 'BA401', 'Strategic Management', 'Business strategy and planning', 8, 30, 0, false, 'Spring 2026', 5, 2), -- INACTIVE

-- Mathematics Courses
(10, 'MATH101', 'Calculus I', 'Differential and integral calculus', 8, 80, 1, true, 'Fall 2025', 4, 3),
(11, 'MATH201', 'Linear Algebra', 'Vectors, matrices, and linear transformations', 6, 60, 0, true, 'Spring 2026', 4, 3),

-- Psychology Courses  
(12, 'PSY101', 'Introduction to Psychology', 'Basic psychological principles', 6, 100, 1, true, 'Fall 2025', 6, 4),
(13, 'PSY201', 'Research Methods', 'Psychological research design', 6, 40, 0, true, 'Spring 2026', 6, 4);

-- **ENROLLMENTS** (Various scenarios)
INSERT INTO com_sap_capire_courseregistration_Enrollments (ID, student_ID, course_ID, enrollmentDate, status, grade) VALUES
-- Alice Johnson (STU001) - CS Student
(1, 1, 1, '2025-09-01T10:00:00Z', 'COMPLETED', 18.5),
(2, 1, 2, '2025-09-01T10:30:00Z', 'ENROLLED', NULL),
(3, 1, 10, '2025-09-01T11:00:00Z', 'ENROLLED', NULL), -- Math course

-- Bob Williams (STU002) - CS Student  
(4, 2, 1, '2025-09-01T14:00:00Z', 'COMPLETED', 15.0),
(5, 2, 2, '2025-09-01T14:30:00Z', 'ENROLLED', 12.5),

-- Carol Davis (STU003) - Business Student
(6, 3, 6, '2025-09-02T09:00:00Z', 'ENROLLED', NULL),
(7, 3, 7, '2025-09-02T09:30:00Z', 'COMPLETED', 16.0),

-- Daniel Miller (STU004) - Business Student
(8, 4, 6, '2025-09-02T11:00:00Z', 'ENROLLED', 14.0),
(9, 4, 8, '2025-09-02T11:30:00Z', 'ENROLLED', NULL),

-- Eva Martinez (STU005) - CS Student with high ECTS limit
(10, 5, 3, '2025-09-03T10:00:00Z', 'ENROLLED', NULL),

-- Frank Taylor (STU006) - Math Student
(11, 6, 10, '2025-09-03T14:00:00Z', 'ENROLLED', 11.0),

-- Grace Anderson (STU007) - CS Student
(12, 7, 1, '2025-09-04T10:00:00Z', 'ENROLLED', NULL),

-- Henry Thomas (STU008) - Business Student with low ECTS limit
(13, 8, 7, '2025-09-04T15:00:00Z', 'COMPLETED', 8.5), -- FAILED GRADE

-- Iris White (STU009) - Psychology Student  
(14, 9, 12, '2025-09-05T10:00:00Z', 'ENROLLED', NULL);

-- **UNIVERSITIES** 
INSERT INTO com_sap_capire_courseregistration_Universities (ID, universityName, location) VALUES
(1, 'Technology University', 'Tech City');
