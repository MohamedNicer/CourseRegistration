-- **DEPARTMENTS**
INSERT INTO Departments (ID, departmentName, faculty, university_ID) VALUES
(1, 'Computer Science', 'Engineering', 1),
(2, 'Business Administration', 'Business', 1),
(3, 'Mathematics', 'Science', 1),
(4, 'Psychology', 'Social Sciences', 1),
(5, 'Mechanical Engineering', 'Engineering', 1);

-- **INSTRUCTORS**
INSERT INTO Instructors (ID, instructorId, email, firstName, lastName, department_ID) VALUES
(1, 'INS001', 'john.smith@university.edu', 'John', 'Smith', 1),
(2, 'INS002', 'jane.doe@university.edu', 'Jane', 'Doe', 2),
(3, 'INS003', 'mike.wilson@university.edu', 'Mike', 'Wilson', 1),
(4, 'INS004', 'sarah.brown@university.edu', 'Sarah', 'Brown', 3),
(5, 'INS005', 'david.lee@university.edu', 'David', 'Lee', 2),
(6, 'INS006', 'emma.garcia@university.edu', 'Emma', 'Garcia', 4);

-- **STUDENTS**
INSERT INTO Students (ID, studentNumber, email, firstName, lastName, ectsLimit, department_ID) VALUES
(1, 'STU001', 'alice.johnson@student.edu', 'Alice', 'Johnson', 60, 1),
(2, 'STU002', 'bob.williams@student.edu', 'Bob', 'Williams', 60, 1),
(3, 'STU003', 'carol.davis@student.edu', 'Carol', 'Davis', 45, 2),
(4, 'STU004', 'daniel.miller@student.edu', 'Daniel', 'Miller', 60, 2),
(5, 'STU005', 'eva.martinez@student.edu', 'Eva', 'Martinez', 75, 1),
(6, 'STU006', 'frank.taylor@student.edu', 'Frank', 'Taylor', 60, 3),
(7, 'STU007', 'grace.anderson@student.edu', 'Grace', 'Anderson', 60, 1),
(8, 'STU008', 'henry.thomas@student.edu', 'Henry', 'Thomas', 30, 2),
(9, 'STU009', 'iris.white@student.edu', 'Iris', 'White', 60, 4),
(10, 'STU010', 'jack.harris@student.edu', 'Jack', 'Harris', 90, 1);

-- **COURSES**
INSERT INTO Courses (ID, courseCode, courseName, description, ects, quota, enrolled, isActive, semester, instructor_ID, department_ID) VALUES
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
INSERT INTO Enrollments (ID, student_ID, course_ID, enrollmentDate, status, grade, ects) VALUES
-- Alice Johnson (STU001) - CS Student
(1, 1, 1, '2025-09-01T10:00:00Z', 'COMPLETED', 18.5, 6),
(2, 1, 2, '2025-09-01T10:30:00Z', 'ENROLLED', NULL, 8),
(3, 1, 10, '2025-09-01T11:00:00Z', 'ENROLLED', NULL, 8), -- Math course

-- Bob Williams (STU002) - CS Student  
(4, 2, 1, '2025-09-01T14:00:00Z', 'COMPLETED', 15.0, 6),
(5, 2, 2, '2025-09-01T14:30:00Z', 'ENROLLED', 12.5, 8),

-- Carol Davis (STU003) - Business Student
(6, 3, 6, '2025-09-02T09:00:00Z', 'ENROLLED', NULL, 6),
(7, 3, 7, '2025-09-02T09:30:00Z', 'COMPLETED', 16.0, 6),

-- Daniel Miller (STU004) - Business Student
(8, 4, 6, '2025-09-02T11:00:00Z', 'ENROLLED', 14.0, 6),
(9, 4, 8, '2025-09-02T11:30:00Z', 'ENROLLED', NULL, 8),

-- Eva Martinez (STU005) - CS Student with high ECTS limit
(10, 5, 3, '2025-09-03T10:00:00Z', 'ENROLLED', NULL, 6),

-- Frank Taylor (STU006) - Math Student
(11, 6, 10, '2025-09-03T14:00:00Z', 'ENROLLED', 11.0, 8),

-- Grace Anderson (STU007) - CS Student
(12, 7, 1, '2025-09-04T10:00:00Z', 'ENROLLED', NULL, 6),

-- Henry Thomas (STU008) - Business Student with low ECTS limit
(13, 8, 7, '2025-09-04T15:00:00Z', 'COMPLETED', 8.5, 6), -- FAILED GRADE

-- Iris White (STU009) - Psychology Student  
(14, 9, 12, '2025-09-05T10:00:00Z', 'ENROLLED', NULL, 6);

-- **UNIVERSITIES** 
INSERT INTO Universities (ID, universityName, location, establishedYear) VALUES
(1, 'Technology University', 'Tech City', 1985);
