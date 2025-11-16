/**
 * Email Synchronization Utility
 * 
 * This script updates student and instructor email addresses in the database
 * to match Auth0 user emails. It validates all changes before applying them
 * and creates a backup before modification.
 * 
 * Usage:
 *   node srv/utils/sync-emails.js --mapping=email-mapping.json
 *   node srv/utils/sync-emails.js --student="old@email.com:new@email.com"
 *   node srv/utils/sync-emails.js --instructor="old@email.com:new@email.com"
 *   node srv/utils/sync-emails.js --dry-run --mapping=email-mapping.json
 * 
 * Mapping file format (JSON):
 * {
 *   "students": {
 *     "old.email@example.com": "new.email@example.com"
 *   },
 *   "instructors": {
 *     "old.email@example.com": "new.email@example.com"
 *   }
 * }
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Database path
const DB_PATH = path.join(__dirname, '../../db.sqlite');
const BACKUP_DIR = path.join(__dirname, '../../backups');

/**
 * Parse command line arguments
 */
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    mapping: null,
    studentMappings: [],
    instructorMappings: [],
    dryRun: false,
    help: false
  };

  args.forEach(arg => {
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg.startsWith('--mapping=')) {
      options.mapping = arg.split('=')[1];
    } else if (arg.startsWith('--student=')) {
      const mapping = arg.split('=')[1];
      options.studentMappings.push(mapping);
    } else if (arg.startsWith('--instructor=')) {
      const mapping = arg.split('=')[1];
      options.instructorMappings.push(mapping);
    }
  });

  return options;
}

/**
 * Display help message
 */
function displayHelp() {
  console.log(`
Email Synchronization Utility
==============================

Usage:
  node srv/utils/sync-emails.js [options]

Options:
  --mapping=FILE          Path to JSON file containing email mappings
  --student=OLD:NEW       Update a single student email (can be used multiple times)
  --instructor=OLD:NEW    Update a single instructor email (can be used multiple times)
  --dry-run               Preview changes without applying them
  --help, -h              Display this help message

Examples:
  # Update from mapping file
  node srv/utils/sync-emails.js --mapping=email-mapping.json

  # Update single student email
  node srv/utils/sync-emails.js --student="old@email.com:new@email.com"

  # Update multiple emails
  node srv/utils/sync-emails.js --student="old1@email.com:new1@email.com" --instructor="old2@email.com:new2@email.com"

  # Preview changes without applying
  node srv/utils/sync-emails.js --dry-run --mapping=email-mapping.json

Mapping File Format (JSON):
{
  "students": {
    "old.email@example.com": "new.email@example.com"
  },
  "instructors": {
    "old.email@example.com": "new.email@example.com"
  }
}
`);
}

/**
 * Load email mappings from file
 */
function loadMappingFile(filePath) {
  try {
    const fullPath = path.resolve(filePath);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`Mapping file not found: ${fullPath}`);
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const mappings = JSON.parse(content);

    if (!mappings.students && !mappings.instructors) {
      throw new Error('Mapping file must contain "students" or "instructors" keys');
    }

    return {
      students: mappings.students || {},
      instructors: mappings.instructors || {}
    };
  } catch (error) {
    throw new Error(`Failed to load mapping file: ${error.message}`);
  }
}

/**
 * Parse inline mapping (format: "old@email.com:new@email.com")
 */
