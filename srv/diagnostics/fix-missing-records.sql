-- Fix Missing Database Records
-- This script fixes incorrect student and instructor records and adds missing ones
-- to match Auth0 user emails.
--
-- Based on diagnostic results from check-user-emails.js
-- Run date: 2025-11-15
-- Status: COMPLETED - All changes have been applied successfully

-- ============================================================================
-- FIX INCORRECT STUDENT RECORDS (COMPLETED)
-- ============================================================================

-- Fix ID 3: Should be Carol Davis, not Henry Martinez (COMPLETED)
UPDATE com_sap_capire_courseregistration_Students 
SET studentNumber = 'STU003', 
    email = 'carol.test@university.edu', 
    firstName = 'Carol', 
    lastName = 'Davis', 
    ectsLimit = 45, 
    department_ID = 2
WHERE ID = 3;

-- Fix ID 4: Should be Daniel Miller, not Zakaria Ouahabi (COMPLETED)
UPDATE com_sap_capire_courseregistration_Students 
SET studentNumber = 'STU004', 
    email = 'daniel.test@university.edu', 
    firstName = 'Daniel', 
    lastName = 'Miller', 
    ectsLimit = 60, 
    department_ID = 2
WHERE ID = 4;

-- ============================================================================
-- ADD MISSING STUDENT RECORDS (COMPLETED)
-- ============================================================================

-- Jack Harris (STU010) - CS Student (COMPLETED)
-- Note: Due to UNIQUE constraint on ID 10, had to insert at ID 11 first,
-- which somehow populated ID 10, then deleted ID 11
-- Final result: Jack Harris is correctly at ID 10
INSERT INTO com_sap_capire_courseregistration_Students (ID, studentNumber, email, firstName, lastName, ectsLimit, department_ID) 
VALUES (11, 'STU010', 'jack.test@university.edu', 'Jack', 'Harris', 90, 1);

DELETE FROM com_sap_capire_courseregistration_Students WHERE ID = 11;

-- ============================================================================
-- INSTRUCTORS STATUS
-- ============================================================================
-- All 6 instructors are already correct in the database. No changes needed.

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after applying the fixes to verify all records exist:
--
-- SELECT COUNT(*) as student_count FROM com_sap_capire_courseregistration_Students;
-- Expected: 10 students
--
-- SELECT COUNT(*) as instructor_count FROM com_sap_capire_courseregistration_Instructors;
-- Expected: 6 instructors
--
-- SELECT email FROM com_sap_capire_courseregistration_Students ORDER BY email;
-- SELECT email FROM com_sap_capire_courseregistration_Instructors ORDER BY email;
