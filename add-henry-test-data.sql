-- Add Henry as a student with low ECTS limit (30 ECTS)
INSERT INTO com_sap_capire_courseregistration_Students (ID, studentNumber, email, firstName, lastName, ectsLimit, department_ID)
VALUES (3, 'STU003', 'henry.test@university.edu', 'Henry', 'Martinez', 30, 1);

-- Add more courses to test ECTS limits
INSERT INTO com_sap_capire_courseregistration_Courses (ID, courseCode, courseName, description, ects, quota, enrolled, isActive, semester, instructor_ID, department_ID)
VALUES 
(4, 'CS301', 'Algorithms', 'Advanced algorithms and data structures', 8, 40, 0, 1, 'Fall 2024', 1, 1),
(5, 'CS401', 'Software Engineering', 'Software development methodologies', 10, 35, 0, 1, 'Fall 2024', 1, 1),
(6, 'BA201', 'Marketing Fundamentals', 'Introduction to marketing principles', 6, 50, 0, 1, 'Fall 2024', 1, 2);

-- Enroll Henry in multiple courses to exceed his ECTS limit (30 ECTS)
-- CS101 (6 ECTS) + CS201 (6 ECTS) + BA101 (8 ECTS) + CS301 (8 ECTS) = 28 ECTS (just under limit)
INSERT INTO com_sap_capire_courseregistration_Enrollments (ID, student_ID, course_ID, enrollmentDate, status, grade)
VALUES 
(6, 3, 1, datetime('now'), 'ENROLLED', NULL),  -- CS101 (6 ECTS)
(7, 3, 2, datetime('now'), 'ENROLLED', NULL),  -- CS201 (6 ECTS)
(8, 3, 3, datetime('now'), 'ENROLLED', NULL),  -- BA101 (8 ECTS)
(9, 3, 4, datetime('now'), 'ENROLLED', NULL);  -- CS301 (8 ECTS)

-- Update enrolled counts for courses
UPDATE com_sap_capire_courseregistration_Courses SET enrolled = 3 WHERE ID = 1; -- CS101
UPDATE com_sap_capire_courseregistration_Courses SET enrolled = 3 WHERE ID = 2; -- CS201
UPDATE com_sap_capire_courseregistration_Courses SET enrolled = 2 WHERE ID = 3; -- BA101
UPDATE com_sap_capire_courseregistration_Courses SET enrolled = 1 WHERE ID = 4; -- CS301
