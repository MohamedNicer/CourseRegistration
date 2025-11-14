sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/odata/v4/ODataModel"
], function(UIComponent, JSONModel, ODataModel) {
    "use strict";

    return UIComponent.extend("student.Component", {
        metadata: {
            manifest: "json"
        },

        init: function() {
            UIComponent.prototype.init.apply(this, arguments);
            
            console.log("Student Component initialized with Auth0");
            
            // Main model for reading data (student service)
            var oModel = new ODataModel({
                serviceUrl: "/student/",
                synchronizationMode: "None",
                operationMode: "Server"
            });
            this.setModel(oModel);
            
            // Admin model for write operations
            var oAdminModel = new ODataModel({
                serviceUrl: "/admin/",
                synchronizationMode: "None",
                operationMode: "Server"
            });
            this.setModel(oAdminModel, "admin");
        }
    });
});
