-- **CREATE TABLES**

CREATE TABLE IF NOT EXISTS Universities (
    ID INTEGER PRIMARY KEY,
    universityName TEXT NOT NULL,
    location TEXT,
    establishedYear INTEGER
);

CREATE TABLE IF NOT EXISTS Departments (
    ID INTEGER PRIMARY KEY,
    departmentName TEXT NOT NULL,
    faculty TEXT,
    university_ID INTEGER,
    FOREIGN KEY (university_ID) REFERENCES Universities(ID)
);

CREATE TABLE IF NOT EXISTS Instructors (
    ID INTEGER PRIMARY KEY,
    instructorId TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    department_ID INTEGER,
    FOREIGN KEY (department_ID) REFERENCES Departments(ID)
);

CREATE TABLE IF NOT EXISTS Students (
    ID INTEGER PRIMARY KEY,
    studentNumber TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    ectsLimit INTEGER DEFAULT 60,
    department_ID INTEGER,
    FOREIGN KEY (department_ID) REFERENCES Departments(ID)
);

CREATE TABLE IF NOT EXISTS Courses (
    ID INTEGER PRIMARY KEY,
    courseCode TEXT UNIQUE NOT NULL,
    courseName TEXT NOT NULL,
    description TEXT,
    ects INTEGER DEFAULT 6,
    quota INTEGER DEFAULT 50,
    enrolled INTEGER DEFAULT 0,
    isActive BOOLEAN DEFAULT true,
    semester TEXT,
    instructor_ID INTEGER,
    department_ID INTEGER,
    FOREIGN KEY (instructor_ID) REFERENCES Instructors(ID),
    FOREIGN KEY (department_ID) REFERENCES Departments(ID)
);

CREATE TABLE IF NOT EXISTS Enrollments (
    ID INTEGER PRIMARY KEY,
    student_ID INTEGER NOT NULL,
    course_ID INTEGER NOT NULL,
    enrollmentDate TEXT NOT NULL,
    status TEXT DEFAULT 'ENROLLED',
    grade REAL,
    ects INTEGER,
    FOREIGN KEY (student_ID) REFERENCES Students(ID) ON DELETE CASCADE,
    FOREIGN KEY (course_ID) REFERENCES Courses(ID) ON DELETE CASCADE,
    UNIQUE(student_ID, course_ID)
);

-- **CREATE INDEXES for performance**
CREATE INDEX IF NOT EXISTS idx_students_number ON Students(studentNumber);
CREATE INDEX IF NOT EXISTS idx_students_email ON Students(email);
CREATE INDEX IF NOT EXISTS idx_instructors_email ON Instructors(email);
CREATE INDEX IF NOT EXISTS idx_courses_code ON Courses(courseCode);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON Enrollments(student_ID);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON Enrollments(course_ID);
