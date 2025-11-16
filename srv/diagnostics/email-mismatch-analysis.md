# Email Mismatch Analysis Report

**Date:** November 15, 2025  
**Database:** db.sqlite  
**Diagnostic Tool:** srv/diagnostics/check-user-emails.js

## Executive Summary

The diagnostic script has identified **12 email mismatches** between Auth0 users and database records. The primary issue is **missing database records** - several Auth0 users do not have corresponding student or instructor records in the database, which explains why the portals show empty data.

## Key Findings

### Students Analysis

**Database Status:**
- Total students in database: **4**
- Total students expected in Auth0: **10**
- Exact matches: **3**
- Issues found: **8**

**Exact Matches (Working Correctly):**
1. alice.test@university.edu ✅
2. bob.test@university.edu ✅
3. henry.test@university.edu ✅

**Missing in Database (7 users):**
These Auth0 users cannot see data because they don't exist in the database:
1. carol.test@university.edu ❌
2. daniel.test@university.edu ❌
3. eva.test@university.edu ❌
4. frank.test@university.edu ❌
5. grace.test@university.edu ❌
6. iris.test@university.edu ❌
7. jack.test@university.edu ❌

**Missing in Auth0 (1 user):**
This database record has no corresponding Auth0 user:
1. zakaria.test@university.edu (Student ID: STU004)

### Instructors Analysis

**Database Status:**
- Total instructors in database: **2**
- Total instructors expected in Auth0: **6**
- Exact matches: **2**
- Issues found: **4**

**Exact Matches (Working Correctly):**
1. john.instructor@university.edu ✅
2. jane.instructor@university.edu ✅

**Missing in Database (4 users):**
These Auth0 users cannot see data because they don't exist in the database:
1. mike.instructor@university.edu ❌
2. sarah.instructor@university.edu ❌
3. david.instructor@university.edu ❌
4. emma.instructor@university.edu ❌

## Issue Classification

### Issue Type: Missing Database Records (Primary Issue)

**Severity:** HIGH  
**Impact:** Users can authenticate but see empty portals  
**Affected Users:** 11 users (7 students + 4 instructors)

**Root Cause:**
The email-based filtering in service handlers (`student-service.ts` and `instructor-service.ts`) queries the database for records matching the authenticated user's email. When no matching record exists, the query returns empty results, causing empty portals.

**Example Flow:**
```
1. User "carol.test@university.edu" logs in via Auth0 ✅
2. JWT token contains email "carol.test@university.edu" ✅
3. Student service extracts email from token ✅
4. Service queries: SELECT * FROM Students WHERE email = 'carol.test@university.edu' ❌
5. No matching record found → Returns empty result set
6. Portal displays empty tables and charts
```

### Issue Type: Orphaned Database Record (Minor Issue)

**Severity:** LOW  
**Impact:** Database record exists but user cannot authenticate  
**Affected Users:** 1 user (zakaria.test@university.edu)

**Root Cause:**
A student record exists in the database but has no corresponding Auth0 user account. This user cannot log in to test the portal.

## Format/Case Mismatch Analysis

**Good News:** No case or formatting mismatches were found! All existing database emails match Auth0 emails exactly (same case, no extra whitespace). This means:
- Email normalization is NOT needed for existing records
- The filtering logic itself is working correctly
- The issue is purely missing data, not a code bug

## Recommendations

### Priority 1: Add Missing Database Records (REQUIRED)

To fix the empty portal issue, we need to add the missing student and instructor records to the database.

**Students to Add:**
```sql
INSERT INTO com_sap_capire_courseregistration_Students (ID, studentNumber, email, firstName, lastName, ectsLimit, department_ID)
VALUES 
  (5, 'STU005', 'carol.test@university.edu', 'Carol', 'Brown', 30, 1),
  (6, 'STU006', 'daniel.test@university.edu', 'Daniel', 'Davis', 30, 1),
  (7, 'STU007', 'eva.test@university.edu', 'Eva', 'Garcia', 30, 1),
  (8, 'STU008', 'frank.test@university.edu', 'Frank', 'Miller', 30, 1),
  (9, 'STU009', 'grace.test@university.edu', 'Grace', 'Wilson', 30, 1),
  (10, 'STU010', 'iris.test@university.edu', 'Iris', 'Moore', 30, 1),
  (11, 'STU011', 'jack.test@university.edu', 'Jack', 'Taylor', 30, 1);
```

**Instructors to Add:**
```sql
INSERT INTO com_sap_capire_courseregistration_Instructors (ID, instructorId, email, firstName, lastName, department_ID)
VALUES 
  (3, 'INS003', 'mike.instructor@university.edu', 'Mike', 'Anderson', 1),
  (4, 'INS004', 'sarah.instructor@university.edu', 'Sarah', 'Thomas', 1),
  (5, 'INS005', 'david.instructor@university.edu', 'David', 'Jackson', 1),
  (6, 'INS006', 'emma.instructor@university.edu', 'Emma', 'White', 1);
```

### Priority 2: Handle Orphaned Record (OPTIONAL)

**Option A:** Create Auth0 user for zakaria.test@university.edu  
**Option B:** Remove the database record (if user is no longer needed)  
**Option C:** Leave as-is (low impact)

### Priority 3: Implement Email Normalization (PREVENTIVE)

Even though no case mismatches exist now, implement email normalization to prevent future issues:
- Add `normalizeEmail()` utility function
- Use case-insensitive comparison in service handlers
- This will make the system more robust

## Testing Plan

After adding missing records:

1. **Test Student Portal:**
   - Log in as carol.test@university.edu
   - Verify MyProfile shows student information
   - Verify MyEnrollments shows enrollments (if any)
   - Verify AvailableCourses shows courses

2. **Test Instructor Portal:**
   - Log in as mike.instructor@university.edu
   - Verify Courses shows instructor's courses (if any)
   - Verify Enrollments shows course enrollments
   - Verify Instructors shows instructor profile

3. **Verify Existing Users Still Work:**
   - Test alice.test@university.edu (student)
   - Test john.instructor@university.edu (instructor)

## Next Steps

1. ✅ **COMPLETED:** Run diagnostic script
2. ✅ **COMPLETED:** Document findings
3. **TODO:** Create SQL script to add missing records (Task 6)
4. **TODO:** Execute SQL script against database (Task 6)
5. **TODO:** Verify all users can now see data (Tasks 7-8)
6. **TODO:** Implement email normalization for future-proofing (Task 3)

## Conclusion

The root cause of empty portals is **missing database records**, not a code bug. The email-based filtering logic is working correctly - it's simply finding no matching records for most users. Adding the missing student and instructor records will resolve the issue for all affected users.

**Impact:** Once missing records are added, 11 users will be able to see their data in the portals.
