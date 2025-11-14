sap.ui.define([
    "sap/ui/core/ComponentContainer",
    "sap/m/MessageBox"
], function(ComponentContainer, MessageBox) {
    "use strict";

    async function initApp() {
        try {
            // Initialize Auth0
            await window.AuthService.init();
            
            // Check authentication
            const isAuthenticated = await window.AuthService.isAuthenticated();
            
            if (!isAuthenticated) {
                // Show Auth0 login UI
                showAuthUI();
                return;
            }
            
            // User is authenticated, load the UI5 app
            new ComponentContainer({
                name: "student",
                async: true,
                settings: {
                    id: "student"
                }
            }).placeAt("content");
            
        } catch (error) {
            console.error("App initialization failed:", error);
            showErrorUI(error);
        }
    }
    
    function showAuthUI() {
        const user = window.AuthService.getUser();
        sap.ui.require(["sap/m/Page", "sap/m/Button", "sap/m/Text", "sap/m/VBox", "sap/m/App"], 
        function(Page, Button, Text, VBox, App) {
            const loginPage = new Page({
                title: "Student Portal - Authentication",
                content: [
                    new VBox({
                        alignItems: "Center",
                        justifyContent: "Center",
                        class: "sapUiLargeMargin",
                        items: [
                            new Text({
                                text: "Please authenticate to access the Student Portal",
                                class: "sapUiMediumMarginBottom"
                            }),
                            new Button({
                                text: "Login with Auth0",
                                type: "Emphasized",
                                press: function() {
                                    window.AuthService.login();
                                }
                            })
                        ]
                    })
                ]
            });
            
            new App({
                pages: [loginPage]
            }).placeAt("content");
        });
    }
    
    function showErrorUI(error) {
        sap.ui.require(["sap/m/Page", "sap/m/Text", "sap.m.App"], 
        function(Page, Text, App) {
            const errorPage = new Page({
                title: "Error",
                content: [
                    new Text({
                        text: "Error loading application: " + error.message
                    })
                ]
            });
            
            new App({
                pages: [errorPage]
            }).placeAt("content");
        });
    }
    
    // Start the app
    initApp();
});
