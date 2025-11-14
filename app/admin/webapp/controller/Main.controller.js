sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function(Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("admin.controller.Main", {
        
        onInit: function() {
            console.log("Admin controller initialized");
        },

        onNavBack: function() {
            window.location.href = "../../launchpad.html";
        },

        onDeleteStudent: function(oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext();
            var oStudent = oContext.getObject();
            var that = this;
            
            if (!oStudent) return;

            MessageBox.confirm(
                "Are you sure you want to delete student " + oStudent.firstName + " " + oStudent.lastName + "?",
                {
                    title: "Confirm Deletion",
                    onClose: function(sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            that._deleteStudent(oStudent);
                        }
                    }
                }
            );
        },

        onDeleteInstructor: function(oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext();
            var oInstructor = oContext.getObject();
            var that = this;
            
            if (!oInstructor) return;

            MessageBox.confirm(
                "Are you sure you want to delete instructor " + oInstructor.firstName + " " + oInstructor.lastName + "?",
                {
                    title: "Confirm Deletion",
                    onClose: function(sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            that._deleteInstructor(oInstructor);
                        }
                    }
                }
            );
        },

        _deleteStudent: function(oStudent) {
            var oModel = this.getView().getModel();
            var sPath = "/Students(" + oStudent.ID + ")";
            var that = this;
            
            oModel.remove(sPath, {
                success: function() {
                    MessageToast.show("Student " + oStudent.firstName + " " + oStudent.lastName + " deleted successfully!");
                    
                    var oTable = that.getView().byId("studentTable");
                    if (oTable) {
                        oTable.getBinding("items").refresh();
                    }
                },
                error: function(oError) {
                    MessageBox.error("Failed to delete student: " + (oError.message || "Unknown error"));
                }
            });
        },

        _deleteInstructor: function(oInstructor) {
            var oModel = this.getView().getModel();
            var sPath = "/Instructors(" + oInstructor.ID + ")";
            var that = this;
            
            oModel.remove(sPath, {
                success: function() {
                    MessageToast.show("Instructor " + oInstructor.firstName + " " + oInstructor.lastName + " deleted successfully!");
                    
                    var oTable = that.getView().byId("instructorTable");
                    if (oTable) {
                        oTable.getBinding("items").refresh();
                    }
                },
                error: function(oError) {
                    MessageBox.error("Failed to delete instructor: " + (oError.message || "Unknown error"));
                }
            });
        }
    });
});