function parseInlineMapping(mappingStr) {
  const parts = mappingStr.split(':');
  if (parts.length !== 2) {
    throw new Error(`Invalid mapping format: ${mappingStr}. Expected format: "old@email.com:new@email.com"`);
  }
  return { oldEmail: parts[0].trim(), newEmail: parts[1].trim() };
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate all email mappings
 */
function validateMappings(mappings) {
  const errors = [];

  // Validate student emails
  Object.entries(mappings.students).forEach(([oldEmail, newEmail]) => {
    if (!isValidEmail(oldEmail)) {
      errors.push(`Invalid old student email: ${oldEmail}`);
    }
    if (!isValidEmail(newEmail)) {
      errors.push(`Invalid new student email: ${newEmail}`);
    }
  });

  // Validate instructor emails
  Object.entries(mappings.instructors).forEach(([oldEmail, newEmail]) => {
    if (!isValidEmail(oldEmail)) {
      errors.push(`Invalid old instructor email: ${oldEmail}`);
    }
    if (!isValidEmail(newEmail)) {
      errors.push(`Invalid new instructor email: ${newEmail}`);
    }
  });

  return errors;
}

/**
 * Create database backup
 */
function createBackup() {
  return new Promise((resolve, reject) => {
    try {
      // Create backup directory if it doesn't exist
      if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
      }

      // Generate backup filename with timestamp
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(BACKUP_DIR, `db-backup-${timestamp}.sqlite`);

      // Copy database file
      fs.copyFileSync(DB_PATH, backupPath);

      console.log(`✅ Database backup created: ${backupPath}`);
      resolve(backupPath);
    } catch (error) {
      reject(new Error(`Failed to create backup: ${error.message}`));
    }
  });
}

/**
 * Get student by email
 */
function getStudentByEmail(db, email) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT ID, studentNumber, email, firstName, lastName FROM com_sap_capire_courseregistration_Students WHERE LOWER(email) = LOWER(?)',
      [email],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

/**
 * Get instructor by email
 */
function getInstructorByEmail(db, email) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT ID, instructorId, email, firstName, lastName FROM com_sap_capire_courseregistration_Instructors WHERE LOWER(email) = LOWER(?)',
      [email],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

/**
 * Check if email already exists
 */
