const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./db.sqlite');

console.log('Checking database tables...\n');

// Get all tables
db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
    if (err) {
        console.error('Error reading database:', err);
        db.close();
        return;
    }
    
    console.log('Available tables:');
    console.table(tables);
    
    if (tables.length === 0) {
        console.log('\n⚠️  Database is empty! You need to deploy the schema first.');
        console.log('\nRun: cds deploy --to sqlite:db.sqlite');
        db.close();
        return;
    }
    
    // Check each table's structure and data
    let completed = 0;
    tables.forEach(table => {
        const tableName = table.name;
        
        // Get table structure
        db.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
            if (err) {
                console.error(`Error reading ${tableName}:`, err);
            } else {
                console.log(`\n=== ${tableName} Structure ===`);
                console.table(columns);
            }
            
            // Get table data
            db.all(`SELECT * FROM ${tableName} LIMIT 5`, (err, rows) => {
                if (err) {
                    console.error(`Error reading ${tableName} data:`, err);
                } else {
                    console.log(`\n=== ${tableName} Data (first 5 rows) ===`);
                    if (rows.length > 0) {
                        console.table(rows);
                    } else {
                        console.log('(empty)');
                    }
                }
                
                completed++;
                if (completed === tables.length) {
                    db.close();
                }
            });
        });
    });
});
