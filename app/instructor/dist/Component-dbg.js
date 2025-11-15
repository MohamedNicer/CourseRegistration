sap.ui.define([
    "sap/ui/core/UIComponent",
    "shared/auth/auth-service"
], function (UIComponent, AuthService) {
    "use strict";

    /**
     * @namespace instructor
     */
    return UIComponent.extend("instructor.Component", {
        metadata: {
            manifest: "json"
        },

        init: function () {
            // Call parent init
            UIComponent.prototype.init.apply(this, arguments);
            
            console.log("Instructor Component initialized - Using JSON models with fetch");
            
            // Initialize Auth0
            this._initializeAuth();
        },

        _initializeAuth: async function () {
            try {
                // Check if AuthService is available
                if (typeof window.AuthService === 'undefined') {
                    console.warn('AuthService not available');
                    return;
                }

                await window.AuthService.init();
                
                const isAuthenticated = await window.AuthService.isAuthenticated();
                if (!isAuthenticated) {
                    console.log("User not authenticated, redirecting to login...");
                    await window.AuthService.login();
                    return;
                }
                
                const user = await window.AuthService.getUser();
                console.log("User authenticated:", user.email);
                
                // Get token for API requests (stored in AuthService)
                const token = await window.AuthService.getToken();
                console.log("Got Auth0 token for API requests");
                
            } catch (error) {
                console.error("Auth initialization failed:", error);
            }
        }
    });
});