function checkEmailExists(db, email, entityType) {
  return new Promise((resolve, reject) => {
    const table = entityType === 'student' 
      ? 'com_sap_capire_courseregistration_Students'
      : 'com_sap_capire_courseregistration_Instructors';
    
    db.get(
      `SELECT ID, email FROM ${table} WHERE LOWER(email) = LOWER(?)`,
      [email],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

/**
 * Update student email
 */
function updateStudentEmail(db, oldEmail, newEmail) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE com_sap_capire_courseregistration_Students SET email = ? WHERE LOWER(email) = LOWER(?)',
      [newEmail, oldEmail],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

/**
 * Update instructor email
 */
function updateInstructorEmail(db, oldEmail, newEmail) {
  return new Promise((resolve, reject) => {
    db.run(
      'UPDATE com_sap_capire_courseregistration_Instructors SET email = ? WHERE LOWER(email) = LOWER(?)',
      [newEmail, oldEmail],
      function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      }
    );
  });
}

/**
 * Process email mappings and apply updates
 */
async function processMappings(db, mappings, dryRun) {
  const results = {
    students: { updated: 0, skipped: 0, errors: [] },
    instructors: { updated: 0, skipped: 0, errors: [] }
  };

  console.log(`\n${'='.repeat(80)}`);
  console.log(dryRun ? 'DRY RUN - PREVIEW CHANGES' : 'APPLYING EMAIL UPDATES');
  console.log('='.repeat(80));

  // Process student email updates
  if (Object.keys(mappings.students).length > 0) {
    console.log('\nSTUDENT EMAIL UPDATES:');
    console.log('-'.repeat(80));

    for (const [oldEmail, newEmail] of Object.entries(mappings.students)) {
      try {
        // Check if old email exists
        const student = await getStudentByEmail(db, oldEmail);
        if (!student) {
          const error = `Student not found with email: ${oldEmail}`;
          console.log(`  ❌ ${error}`);
          results.students.errors.push(error);
          results.students.skipped++;
          continue;
        }

        // Check if new email already exists (and it's not the same record)
        const existingStudent = await checkEmailExists(db, newEmail, 'student');
        if (existingStudent && existingStudent.ID !== student.ID) {
          const error = `New email already exists for another student: ${newEmail}`;
          console.log(`  ❌ ${error}`);
          results.students.errors.push(error);
          results.students.skipped++;
          continue;
        }

        // Display change
        console.log(`  ${student.firstName} ${student.lastName} (ID: ${student.ID})`);
        console.log(`    Old: ${student.email}`);
        console.log(`    New: ${newEmail}`);

        if (!dryRun) {
          const changes = await updateStudentEmail(db, oldEmail, newEmail);
          if (changes > 0) {
            console.log(`    ✅ Updated successfully`);
            results.students.updated++;
          } else {
            console.log(`    ⚠️  No changes made`);
            results.students.skipped++;
          }
        } else {
          console.log(`    ℹ️  Would be updated (dry run)`);
          results.students.updated++;
        }
        console.log();
      } catch (error) {
        const errorMsg = `Error updating ${oldEmail}: ${error.message}`;
        console.log(`  ❌ ${errorMsg}`);
        results.students.errors.push(errorMsg);
        results.students.skipped++;
      }
    }
  }

  // Process instructor email updates
  if (Object.keys(mappings.instructors).length > 0) {
    console.log('\nINSTRUCTOR EMAIL UPDATES:');
    console.log('-'.repeat(80));

    for (const [oldEmail, newEmail] of Object.entries(mappings.instructors)) {
      try {
        // Check if old email exists
        const instructor = await getInstructorByEmail(db, oldEmail);
        if (!instructor) {
          const error = `Instructor not found with email: ${oldEmail}`;
          console.log(`  ❌ ${error}`);
          results.instructors.errors.push(error);
          results.instructors.skipped++;
          continue;
        }

        // Check if new email already exists (and it's not the same record)
        const existingInstructor = await checkEmailExists(db, newEmail, 'instructor');
        if (existingInstructor && existingInstructor.ID !== instructor.ID) {
          const error = `New email already exists for another instructor: ${newEmail}`;
          console.log(`  ❌ ${error}`);
          results.instructors.errors.push(error);
          results.instructors.skipped++;
          continue;
        }

        // Display change
        console.log(`  ${instructor.firstName} ${instructor.lastName} (ID: ${instructor.ID})`);
        console.log(`    Old: ${instructor.email}`);
        console.log(`    New: ${newEmail}`);

        if (!dryRun) {
          const changes = await updateInstructorEmail(db, oldEmail, newEmail);
          if (changes > 0) {
            console.log(`    ✅ Updated successfully`);
            results.instructors.updated++;
          } else {
            console.log(`    ⚠️  No changes made`);
            results.instructors.skipped++;
          }
        } else {
          console.log(`    ℹ️  Would be updated (dry run)`);
          results.instructors.updated++;
        }
        console.log();
      } catch (error) {
        const errorMsg = `Error updating ${oldEmail}: ${error.message}`;
        console.log(`  ❌ ${errorMsg}`);
        results.instructors.errors.push(errorMsg);
        results.instructors.skipped++;
      }
    }
  }

  return results;
}

/**
 * Display summary
 */
function displaySummary(results, dryRun) {
  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log('='.repeat(80));

  const totalUpdated = results.students.updated + results.instructors.updated;
  const totalSkipped = results.students.skipped + results.instructors.skipped;
  const totalErrors = results.students.errors.length + results.instructors.errors.length;

  console.log(`\nStudents:`);
  console.log(`  ${dryRun ? 'Would update' : 'Updated'}: ${results.students.updated}`);
  console.log(`  Skipped: ${results.students.skipped}`);
  console.log(`  Errors: ${results.students.errors.length}`);

  console.log(`\nInstructors:`);
  console.log(`  ${dryRun ? 'Would update' : 'Updated'}: ${results.instructors.updated}`);
  console.log(`  Skipped: ${results.instructors.skipped}`);
  console.log(`  Errors: ${results.instructors.errors.length}`);

  console.log(`\nTotal:`);
  console.log(`  ${dryRun ? 'Would update' : 'Updated'}: ${totalUpdated}`);
  console.log(`  Skipped: ${totalSkipped}`);
  console.log(`  Errors: ${totalErrors}`);

  if (totalErrors > 0) {
    console.log(`\nErrors encountered:`);
    results.students.errors.forEach(err => console.log(`  - ${err}`));
    results.instructors.errors.forEach(err => console.log(`  - ${err}`));
  }

  if (dryRun && totalUpdated > 0) {
    console.log(`\n⚠️  This was a dry run. No changes were applied.`);
    console.log(`   Run without --dry-run to apply these changes.`);
  } else if (!dryRun && totalUpdated > 0) {
    console.log(`\n✅ Email synchronization completed successfully!`);
  } else if (totalUpdated === 0) {
    console.log(`\n⚠️  No emails were updated.`);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(80));
  console.log('EMAIL SYNCHRONIZATION UTILITY');
  console.log('='.repeat(80));
  console.log(`\nDatabase: ${DB_PATH}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Parse arguments
  const options = parseArguments();

  if (options.help) {
    displayHelp();
    process.exit(0);
  }

  // Build mappings object
  const mappings = {
    students: {},
    instructors: {}
  };

  // Load from mapping file if provided
  if (options.mapping) {
    const fileMappings = loadMappingFile(options.mapping);
    Object.assign(mappings.students, fileMappings.students);
    Object.assign(mappings.instructors, fileMappings.instructors);
  }

  // Add inline student mappings
  options.studentMappings.forEach(mappingStr => {
    const { oldEmail, newEmail } = parseInlineMapping(mappingStr);
    mappings.students[oldEmail] = newEmail;
  });

  // Add inline instructor mappings
  options.instructorMappings.forEach(mappingStr => {
    const { oldEmail, newEmail } = parseInlineMapping(mappingStr);
    mappings.instructors[oldEmail] = newEmail;
  });

  // Check if any mappings were provided
  if (Object.keys(mappings.students).length === 0 && Object.keys(mappings.instructors).length === 0) {
    console.error('\n❌ Error: No email mappings provided.');
    console.error('   Use --mapping, --student, or --instructor options.');
    console.error('   Run with --help for usage information.\n');
    process.exit(1);
  }

  // Validate mappings
  console.log('\nValidating email mappings...');
  const validationErrors = validateMappings(mappings);
  if (validationErrors.length > 0) {
    console.error('\n❌ Validation errors:');
    validationErrors.forEach(err => console.error(`   - ${err}`));
    console.error('');
    process.exit(1);
  }
  console.log('✅ All email mappings are valid');

  // Display what will be updated
  console.log(`\nPlanned updates:`);
  console.log(`  Students: ${Object.keys(mappings.students).length}`);
  console.log(`  Instructors: ${Object.keys(mappings.instructors).length}`);

  if (options.dryRun) {
    console.log(`\n⚠️  DRY RUN MODE - No changes will be applied`);
  }

  // Check if database exists
  if (!fs.existsSync(DB_PATH)) {
    console.error(`\n❌ Error: Database not found at ${DB_PATH}`);
    process.exit(1);
  }

  // Create backup (unless dry run)
  if (!options.dryRun) {
    console.log('\nCreating database backup...');
    await createBackup();
  }

  // Open database connection
  const db = new sqlite3.Database(DB_PATH, sqlite3.OPEN_READWRITE, (err) => {
    if (err) {
      console.error('\n❌ Error opening database:', err.message);
      process.exit(1);
    }
  });

  try {
    // Process mappings
    const results = await processMappings(db, mappings, options.dryRun);

    // Display summary
    displaySummary(results, options.dryRun);

    console.log('\n' + '='.repeat(80));
    console.log('SYNCHRONIZATION COMPLETE');
    console.log('='.repeat(80) + '\n');

    // Exit with error code if there were errors
    const totalErrors = results.students.errors.length + results.instructors.errors.length;
    process.exit(totalErrors > 0 ? 1 : 0);

  } catch (error) {
    console.error('\n❌ Fatal error during synchronization:', error.message);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run the utility
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = {
  loadMappingFile,
  validateMappings,
  isValidEmail,
  parseInlineMapping
};
