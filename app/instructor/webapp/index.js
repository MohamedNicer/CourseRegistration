sap.ui.define([
    "sap/ui/core/ComponentContainer"
], function(ComponentContainer) {
    "use strict";

    // Initialize authentication and app
    async function initApp() {
        try {
            // Initialize Auth0
            await window.AuthService.init();
            
            // Check authentication
            const isAuthenticated = await window.AuthService.isAuthenticated();
            
            if (!isAuthenticated) {
                // Show login required message
                document.body.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: Arial;">
                        <h2>Authentication Required</h2>
                        <p>Please log in to access the Instructor Portal</p>
                        <button onclick="window.AuthService.login()" style="padding: 10px 20px; background: #0078d4; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Login
                        </button>
                        <br>
                        <a href="/launchpad.html">Return to Launchpad</a>
                    </div>
                `;
                return;
            }
            
            // User is authenticated, load the app
            new ComponentContainer({
                name: "instructor",
                async: true
            }).placeAt("content");
            
        } catch (error) {
            console.error("App initialization failed:", error);
            document.body.innerHTML = `
                <div style="text-align: center; margin-top: 50px; font-family: Arial;">
                    <h2>Error Loading Application</h2>
                    <p>Please try refreshing the page or <a href="/launchpad.html">return to launchpad</a></p>
                </div>
            `;
        }
    }
    
    initApp();
});
