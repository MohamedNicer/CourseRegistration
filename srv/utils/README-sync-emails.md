# Email Synchronization Utility

This utility safely updates student and instructor email addresses in the database to match Auth0 user emails.

## Features

- ✅ Validates all email addresses before applying changes
- ✅ Creates automatic database backup before modifications
- ✅ Supports batch updates via JSON mapping file
- ✅ Supports individual email updates via command line
- ✅ Dry-run mode to preview changes without applying them
- ✅ Case-insensitive email matching
- ✅ Prevents duplicate email conflicts
- ✅ Detailed logging and error reporting

## Usage

### Basic Usage

```bash
# Update emails from a mapping file
node srv/utils/sync-emails.js --mapping=email-mapping.json

# Preview changes without applying (dry run)
node srv/utils/sync-emails.js --dry-run --mapping=email-mapping.json

# Update a single student email
node srv/utils/sync-emails.js --student="old@email.com:new@email.com"

# Update a single instructor email
node srv/utils/sync-emails.js --instructor="old@email.com:new@email.com"

# Update multiple emails at once
node srv/utils/sync-emails.js \
  --student="alice.OLD@university.edu:alice.test@university.edu" \
  --student="bob.OLD@university.edu:bob.test@university.edu" \
  --instructor="john.OLD@university.edu:john.instructor@university.edu"

# Display help
node srv/utils/sync-emails.js --help
```

## Mapping File Format

Create a JSON file with the following structure:

```json
{
  "students": {
    "old.email@example.com": "new.email@example.com",
    "another.old@example.com": "another.new@example.com"
  },
  "instructors": {
    "old.instructor@example.com": "new.instructor@example.com"
  }
}
```

See `email-mapping-example.json` for a complete example.

## Workflow

### Step 1: Identify Email Mismatches

First, run the diagnostic script to identify which emails need to be updated:

```bash
node srv/diagnostics/check-user-emails.js
```

This will show you:
- Emails that exist in Auth0 but not in the database
- Emails that exist in the database but not in Auth0
- Case/format mismatches between Auth0 and database

### Step 2: Create Mapping File

Based on the diagnostic results, create a mapping file (e.g., `email-fixes.json`):

```json
{
  "students": {
    "Alice.Test@university.edu": "alice.test@university.edu",
    "BOB.TEST@university.edu": "bob.test@university.edu"
  },
  "instructors": {
    "John.Instructor@university.edu": "john.instructor@university.edu"
  }
}
```

### Step 3: Preview Changes (Dry Run)

Always preview changes first to ensure they're correct:

```bash
node srv/utils/sync-emails.js --dry-run --mapping=email-fixes.json
```

Review the output carefully:
- Check that the correct records are being updated
- Verify the old and new email addresses
- Ensure no errors are reported

### Step 4: Apply Changes

If the dry run looks good, apply the changes:

```bash
node srv/utils/sync-emails.js --mapping=email-fixes.json
```

The script will:
1. Validate all email addresses
2. Create a database backup in the `backups/` directory
3. Update the email addresses
4. Display a summary of changes

### Step 5: Verify Changes

After applying changes, verify that the portals now work correctly:

1. Run the diagnostic script again to confirm all emails match:
   ```bash
   node srv/diagnostics/check-user-emails.js
   ```

2. Test the portals:
   - Log in as a student and verify data is visible
   - Log in as an instructor and verify data is visible
   - Check server logs for any remaining issues

## Safety Features

### Automatic Backups

Before making any changes, the script automatically creates a backup of the database in the `backups/` directory with a timestamp:

```
backups/db-backup-2025-11-15T23-45-10-123Z.sqlite
```

To restore from a backup if needed:

```bash
# Stop the server first
# Then copy the backup over the current database
copy backups\db-backup-TIMESTAMP.sqlite db.sqlite
```

### Validation Checks

The script performs several validation checks:

1. **Email Format**: Ensures all emails are valid (contains @, proper format)
2. **Record Existence**: Verifies the old email exists in the database
3. **Duplicate Prevention**: Prevents creating duplicate email addresses
4. **Case-Insensitive Matching**: Finds records regardless of email case

### Error Handling

If any errors occur:
- The script will continue processing other emails
- All errors are logged and summarized at the end
- The script exits with error code 1 if any errors occurred
- Database changes are only committed if successful

## Examples

### Example 1: Fix Case Mismatches

If the diagnostic shows case mismatches:

```
Auth0:    alice.test@university.edu
Database: Alice.Test@university.edu
```

Create mapping:
```json
{
  "students": {
    "Alice.Test@university.edu": "alice.test@university.edu"
  }
}
```

Apply:
```bash
node srv/utils/sync-emails.js --mapping=case-fixes.json
```

### Example 2: Quick Single Update

For a single email fix:

```bash
node srv/utils/sync-emails.js --student="Wrong.Email@university.edu:correct.email@university.edu"
```

### Example 3: Batch Update with Preview

For multiple updates with preview:

```bash
# First, preview
node srv/utils/sync-emails.js --dry-run --mapping=batch-updates.json

# If looks good, apply
node srv/utils/sync-emails.js --mapping=batch-updates.json
```

## Troubleshooting

### "Student/Instructor not found with email"

This means the old email doesn't exist in the database. Possible causes:
- Typo in the old email address
- Record doesn't exist in the database
- Email is already correct

Solution: Run the diagnostic script to see actual database emails.

### "New email already exists for another student/instructor"

This means the new email is already assigned to a different record. Possible causes:
- Duplicate records in the database
- Trying to assign the same email to multiple users

Solution: Review the database records and resolve duplicates first.

### "Invalid email format"

The email address doesn't match the expected format (must contain @ and domain).

Solution: Check for typos in the mapping file.

## Best Practices

1. **Always run diagnostics first** to understand what needs to be fixed
2. **Always use dry-run mode** before applying changes
3. **Keep mapping files** for documentation and potential rollback
4. **Test after changes** by logging into the portals
5. **Verify backups exist** before making changes
6. **Update one type at a time** (students first, then instructors) for easier troubleshooting

## Related Scripts

- `srv/diagnostics/check-user-emails.js` - Identifies email mismatches
- `srv/utils/email-utils.js` - Email normalization utilities used by services

## Support

If you encounter issues:
1. Check the error messages in the script output
2. Review the database backup location
3. Run the diagnostic script to verify current state
4. Check server logs for authentication issues
