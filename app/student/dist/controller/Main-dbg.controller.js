sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    /**
     * @namespace student.controller
     */
    return Controller.extend("student.controller.Main", {
        
        onInit: function () {
            console.log("Main Controller initialized - UI5 PROPER VERSION!");
            
            // Initialize profile model
            const oProfileModel = new JSONModel({
                studentNumber: "Loading...",
                firstName: "",
                lastName: "",
                email: "",
                departmentName: "Loading...",
                faculty: "Loading...",
                ectsLimit: 60,
                ectsUsed: 0,
                ectsAvailable: 60
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
                available: false,
                enrollments: false,
                statistics: false
            };
            
            // Store chart instances
            this._charts = {};
            
            // Load student profile
            setTimeout(() => {
                this._loadStudentProfile();
            }, 500);
        },
        
        onAfterRendering: function() {
            // Load the first tab (Available Courses) after view is fully rendered
            if (!this._tabsLoaded.available) {
                setTimeout(() => {
                    this._loadAvailableCourses();
                    this._tabsLoaded.available = true;
                }, 500);
            }
        },

        onTabSelect: function(oEvent) {
            const sKey = oEvent.getParameter("key");
            
            // Load data for the selected tab if not already loaded
            if (sKey === "available" && !this._tabsLoaded.available) {
                this._loadAvailableCourses();
                this._tabsLoaded.available = true;
            } else if (sKey === "enrollments" && !this._tabsLoaded.enrollments) {
                this._loadMyEnrollments();
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

        _loadStudentProfile: async function () {
            const oView = this.getView();
            const oProfilePanel = this.byId("profilePanel");
            
            try {
                // Check if AuthService is available globally
                if (typeof window.AuthService === 'undefined') {
                    console.error("AuthService not available");
                    MessageToast.show("Authentication service not available");
                    return;
                }
                
                // Show loading indicator on the profile panel
                if (oProfilePanel) {
                    oProfilePanel.setBusy(true);
                }
                
                const token = await window.AuthService.getToken();
                const response = await fetch("/student/MyProfile", {
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
                console.log("Student profile response:", data);
                
                // MyProfile returns an array, get the first item
                const oStudent = data.value && data.value[0] ? data.value[0] : data;
                console.log("Student profile loaded:", oStudent);
                
                // Update profile model with student data
                const oProfileModel = this.getView().getModel("profile");
                oProfileModel.setProperty("/studentNumber", oStudent.studentNumber || "N/A");
                oProfileModel.setProperty("/firstName", oStudent.firstName || "");
                oProfileModel.setProperty("/lastName", oStudent.lastName || "");
                oProfileModel.setProperty("/email", oStudent.email || "");
                oProfileModel.setProperty("/departmentName", oStudent.departmentName || "N/A");
                oProfileModel.setProperty("/faculty", oStudent.faculty || "N/A");
                oProfileModel.setProperty("/ectsLimit", oStudent.ectsLimit || 60);
                
                // Calculate ECTS after profile is loaded
                this._calculateECTS();
                
            } catch (error) {
                console.error("Failed to load profile:", error);
                this._handleError(error, "load student profile");
            } finally {
                // Hide loading indicator
                if (oProfilePanel) {
                    oProfilePanel.setBusy(false);
                }
            }
        },

        _calculateECTS: async function () {
            try {
                const token = await window.AuthService.getToken();
                const url = "/student/MyEnrollments?$expand=course";
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
                let ectsUsed = 0;
                
                if (data.value) {
                    data.value.forEach(enrollment => {
                        if (enrollment.status === "ENROLLED" || enrollment.status === "COMPLETED") {
                            ectsUsed += enrollment.ects || 0;
                        }
                    });
                }
                
                const oProfileModel = this.getView().getModel("profile");
                const ectsLimit = oProfileModel.getProperty("/ectsLimit");
                oProfileModel.setProperty("/ectsUsed", ectsUsed);
                oProfileModel.setProperty("/ectsAvailable", ectsLimit - ectsUsed);
                
            } catch (error) {
                console.error("Failed to calculate ECTS:", error);
                this._handleError(error, "calculate ECTS");
            }
        },

        _loadAvailableCourses: async function () {
            const oCourseTable = this.byId("courseTable");
            
            try {
                console.log("Loading available courses...");
                
                // Show loading indicator
                if (oCourseTable) {
                    oCourseTable.setBusy(true);
                }
                
                const token = await window.AuthService.getToken();
                const url = "/student/AvailableCourses";
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
                console.log("Available courses loaded:", data);
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
                console.error("Failed to load available courses:", error);
                this._handleError(error, "load available courses");
            } finally {
                // Hide loading indicator
                if (oCourseTable) {
                    oCourseTable.setBusy(false);
                }
            }
        },

        _loadMyEnrollments: async function () {
            const oEnrollmentTable = this.byId("enrollmentTable");
            
            try {
                console.log("Loading my enrollments...");
                
                // Show loading indicator
                if (oEnrollmentTable) {
                    oEnrollmentTable.setBusy(true);
                }
                
                const token = await window.AuthService.getToken();
                const url = "/student/MyEnrollments";
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
                console.log("My enrollments loaded:", data);
                
                // Update enrollments model
                const oEnrollmentsModel = this.getView().getModel("enrollments");
                oEnrollmentsModel.setProperty("/enrollments", data.value || []);
                
                // Recalculate ECTS after loading enrollments
                this._calculateECTS();
                
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

        _loadStatistics: async function () {
            try {
                console.log("Loading statistics...");
                
                const token = await window.AuthService.getToken();
                
                // For statistics, we need ALL courses from the student's department, not just available ones
                // So we fetch from MyEnrollments to get enrolled courses, then combine with AvailableCourses
                const [availableCoursesResponse, enrollmentsResponse] = await Promise.all([
                    fetch("/student/AvailableCourses", {
                        headers: { "Authorization": "Bearer " + token }
                    }),
                    fetch("/student/MyEnrollments", {
                        headers: { "Authorization": "Bearer " + token }
                    })
                ]);
                
                // Handle HTTP errors
                if (!availableCoursesResponse.ok) {
                    if (availableCoursesResponse.status === 401) {
                        this._handleAuthError();
                        return;
                    } else if (availableCoursesResponse.status === 403) {
                        this._handleAuthorizationError();
                        return;
                    }
                    throw new Error(`HTTP ${availableCoursesResponse.status}: ${availableCoursesResponse.statusText}`);
                }
                
                if (!enrollmentsResponse.ok) {
                    if (enrollmentsResponse.status === 401) {
                        this._handleAuthError();
                        return;
                    } else if (enrollmentsResponse.status === 403) {
                        this._handleAuthorizationError();
                        return;
                    }
                    throw new Error(`HTTP ${enrollmentsResponse.status}: ${enrollmentsResponse.statusText}`);
                }
                
                const availableCoursesData = await availableCoursesResponse.json();
                const enrollmentsData = await enrollmentsResponse.json();
                
                console.log("Statistics - Available courses data:", availableCoursesData);
                console.log("Statistics - Enrollments data:", enrollmentsData);
                
                // Combine available courses with enrolled courses for complete statistics
                const allCourses = [...(availableCoursesData.value || [])];
                
                // Add enrolled courses that might not be in available courses
                if (enrollmentsData.value) {
                    enrollmentsData.value.forEach(enrollment => {
                        if (enrollment.course) {
                            // Check if course is already in allCourses
                            const exists = allCourses.find(c => c.ID === enrollment.course.ID);
                            if (!exists) {
                                allCourses.push(enrollment.course);
                            }
                        }
                    });
                }
                
                console.log("Statistics - Combined courses array:", allCourses);
                console.log("Statistics - Combined courses array length:", allCourses.length);
                
                // Render charts with a small delay to ensure DOM is ready
                setTimeout(() => {
                    this._renderCourseCapacityChart(allCourses);
                    this._renderEctsChart();
                    this._renderEnrollmentStatusChart(enrollmentsData.value || []);
                }, 300);
                
            } catch (error) {
                console.error("Failed to load statistics:", error);
                this._handleError(error, "load statistics");
            }
        },

        _renderCourseCapacityChart: function (courses) {
            const ctx = document.getElementById('courseCapacityChart');
            if (!ctx) {
                console.error("Course capacity chart canvas not found");
                return;
            }
            
            // Destroy existing chart if it exists
            if (this._charts.courseCapacity) {
                this._charts.courseCapacity.destroy();
            }
            
            // Check if courses array is valid
            if (!courses || !Array.isArray(courses) || courses.length === 0) {
                console.warn("No courses data available for chart");
                // Create empty chart with message
                this._charts.courseCapacity = new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: [],
                        datasets: []
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'No course data available'
                            }
                        }
                    }
                });
                return;
            }
            
            // Prepare data - show top 10 courses by enrollment
            const sortedCourses = courses
                .sort((a, b) => (b.enrolled || 0) - (a.enrolled || 0))
                .slice(0, 10);
            
            console.log("Rendering course capacity chart with courses:", sortedCourses);
            
            const labels = sortedCourses.map(c => c.courseCode || 'N/A');
            const enrolled = sortedCourses.map(c => c.enrolled || 0);
            const available = sortedCourses.map(c => Math.max(0, (c.quota || 0) - (c.enrolled || 0)));
            
            console.log("Chart data - Labels:", labels, "Enrolled:", enrolled, "Available:", available);
            
            this._charts.courseCapacity = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Enrolled',
                            data: enrolled,
                            backgroundColor: 'rgba(54, 162, 235, 0.8)',
                            borderColor: 'rgba(54, 162, 235, 1)',
                            borderWidth: 1
                        },
                        {
                            label: 'Available',
                            data: available,
                            backgroundColor: 'rgba(75, 192, 192, 0.8)',
                            borderColor: 'rgba(75, 192, 192, 1)',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Course Code'
                            }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Number of Students'
                            }
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Top 10 Courses by Enrollment'
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        }
                    }
                }
            });
        },

        _renderEctsChart: function () {
            const ctx = document.getElementById('ectsChart');
            if (!ctx) return;
            
            // Destroy existing chart if it exists
            if (this._charts.ects) {
                this._charts.ects.destroy();
            }
            
            const oProfileModel = this.getView().getModel("profile");
            const ectsUsed = oProfileModel.getProperty("/ectsUsed") || 0;
            const ectsAvailable = oProfileModel.getProperty("/ectsAvailable") || 0;
            
            this._charts.ects = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['ECTS Used', 'ECTS Available'],
                    datasets: [{
                        data: [ectsUsed, ectsAvailable],
                        backgroundColor: [
                            'rgba(255, 99, 132, 0.8)',
                            'rgba(75, 192, 192, 0.8)'
                        ],
                        borderColor: [
                            'rgba(255, 99, 132, 1)',
                            'rgba(75, 192, 192, 1)'
                        ],
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'My ECTS Distribution'
                        },
                        legend: {
                            display: true,
                            position: 'bottom'
                        }
                    }
                }
            });
        },

        _renderEnrollmentStatusChart: function (enrollments) {
            const ctx = document.getElementById('statusChart');
            if (!ctx) return;
            
            // Destroy existing chart if it exists
            if (this._charts.status) {
                this._charts.status.destroy();
            }
            
            // Count enrollments by status
            const statusCounts = {};
            enrollments.forEach(e => {
                const status = e.status || 'UNKNOWN';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            
            const labels = Object.keys(statusCounts);
            const data = Object.values(statusCounts);
            const colors = labels.map(status => {
                switch(status) {
                    case 'ENROLLED': return 'rgba(54, 162, 235, 0.9)';      // Blue
                    case 'EXCELLENT': return 'rgba(16, 126, 62, 0.9)';      // Dark Green
                    case 'VERY_GOOD': return 'rgba(43, 125, 43, 0.9)';      // Green
                    case 'GOOD': return 'rgba(16, 185, 129, 0.9)';          // Light Green/Teal
                    case 'SATISFACTORY': return 'rgba(245, 158, 11, 0.9)';  // Orange
                    case 'PASSED': return 'rgba(233, 115, 12, 0.9)';        // Dark Orange
                    case 'FAILED': return 'rgba(208, 67, 67, 0.9)';         // Red
                    case 'COMPLETED': return 'rgba(16, 126, 62, 0.9)';      // Dark Green
                    case 'DROPPED': return 'rgba(91, 115, 139, 0.9)';       // Gray
                    default: return 'rgba(149, 165, 166, 0.9)';             // Light Gray
                }
            });
            
            this._charts.status = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: colors,
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Enrollment Status Breakdown'
                        },
                        legend: {
                            display: true,
                            position: 'bottom'
                        }
                    }
                }
            });
        },

        onEnroll: async function (oEvent) {
            const oButton = oEvent.getSource();
            
            try {
                // Get the course from the button's binding context
                const oContext = oButton.getBindingContext("courses");
                const oCourse = oContext.getObject();
                
                console.log("Enrolling in course:", oCourse);
                
                // Check ECTS availability
                const oProfileModel = this.getView().getModel("profile");
                const ectsAvailable = oProfileModel.getProperty("/ectsAvailable");
                const courseEcts = oCourse.ects || 0;
                
                if (ectsAvailable < courseEcts) {
                    MessageBox.error(`Insufficient ECTS available. You need ${courseEcts} ECTS but only have ${ectsAvailable} ECTS available.`);
                    return;
                }
                
                // Check if course is full
                if (oCourse.enrolled >= oCourse.quota) {
                    MessageBox.error("This course is full. Please select another course.");
                    return;
                }
                
                // Disable the button and show busy indicator during enrollment
                oButton.setEnabled(false);
                oButton.setBusy(true);
                
                const token = await window.AuthService.getToken();
                
                // Create enrollment using admin service (POST to /admin/Enrollments)
                const enrollmentData = {
                    course_ID: oCourse.ID,
                    status: "ENROLLED"
                };
                
                const response = await fetch("/student/Enrollments", {
                    method: "POST",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(enrollmentData)
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
                console.log("Enrollment created:", result);
                
                MessageBox.success(`Successfully enrolled in ${oCourse.courseName}!`, {
                    onClose: () => {
                        // Refresh the course list and enrollments
                        this._refreshData();
                    }
                });
                
            } catch (error) {
                console.error("Failed to enroll:", error);
                MessageBox.error(`Failed to enroll in course: ${error.message}`);
            } finally {
                // Re-enable the button and hide busy indicator
                oButton.setEnabled(true);
                oButton.setBusy(false);
            }
        },

        _refreshData: function () {
            // Reload student profile to get updated ECTS
            this._loadStudentProfile();
            
            // Mark tabs as not loaded to force refresh
            this._tabsLoaded.available = false;
            this._tabsLoaded.enrollments = false;
            this._tabsLoaded.statistics = false;
            
            // Reload both available courses and enrollments to reflect changes
            this._loadAvailableCourses();
            this._loadMyEnrollments();
            this._tabsLoaded.available = true;
            this._tabsLoaded.enrollments = true;
            
            // If on statistics tab, reload statistics
            const oIconTabBar = this.byId("iconTabBar");
            if (oIconTabBar) {
                const sSelectedKey = oIconTabBar.getSelectedKey();
                if (sSelectedKey === "statistics") {
                    this._loadStatistics();
                    this._tabsLoaded.statistics = true;
                }
            }
        },

        // Formatter functions
        formatEctsState: function (ectsAvailable) {
            const available = parseInt(ectsAvailable) || 0;
            if (available > 10) return "Success";
            if (available > 0) return "Warning";
            return "Error";
        },

        formatQuotaText: function (enrolled, quota) {
            return (enrolled || 0) + "/" + (quota || 0);
        },

        formatQuotaStatus: function (enrolled, quota) {
            return (enrolled >= quota) ? "Full" : "Available";
        },

        formatQuotaState: function (enrolled, quota) {
            return (enrolled >= quota) ? "Error" : "Success";
        },

        formatEnrollEnabled: function (enrolled, quota) {
            return enrolled < quota;
        },

        formatStatusState: function (status) {
            switch(status) {
                case "ENROLLED": return "Information";
                case "COMPLETED": return "Success";
                default: return "Warning";
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
        }
    });
});
