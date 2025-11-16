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
                
                // Create user object with all necessary properties
                const userInfo = {
                    id: payload.sub,
                    email: payload.email,
                    name: payload.name,
                    'custom:role': payload['custom:role'] || payload.role || 'student',
                    role: payload['custom:role'] || payload.role || 'student'
                };
                
                // Attach user info to request in multiple ways for compatibility
                req.user = new cds.User(userInfo);
                req.authUser = userInfo;  // Also set authUser for service layer
                
                console.log('[AUTH] User authenticated:', userInfo.email, 'Role:', userInfo.role);
                
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
