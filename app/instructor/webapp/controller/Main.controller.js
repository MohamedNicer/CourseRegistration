sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function(Controller, Fragment, MessageToast, MessageBox, JSONModel) {
    "use strict";

    return Controller.extend("instructor.controller.Main", {
        
        onInit: function() {
            // Initialize model for grade assignment
            var oGradeModel = new JSONModel({
                enrollmentId: "",
                studentName: "",
                courseName: "",
                grade: null,
                status: "ENROLLED"
            });
            this.getView().setModel(oGradeModel, "gradeModel");
        },
        
        onNavBack: function() {
            window.location.href = "../../launchpad.html";
        },
        
        onTabSelect: function(oEvent) {
            var sKey = oEvent.getParameter("key");
        },
        
        onGrade: function(oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext();
            var oEnrollment = oContext.getObject();
            var oView = this.getView();
            var that = this;
            
            // Set grade model data - store the actual ID
            this.getView().getModel("gradeModel").setData({
                enrollmentId: oEnrollment.ID,
                studentName: oEnrollment.studentFirstName + " " + oEnrollment.studentLastName,
                courseName: oEnrollment.courseCode + " - " + oEnrollment.courseName,
                grade: oEnrollment.grade || null,
                status: oEnrollment.status
            });
            
            // Load or open dialog
            if (!this._gradeDialog) {
                Fragment.load({
                    id: oView.getId(),
                    name: "instructor.view.fragments.AssignGrade",
                    controller: this
                }).then(function(oDialog) {
                    that._gradeDialog = oDialog;
                    oView.addDependent(oDialog);
                    oDialog.open();
                });
            } else {
                this._gradeDialog.open();
            }
        },
        
        onSaveGrade: function() {
            var oGradeData = this.getView().getModel("gradeModel").getData();
            var that = this;
            
            // Validate grade
            var fGrade = parseFloat(oGradeData.grade);
            if (isNaN(fGrade) || fGrade < 0 || fGrade > 20) {
                MessageBox.error("Please enter a valid grade between 0 and 20.");
                return;
            }
            
            // Use fetch to directly PATCH the enrollment
            var sEnrollmentId = oGradeData.enrollmentId;
            
            fetch("/admin/Enrollments(" + sEnrollmentId + ")", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    grade: fGrade,
                    status: oGradeData.status
                })
            })
            .then(function(response) {
                if (!response.ok) {
                    throw new Error("Failed to update enrollment");
                }
                return response.json();
            })
            .then(function() {
                MessageToast.show("Grade assigned successfully!");
                that._gradeDialog.close();
                
                // Refresh the enrollments table
                that.getView().byId("enrollmentTable").getBinding("items").refresh();
            })
            .catch(function(error) {
                MessageBox.error("Failed to assign grade: " + error.message);
            });
        },
        
        onCancelGrade: function() {
            this._gradeDialog.close();
        }
    });
});
