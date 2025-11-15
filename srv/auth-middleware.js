const cds = require('@sap/cds');

// Middleware to extract user info from Auth0 JWT token
cds.on('bootstrap', (app) => {
    app.use((req, res, next) => {
        // Extract Authorization header
        const authHeader = req.headers.authorization;
        
        console.log('[AUTH] Request to:', req.path);
        console.log('[AUTH] Authorization header:', authHeader ? 'Present' : 'Missing');
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            
            try {
                // Decode JWT token (without verification for development)
                const base64Url = token.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const jsonPayload = decodeURIComponent(Buffer.from(base64, 'base64').toString().split('').map(function(c) {
                    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                }).join(''));
                
                const payload = JSON.parse(jsonPayload);
                
                console.log('[AUTH] JWT payload:', payload);
                
                // Create CDS user object
                const user = new cds.User({
                    id: payload.sub,
                    email: payload.email,
                    name: payload.name,
                    'custom:role': payload['custom:role'] || payload.role || 'student',
                    role: payload['custom:role'] || payload.role || 'student'
                });
                
                // Attach to request using CDS API
                req.user = user;
                
                console.log('[AUTH] User authenticated:', user.email, 'Role:', user.role);
                
            } catch (error) {
                console.error('[AUTH] Error decoding token:', error.message);
                console.error('[AUTH] Token:', token.substring(0, 50) + '...');
            }
        } else {
            // No token - development mode
            console.log('[AUTH] No token, using development mode');
        }
        
        next();
    });
});

module.exports = cds;
