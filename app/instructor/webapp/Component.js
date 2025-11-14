sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/odata/v4/ODataModel",
    "shared/auth/auth-service"
], function(UIComponent, ODataModel, AuthService) {
    "use strict";

    return UIComponent.extend("instructor.Component", {
        metadata: {
            manifest: "json"
        },

        init: async function() {
            UIComponent.prototype.init.apply(this, arguments);
            
            try {
                // Initialize Auth0
                await AuthService.init();
                
                // Check if user is authenticated
                const isAuthenticated = await AuthService.isAuthenticated();
                if (!isAuthenticated) {
                    window.location.href = "/launchpad.html";
                    return;
                }
                
                // Get user info
                const user = await AuthService.getUser();
                console.log("Authenticated user:", user);
                
                // Verify user has instructor role
                const userRole = user['custom:role'] || 'student';
                if (userRole !== 'instructor' && userRole !== 'admin') {
                    sap.m.MessageBox.error("Access denied. Instructor role required.", {
                        onClose: function() {
                            window.location.href = "/launchpad.html";
                        }
                    });
                    return;
                }
                
                // Set up authenticated model
                this._setupModelWithAuth();
                
            } catch (error) {
                console.error("Authentication failed:", error);
                window.location.href = "/launchpad.html";
            }
        },
        
        _setupModelWithAuth: async function() {
            try {
                const token = await AuthService.getToken();
                
                var oModel = new ODataModel({
                    serviceUrl: "/instructor/",
                    synchronizationMode: "None",
                    operationMode: "Server"
                });
                
                oModel.attachBeforeRequestSent(function(oEvent) {
                    oEvent.getParameter("request").headers["Authorization"] = "Bearer " + token;
                });
                
                this.setModel(oModel);
                
            } catch (error) {
                console.error("Failed to setup authenticated model:", error);
            }
        }
    });
});
