sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function(Controller, MessageToast, MessageBox, JSONModel) {
    "use strict";

    return Controller.extend("student.controller.Main", {
        
        onInit: function() {
            this._studentId = "1";
            this._chartsInitialized = false;
            
            var oProfileModel = new JSONModel({
                ID: 1,
                studentNumber: "Loading...",
                firstName: "",
                lastName: "",
                email: "",
                departmentName: "Loading...",
                department_ID: null,
                faculty: "Loading...",
                ectsLimit: 60,
                ectsUsed: 0,
                ectsAvailable: 60
            });
            this.getView().setModel(oProfileModel, "profile");
            
            setTimeout(() => {
                this._loadStudentProfile();
            }, 500);
        },

        // Formatters
        formatEctsState: function(ectsAvailable) {
            var available = parseInt(ectsAvailable) || 0;
            if (available > 10) return "Success";
            if (available > 0) return "Warning";
            return "Error";
        },

        formatQuotaText: function(enrolled, quota) {
            var enrolledNum = parseInt(enrolled) || 0;
            var quotaNum = parseInt(quota) || 0;
            return enrolledNum + "/" + quotaNum;
        },

        formatQuotaStatus: function(enrolled, quota) {
            var enrolledNum = parseInt(enrolled) || 0;
            var quotaNum = parseInt(quota) || 0;
            return enrolledNum >= quotaNum ? "Full" : "Available";
        },

        formatQuotaState: function(enrolled, quota) {
            var enrolledNum = parseInt(enrolled) || 0;
            var quotaNum = parseInt(quota) || 0;
            return enrolledNum >= quotaNum ? "Error" : "Success";
        },

        formatEnrollEnabled: function(enrolled, quota) {
            var enrolledNum = parseInt(enrolled) || 0;
            var quotaNum = parseInt(quota) || 0;
            return enrolledNum < quotaNum;
        },

        formatStatusState: function(status) {
            switch(status) {
                case "ENROLLED": return "Information";
                case "COMPLETED": return "Success";
                default: return "Warning";
            }
        },

        onNavBack: function() {
            window.location.href = "../../launchpad.html";
        },

        onTabSelect: function(oEvent) {
            var sKey = oEvent.getParameter("key");
            if (sKey === "statistics" && !this._chartsInitialized) {
                console.log("Statistics tab selected");
            }
        },

        onCourseSelect: function(oEvent) {
            var oItem = oEvent.getParameter("listItem");
            var oContext = oItem.getBindingContext();
            this._selectedCourse = oContext.getObject();
        },

        onEnroll: function(oEvent) {
            var oButton = oEvent.getSource();
            var oContext = oButton.getBindingContext();
            var oCourse = oContext.getObject();
            var that = this;
            
            if (!oCourse) return;

            var oProfile = this.getView().getModel("profile").getData();

            // Validation
            if (oCourse.department_ID !== oProfile.department_ID) {
                MessageBox.warning("You can only enroll in courses from your department (" + oProfile.departmentName + ")");
                return;
            }

            if (oProfile.ectsAvailable < oCourse.ects) {
                MessageBox.warning(
                    "Insufficient ECTS credits!\n\n" +
                    "Required: " + oCourse.ects + " ECTS\n" +
                    "Available: " + oProfile.ectsAvailable + " ECTS"
                );
                return;
            }

            if (oCourse.enrolled >= oCourse.quota) {
                MessageBox.warning("This course is full. No seats available.");
                return;
            }

            MessageBox.confirm(
                "Do you want to enroll in " + oCourse.courseName + "?\n\n" +
                "ECTS: " + oCourse.ects + "\n" +
                "Available ECTS after enrollment: " + (oProfile.ectsAvailable - oCourse.ects),
                {
                    title: "Confirm Enrollment",
                    onClose: function(sAction) {
                        if (sAction === MessageBox.Action.OK) {
                            that._performEnrollment(oCourse);
                        }
                    }
                }
            );
        },

        _loadStudentProfile: function() {
            var that = this;
            
            fetch("/student/MyProfile(" + this._studentId + ")?$expand=department")
                .then(function(response) { return response.json(); })
                .then(function(oStudent) {
                    console.log("Student profile loaded:", oStudent);
                    
                    var oProfileModel = that.getView().getModel("profile");
                    oProfileModel.setProperty("/studentNumber", oStudent.studentNumber);
                    oProfileModel.setProperty("/firstName", oStudent.firstName);
                    oProfileModel.setProperty("/lastName", oStudent.lastName);
                    oProfileModel.setProperty("/email", oStudent.email);
                    oProfileModel.setProperty("/departmentName", oStudent.departmentName);
                    oProfileModel.setProperty("/department_ID", oStudent.department_ID);
                    oProfileModel.setProperty("/faculty", oStudent.faculty);
                    oProfileModel.setProperty("/ectsLimit", oStudent.ectsLimit);
                    
                    that._calculateECTS();
                })
                .catch(function(error) {
                    console.error("Failed to load profile:", error);
                    MessageToast.show("Failed to load student profile");
                });
        },

        _calculateECTS: function() {
            var that = this;
            
            fetch("/student/MyEnrollments?$expand=course")
                .then(function(response) { return response.json(); })
                .then(function(data) {
                    var iEctsUsed = 0;
                    
                    if (data.value) {
                        data.value.forEach(function(enrollment) {
                            if (enrollment.status === "ENROLLED" || enrollment.status === "COMPLETED") {
                                iEctsUsed += enrollment.ects || 0;
                            }
                        });
                    }
                    
                    var oProfile = that.getView().getModel("profile");
                    var ectsLimit = oProfile.getProperty("/ectsLimit");
                    
                    oProfile.setProperty("/ectsUsed", iEctsUsed);
                    oProfile.setProperty("/ectsAvailable", ectsLimit - iEctsUsed);
                })
                .catch(function(error) {
                    console.error("Failed to calculate ECTS:", error);
                });
        },

        _performEnrollment: function(oCourse) {
            var oAdminModel = this.getOwnerComponent().getModel("admin");
            var that = this;
            
            var oEnrollmentData = {
                student_ID: parseInt(this._studentId),
                course_ID: oCourse.ID,
                enrollmentDate: new Date().toISOString(),
                status: "ENROLLED"
            };

            var oListBinding = oAdminModel.bindList("/Enrollments");
            var oContext = oListBinding.create(oEnrollmentData);

            oContext.created().then(function() {
                MessageToast.show("Successfully enrolled in " + oCourse.courseName + "!");
                
                that.getView().byId("courseTable").getBinding("items").refresh();
                
                var oEnrollmentTable = that.getView().byId("enrollmentTable");
                if (oEnrollmentTable) {
                    oEnrollmentTable.getBinding("items").refresh();
                }
                
                that._calculateECTS();
                
            }).catch(function(oError) {
                MessageBox.error("Enrollment failed: " + (oError.message || "Unknown error"));
            });
        }
    });
});
