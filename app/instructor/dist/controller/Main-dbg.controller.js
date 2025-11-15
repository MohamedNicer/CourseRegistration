sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    /**
     * @namespace instructor.controller
     */
    return Controller.extend("instructor.controller.Main", {
        
        onInit: function () {
            console.log("Instructor Main Controller initialized");
            
            // Initialize profile model
            const oProfileModel = new JSONModel({
                firstName: "",
                lastName: "",
                email: "",
                departmentName: ""
            });
            this.getView().setModel(oProfileModel, "profile");
            
            // Initialize courses model
            const oCoursesModel = new JSONModel({
                courses: []
            });
            this.getView().setModel(oCoursesModel, "courses");
            
            // Initialize enrollments model
            const oEnrollmentsModel = new JSONModel({
                enrollments: []
            });
            this.getView().setModel(oEnrollmentsModel, "enrollments");
            
            // Initialize tab loading state
            this._tabsLoaded = {
                courses: false,
                enrollments: false,
                statistics: false
            };
            
            // Store chart instances
            this._charts = {};
            
            // Load instructor profile
            setTimeout(() => {
                this._loadInstructorProfile();
            }, 500);
        },
        
        onAfterRendering: function() {
            // Load the first tab (My Courses) after view is fully rendered
            if (!this._tabsLoaded.courses) {
                setTimeout(() => {
                    this._loadInstructorCourses();
                    this._tabsLoaded.courses = true;
                }, 500);
            }
        },

        onTabSelect: function(oEvent) {
            const sKey = oEvent.getParameter("key");
            
            // Load data for the selected tab if not already loaded
            if (sKey === "courses" && !this._tabsLoaded.courses) {
                this._loadInstructorCourses();
                this._tabsLoaded.courses = true;
            } else if (sKey === "enrollments" && !this._tabsLoaded.enrollments) {
                this._loadEnrollments();
                this._tabsLoaded.enrollments = true;
            } else if (sKey === "statistics" && !this._tabsLoaded.statistics) {
                this._loadStatistics();
                this._tabsLoaded.statistics = true;
            }
        },

        onNavBack: function () {
            window.location.href = "/launchpad.html";
        },

        onLogout: async function () {
            if (typeof window.AuthService !== 'undefined') {
                await window.AuthService.logout();
            } else {
                window.location.href = "../../launchpad.html";
            }
        },

        _loadInstructorProfile: async function () {
            try {
                // Check if AuthService is available globally
                if (typeof window.AuthService === 'undefined') {
                    console.error("AuthService not available");
                    MessageToast.show("Authentication service not available");
                    return;
                }
                
                const user = await window.AuthService.getUser();
                console.log("Instructor user:", user);
                
                // Update profile model with user data
                const oProfileModel = this.getView().getModel("profile");
                oProfileModel.setProperty("/email", user.email || "");
                
                // Fetch instructor details from backend
                const token = await window.AuthService.getToken();
                const url = "/instructor/Instructors";
                console.log("Fetching from URL:", url);
                const response = await fetch(url, {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                // Handle HTTP errors
                if (!response.ok) {
                    if (response.status === 401) {
                        this._handleAuthError();
                        return;
                    } else if (response.status === 403) {
                        this._handleAuthorizationError();
                        return;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log("Instructor profile response:", data);
                
                // Get the first instructor (should be the logged-in instructor)
                const oInstructor = data.value && data.value[0] ? data.value[0] : data;
                
                console.log("Setting profile data:", oInstructor);
                oProfileModel.setProperty("/firstName", oInstructor.firstName || "");
                oProfileModel.setProperty("/lastName", oInstructor.lastName || "");
                oProfileModel.setProperty("/departmentName", oInstructor.department?.departmentName || oInstructor.departmentName || "");
                
                console.log("Profile model after update:", oProfileModel.getData());
                
            } catch (error) {
                console.error("Failed to load instructor profile:", error);
                this._handleError(error, "load instructor profile");
            }
        },

        _loadInstructorCourses: async function () {
            const oCourseTable = this.byId("courseTable");
            
            try {
                console.log("Loading instructor courses...");
                
                // Show loading indicator
                if (oCourseTable) {
                    oCourseTable.setBusy(true);
                }
                
                const token = await window.AuthService.getToken();
                const url = "/instructor/Courses";
                console.log("Fetching from URL:", url);
                const response = await fetch(url, {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                // Handle HTTP errors
                if (!response.ok) {
                    if (response.status === 401) {
                        this._handleAuthError();
                        return;
                    } else if (response.status === 403) {
                        this._handleAuthorizationError();
                        return;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log("Instructor courses loaded:", data);
                console.log("Number of courses:", data.value ? data.value.length : 0);
                
                // Update courses model
                const oCoursesModel = this.getView().getModel("courses");
                if (!oCoursesModel) {
                    console.error("Courses model not found!");
                    return;
                }
                
                oCoursesModel.setProperty("/courses", data.value || []);
                console.log("Courses model updated. Current data:", oCoursesModel.getData());
                
            } catch (error) {
                console.error("Failed to load instructor courses:", error);
                this._handleError(error, "load instructor courses");
            } finally {
                // Hide loading indicator
                if (oCourseTable) {
                    oCourseTable.setBusy(false);
                }
            }
        },

        _loadEnrollments: async function () {
            const oEnrollmentTable = this.byId("enrollmentTable");
            
            try {
                console.log("Loading enrollments...");
                
                // Show loading indicator
                if (oEnrollmentTable) {
                    oEnrollmentTable.setBusy(true);
                }
                
                const token = await window.AuthService.getToken();
                const url = "/instructor/Enrollments?$expand=student,course";
                console.log("Fetching from URL:", url);
                const response = await fetch(url, {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                // Handle HTTP errors
                if (!response.ok) {
                    if (response.status === 401) {
                        this._handleAuthError();
                        return;
                    } else if (response.status === 403) {
                        this._handleAuthorizationError();
                        return;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                console.log("Enrollments loaded:", data);
                console.log("Number of enrollments:", data.value ? data.value.length : 0);
                
                // Log first enrollment to see what fields are available
                if (data.value && data.value.length > 0) {
                    console.log("First enrollment sample:", JSON.stringify(data.value[0], null, 2));
                }
                
                // Update enrollments model
                const oEnrollmentsModel = this.getView().getModel("enrollments");
                if (!oEnrollmentsModel) {
                    console.error("Enrollments model not found!");
                    return;
                }
                
                oEnrollmentsModel.setProperty("/enrollments", data.value || []);
                console.log("Enrollments model updated. Current data:", oEnrollmentsModel.getData());
                
            } catch (error) {
                console.error("Failed to load enrollments:", error);
                this._handleError(error, "load enrollments");
            } finally {
                // Hide loading indicator
                if (oEnrollmentTable) {
                    oEnrollmentTable.setBusy(false);
                }
            }
        },

        onUpdateGrade: async function (oEvent) {
            const oButton = oEvent.getSource();
            let oGradeInput = null;
            
            try {
                // Get the enrollment from the button's binding context
                const oContext = oButton.getBindingContext("enrollments");
                const oEnrollment = oContext.getObject();
                
                console.log("Updating grade for enrollment:", oEnrollment);
                
                // Get the grade input value from the same row
                const oRow = oButton.getParent();
                const aCells = oRow.getCells();
                oGradeInput = aCells[6]; // Grade input is the 7th cell (index 6)
                const sGrade = oGradeInput.getValue().trim();
                
                // Validate grade is not empty
                if (!sGrade) {
                    MessageBox.warning("Please enter a grade.");
                    return;
                }
                
                // Validate grade is a number
                const fGrade = parseFloat(sGrade);
                if (isNaN(fGrade)) {
                    MessageBox.warning("Grade must be a valid number.");
                    oGradeInput.setValueState("Error");
                    oGradeInput.setValueStateText("Grade must be a number");
                    return;
                }
                
                // Validate grade is between 0 and 20
                if (fGrade < 0 || fGrade > 20) {
                    MessageBox.warning("Grade must be between 0 and 20.");
                    oGradeInput.setValueState("Error");
                    oGradeInput.setValueStateText("Grade must be between 0 and 20");
                    return;
                }
                
                // Clear any previous error state
                oGradeInput.setValueState("None");
                
                // Determine status based on grade
                let status;
                if (fGrade >= 18) {
                    status = "EXCELLENT";
                } else if (fGrade >= 16) {
                    status = "VERY_GOOD";
                } else if (fGrade >= 14) {
                    status = "GOOD";
                } else if (fGrade >= 12) {
                    status = "SATISFACTORY";
                } else if (fGrade >= 10) {
                    status = "PASSED";
                } else {
                    status = "FAILED";
                }
                
                // Disable the button and input, show busy indicator during update
                oButton.setEnabled(false);
                oButton.setBusy(true);
                oGradeInput.setEnabled(false);
                
                const token = await window.AuthService.getToken();
                
                // Update enrollment grade and status using PATCH
                const updateData = {
                    grade: fGrade,
                    status: status
                };
                
                const response = await fetch(`/instructor/Enrollments(${oEnrollment.ID})`, {
                    method: "PATCH",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(updateData)
                });
                
                // Handle HTTP errors
                if (!response.ok) {
                    if (response.status === 401) {
                        this._handleAuthError();
                        return;
                    } else if (response.status === 403) {
                        this._handleAuthorizationError();
                        return;
                    }
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                console.log("Grade updated:", result);
                
                MessageToast.show(`Grade ${fGrade} saved. Status updated to ${status} for ${oEnrollment.student?.firstName} ${oEnrollment.student?.lastName}`);
                
                // Refresh the enrollment list
                this._refreshEnrollments();
                
            } catch (error) {
                console.error("Failed to update grade:", error);
                MessageBox.error(`Failed to update grade: ${error.message}`);
            } finally {
                // Re-enable the button and input, hide busy indicator
                oButton.setEnabled(true);
                oButton.setBusy(false);
                if (oGradeInput) {
                    oGradeInput.setEnabled(true);
                }
            }
        },

        _refreshEnrollments: function () {
            // Refresh the OData model to get updated data
            const oModel = this.getView().getModel();
            if (oModel) {
                oModel.refresh();
            }
            
            // Mark enrollments tab as not loaded to force refresh
            this._tabsLoaded.enrollments = false;
            
            // Reload enrollments
            this._loadEnrollments();
            this._tabsLoaded.enrollments = true;
        },

        // Formatter functions
        formatStatusState: function (status) {
            switch(status) {
                case "ENROLLED": return "Information";
                case "EXCELLENT": return "Success";
                case "VERY_GOOD": return "Success";
                case "GOOD": return "Success";
                case "SATISFACTORY": return "Warning";
                case "PASSED": return "Warning";
                case "FAILED": return "Error";
                case "COMPLETED": return "Success";
                case "DROPPED": return "None";
                default: return "None";
            }
        },

        // Error handling methods
        _handleError: function(error, context) {
            console.error(`[${context}] Error:`, error);
            MessageToast.show(`Failed to ${context}. Please try again.`);
        },

        _handleAuthError: function() {
            MessageBox.error("Your session has expired. Please log in again.", {
                onClose: async function() {
                    await window.AuthService.login();
                }
            });
        },

        _handleAuthorizationError: function() {
            MessageBox.error("You don't have permission to access this resource.", {
                onClose: function() {
                    window.location.href = "../../launchpad.html";
                }
            });
        },

        // ==================== STATISTICS & CHARTS ====================
        
        _loadStatistics: async function() {
            try {
                console.log("Loading instructor statistics...");
                
                const token = await window.AuthService.getToken();
                
                // Fetch courses and enrollments
                const [coursesResponse, enrollmentsResponse] = await Promise.all([
                    fetch("/instructor/Courses", {
                        headers: { "Authorization": "Bearer " + token }
                    }),
                    fetch("/instructor/Enrollments", {
                        headers: { "Authorization": "Bearer " + token }
                    })
                ]);
                
                if (!coursesResponse.ok || !enrollmentsResponse.ok) {
                    throw new Error("Failed to load statistics data");
                }
                
                const coursesData = await coursesResponse.json();
                const enrollmentsData = await enrollmentsResponse.json();
                
                console.log("Statistics data loaded");
                
                // Render charts with delay to ensure DOM is ready
                setTimeout(() => {
                    this._renderCourseCapacityChart(coursesData.value || []);
                    this._renderGradeDistributionChart(enrollmentsData.value || []);
                    this._renderEnrollmentStatusChart(enrollmentsData.value || []);
                }, 500);
                
            } catch (error) {
                console.error("Failed to load statistics:", error);
                MessageToast.show("Failed to load statistics");
            }
        },
        
        _renderCourseCapacityChart: function(courses) {
            const canvas = document.getElementById('instructorCourseCapacityChart');
            if (!canvas) {
                console.warn("Course capacity chart canvas not found");
                return;
            }
            
            if (this._charts.courseCapacity) {
                this._charts.courseCapacity.destroy();
            }
            
            const labels = courses.map(c => c.courseCode);
            const enrolled = courses.map(c => c.enrolled || 0);
            const available = courses.map(c => (c.quota || 0) - (c.enrolled || 0));
            
            const ctx = canvas.getContext('2d');
            this._charts.courseCapacity = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Enrolled',
                            data: enrolled,
                            backgroundColor: '#0070F2'
                        },
                        {
                            label: 'Available',
                            data: available,
                            backgroundColor: '#E0E0E0'
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Course Enrollment Capacity',
                            font: { size: 14 }
                        }
                    },
                    scales: {
                        x: { stacked: true },
                        y: { 
                            stacked: true,
                            beginAtZero: true
                        }
                    }
                }
            });
        },
        
        _renderGradeDistributionChart: function(enrollments) {
            const canvas = document.getElementById('instructorGradeChart');
            if (!canvas) {
                console.warn("Grade chart canvas not found");
                return;
            }
            
            if (this._charts.grades) {
                this._charts.grades.destroy();
            }
            
            const gradeRanges = {
                'A (18-20)': 0,
                'B (15-17.9)': 0,
                'C (12-14.9)': 0,
                'D (10-11.9)': 0,
                'F (<10)': 0,
                'No Grade': 0
            };
            
            enrollments.forEach(enrollment => {
                const grade = enrollment.grade;
                if (grade === null || grade === undefined) {
                    gradeRanges['No Grade']++;
                } else if (grade >= 18) gradeRanges['A (18-20)']++;
                else if (grade >= 15) gradeRanges['B (15-17.9)']++;
                else if (grade >= 12) gradeRanges['C (12-14.9)']++;
                else if (grade >= 10) gradeRanges['D (10-11.9)']++;
                else gradeRanges['F (<10)']++;
            });
            
            const ctx = canvas.getContext('2d');
            this._charts.grades = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: Object.keys(gradeRanges),
                    datasets: [{
                        data: Object.values(gradeRanges),
                        backgroundColor: [
                            '#107E3E', // A - Green
                            '#0070F2', // B - Blue
                            '#E9730C', // C - Orange
                            '#C0399F', // D - Purple
                            '#D04343', // F - Red
                            '#E0E0E0'  // No Grade - Gray
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Grade Distribution Across All Courses',
                            font: { size: 14 }
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        },
        
        _renderEnrollmentStatusChart: function(enrollments) {
            const canvas = document.getElementById('instructorStatusChart');
            if (!canvas) {
                console.warn("Status chart canvas not found");
                return;
            }
            
            if (this._charts.status) {
                this._charts.status.destroy();
            }
            
            const statusCounts = {};
            enrollments.forEach(enrollment => {
                const status = enrollment.status || 'Unknown';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            
            const ctx = canvas.getContext('2d');
            this._charts.status = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(statusCounts),
                    datasets: [{
                        data: Object.values(statusCounts),
                        backgroundColor: [
                            '#0070F2', // ENROLLED - Blue
                            '#107E3E', // COMPLETED - Green
                            '#E9730C'  // DROPPED - Orange
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Enrollment Status Overview',
                            font: { size: 14 }
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        }

    });
});
