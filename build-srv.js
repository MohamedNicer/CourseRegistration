const { execSync } = require('child_process');
const path = require('path');

console.log('Building TypeScript services...\n');

try {
    // Use npx to run TypeScript compiler
    const tscPath = path.join(__dirname, 'node_modules', '.bin', 'tsc');
    const tsConfigPath = path.join(__dirname, 'srv', 'tsconfig.json');
    
    console.log('Compiling srv/*.ts files...');
    execSync(`npx tsc --project srv/tsconfig.json`, { 
        stdio: 'inherit',
        cwd: __dirname
    });
    
    console.log('\n✓ TypeScript services compiled successfully!');
    console.log('\nGenerated files:');
    console.log('  - srv/student-service.js');
    console.log('  - srv/instructor-service.js');
    console.log('  - srv/admin-service.js');
    console.log('\nYou can now run: cds watch');
    
} catch (error) {
    console.error('\n❌ Error compiling TypeScript:', error.message);
    console.log('\nTrying alternative method...');
    
    try {
        // Alternative: use tsx to run TypeScript directly
        console.log('Using tsx to compile...');
        execSync(`npx tsx --tsconfig srv/tsconfig.json srv/student-service.ts`, { stdio: 'inherit' });
        console.log('✓ Compiled student-service.ts');
        
        execSync(`npx tsx --tsconfig srv/tsconfig.json srv/instructor-service.ts`, { stdio: 'inherit' });
        console.log('✓ Compiled instructor-service.ts');
        
        execSync(`npx tsx --tsconfig srv/tsconfig.json srv/admin-service.ts`, { stdio: 'inherit' });
        console.log('✓ Compiled admin-service.ts');
        
    } catch (altError) {
        console.error('\n❌ Alternative method also failed:', altError.message);
        console.log('\nPlease install TypeScript globally:');
        console.log('  npm install -g typescript');
        console.log('\nOr run:');
        console.log('  npx tsc --project srv/tsconfig.json');
        process.exit(1);
    }
}
