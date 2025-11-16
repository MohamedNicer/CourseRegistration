#!/usr/bin/env node

/**
 * BTP Startup Script
 * Ensures database is initialized with test data before starting the server
 * 
 * This script will:
 * 1. Initialize the database on first deployment (when db.sqlite doesn't exist)
 * 2. Reinitialize if FORCE_DB_INIT=true environment variable is set
 * 3. Skip initialization if database exists and FORCE_DB_INIT is not set
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('BTP Startup Script');
console.log('========================================');

// Check if database exists
const dbPath = path.join(__dirname, 'db.sqlite');
const dbExists = fs.existsSync(dbPath);

// Check for FORCE_DB_INIT environment variable
const forceInit = process.env.FORCE_DB_INIT === 'true';

// Check if this is a fresh deployment (no database and no marker file)
const markerPath = path.join(__dirname, '.db-initialized');
const isInitialized = fs.existsSync(markerPath);

console.log(`\nDatabase status: ${dbExists ? 'EXISTS' : 'NOT FOUND'}`);
console.log(`Force initialization: ${forceInit ? 'YES' : 'NO'}`);
console.log(`Initialization marker: ${isInitialized ? 'FOUND' : 'NOT FOUND'}`);

// Initialize database if:
// 1. Database doesn't exist (first deployment)
// 2. FORCE_DB_INIT is set to true
// 3. Database exists but initialization marker is missing (incomplete previous init)
const shouldInitialize = !dbExists || forceInit || (dbExists && !isInitialized);

if (shouldInitialize) {
    if (dbExists && forceInit) {
        console.log('\n⚠️  Force initialization requested. Deleting existing database...');
        try {
            fs.unlinkSync(dbPath);
            console.log('✓ Old database deleted');
        } catch (error) {
            console.error('✗ Failed to delete old database:', error.message);
        }
    }
    
    if (dbExists && !isInitialized) {
        console.log('\n⚠️  Database exists but initialization marker missing. Reinitializing...');
        try {
            fs.unlinkSync(dbPath);
            console.log('✓ Old incomplete database deleted');
        } catch (error) {
            console.error('✗ Failed to delete old database:', error.message);
        }
    }
    
    console.log('\n⚠️  Initializing database with test data...');
    console.log('   This includes:');
    console.log('   - Creating database schema');
    console.log('   - Loading sample data from CSV files');
    console.log('   - Setting up constraints and relationships');
    
    try {
        // Deploy database schema and load CSV data
        execSync('npx cds deploy --to sqlite:db.sqlite --no-save', {
            stdio: 'inherit',
            cwd: __dirname
        });
        
        // Create marker file to indicate successful initialization
        fs.writeFileSync(markerPath, new Date().toISOString());
        
        console.log('✓ Database initialized successfully');
        console.log('✓ Initialization marker created');
    } catch (error) {
        console.error('✗ Failed to initialize database:', error.message);
        console.log('   The database will be created automatically on first request.');
        console.log('   However, it may not contain sample data.');
    }
} else {
    console.log('✓ Database exists and is initialized, skipping initialization');
    console.log('   (Set FORCE_DB_INIT=true to force reinitialization)');
}

console.log('\n========================================');
console.log('Starting CDS Server...');
console.log('========================================\n');

// Start the CDS server
try {
    execSync('cds-serve', {
        stdio: 'inherit',
        cwd: __dirname
    });
} catch (error) {
    console.error('✗ Server failed to start:', error.message);
    process.exit(1);
}
