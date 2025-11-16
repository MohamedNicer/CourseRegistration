const cds = require('@sap/cds');
const express = require('express');
const path = require('path');

// Custom server bootstrap with Auth0 middleware
module.exports = cds.server;

cds.on('bootstrap', (app) => {
    console.log('[SERVER] Custom bootstrap - Loading Auth0 middleware');
    
    // Redirect root URL to launchpad
    app.get('/', (req, res) => {
        console.log('[SERVER] Redirecting root to launchpad');
        res.redirect('/launchpad.html');
    });
    
    // Serve launchpad.html from root
    app.get('/launchpad.html', (req, res) => {
        res.sendFile(path.join(__dirname, '..', 'launchpad.html'));
    });
    
    // Serve static files from app directory
    app.use('/app', express.static(path.join(__dirname, '..', 'app')));
    console.log('[SERVER] Serving static files from /app');
    
});

// Use CDS 'before' hook to ensure auth runs before service handlers
cds.on('served', () => {
    const { 'student': studentService, 'instructor': instructorService, 'admin': adminService } = cds.services;
    
    // Apply auth middleware to all services
    [studentService, instructorService, adminService].forEach(service => {
        if (service) {
            service.before('*', '*', (req) => {
                const authHeader = req.headers.authorization;
                
                console.log('[AUTH] Request to:', req.event, req.target?.name);
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
                        
                        console.log('[AUTH] JWT payload email:', payload.email, 'role:', payload['custom:role'] || payload.role);
                        
                        // Store user info in req.authUser (this persists through the request)
                        req.authUser = {
                            id: payload.sub,
                            email: payload.email,
                            name: payload.name,
                            'custom:role': payload['custom:role'] || payload.role || 'student',
                            role: payload['custom:role'] || payload.role || 'student'
                        };
                        
                        console.log('[AUTH] User authenticated:', req.authUser.email, 'Role:', req.authUser.role);
                        
                    } catch (error) {
                        console.error('[AUTH] Error decoding token:', error.message);
                    }
                } else {
                    console.log('[AUTH] No token provided');
                }
            });
        }
    });
    
    console.log('[AUTH] Auth middleware registered for all services');
});
