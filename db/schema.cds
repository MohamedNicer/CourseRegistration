namespace com.sap.capire.courseregistration;

entity Universities {
  key ID             : Integer;
      universityName : String(100);
      location       : String(100);
}

entity Departments {
  key ID             : Integer;
      departmentName : String(100);
      faculty        : String(100);  // Added faculty
      university     : Association to Universities;
}

entity Courses {
  key ID          : Integer;
      courseCode  : String(10) @assert.unique;
      courseName  : String(100);
      description : String(500);
      ects        : Integer;
      quota       : Integer;
      enrolled    : Integer default 0;
      isActive    : Boolean default true;
      semester    : String(20);
      instructor  : Association to Instructors;
      department  : Association to Departments;
}

entity Instructors {
  key ID           : Integer;
      instructorId : String(20) @assert.unique;
      email        : String(100) @assert.unique;
      firstName    : String(50);
      lastName     : String(50);
      department   : Association to Departments;
}

entity Students {
  key ID            : Integer;
      studentNumber : String(20) @assert.unique;
      email         : String(100) @assert.unique;
      firstName     : String(50);
      lastName      : String(50);
      ectsLimit     : Integer default 60;
      department    : Association to Departments;
}

entity Enrollments {
  key ID             : Integer;
      student        : Association to Students;
      course         : Association to Courses;
      enrollmentDate : DateTime;
      status         : String(20) default 'ENROLLED';
      grade          : Decimal(4,2);
}

// Add unique constraint to prevent duplicate enrollments
annotate Enrollments with {
  student @assert.unique: { student: student, course: course };
}
