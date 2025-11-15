const { execSync } = require('child_process');
const path = require('path');

console.log('Building TypeScript frontend applications...\n');

const apps = ['student', 'admin', 'instructor'];

for (const app of apps) {
    try {
        console.log(`Building ${app} app...`);
        const appPath = path.join(__dirname, 'app', app);
        
        // Build the app
        execSync('npm run build', { 
            stdio: 'inherit',
            cwd: appPath
        });
        
        console.log(`✓ ${app} app built successfully\n`);
        
    } catch (error) {
        console.error(`❌ Error building ${app} app:`, error.message);
    }
}

console.log('\n✓ All frontend apps built!');

// Run post-build fix for SAPUI5 compatibility
console.log('\nApplying SAPUI5 compatibility fixes...');
try {
    execSync('node fix-component-exports.js', { stdio: 'inherit' });
} catch (error) {
    console.error('❌ Error applying fixes:', error.message);
}
