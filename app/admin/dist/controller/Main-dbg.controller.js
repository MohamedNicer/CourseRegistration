sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
], function (Controller, JSONModel, MessageToast, MessageBox, Fragment) {
    "use strict";

    return Controller.extend("admin.controller.Main", {
        
        onInit: function () {
            console.log("Admin Main Controller initialized");
            
            // Initialize profile model
            const oProfileModel = new JSONModel({
                email: "",
                name: ""
            });
            this.getView().setModel(oProfileModel, "profile");
            
            // Initialize students model
            const oStudentsModel = new JSONModel({
                students: []
            });
            this.getView().setModel(oStudentsModel, "students");
            
            // Initialize instructors model
            const oInstructorsModel = new JSONModel({
                instructors: []
            });
            this.getView().setModel(oInstructorsModel, "instructors");
            
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
                students: false,
                instructors: false,
                courses: false,
                enrollments: false
            };
            
            // Store chart instances
            this._charts = {};
            
            // Store chart data for rendering after DOM is ready
            this._chartData = {};
            
            // Load admin profile and initial tab data
            setTimeout(() => {
                this._loadAdminProfile();
                // Load the first tab (Students) by default
                this._loadStudents();
                this._tabsLoaded.students = true;
            }, 500);
        },
        
        onAfterRendering: function() {
            console.log("Admin view rendered, checking for pending charts...");
            // Render any pending charts after DOM is ready
            if (this._chartData.students) {
                this._renderStudentChartsNow(this._chartData.students);
            }
            if (this._chartData.instructors) {
                this._renderInstructorChartsNow(this._chartData.instructors);
            }
            if (this._chartData.courses) {
                this._renderCourseChartsNow(this._chartData.courses);
            }
            if (this._chartData.enrollments) {
                this._renderEnrollmentChartsNow(this._chartData.enrollments);
            }
        },

        onTabSelect: function(oEvent) {
            const sKey = oEvent.getParameter("key");
            
            console.log("Tab selected:", sKey, "Already loaded:", this._tabsLoaded[sKey]);
            
            // Load data for the selected tab if not already loaded
            if (sKey === "students" && !this._tabsLoaded.students) {
                this._loadStudents();
                this._tabsLoaded.students = true;
            } else if (sKey === "instructors" && !this._tabsLoaded.instructors) {
                console.log("Loading instructors tab for the first time");
                this._loadInstructors();
                this._tabsLoaded.instructors = true;
            } else if (sKey === "courses" && !this._tabsLoaded.courses) {
                this._loadCourses();
                this._tabsLoaded.courses = true;
            } else if (sKey === "enrollments" && !this._tabsLoaded.enrollments) {
                this._loadEnrollments();
                this._tabsLoaded.enrollments = true;
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

        _loadAdminProfile: async function () {
            try {
                if (typeof window.AuthService === 'undefined') {
                    console.error("AuthService not available");
                    MessageToast.show("Authentication service not available");
                    return;
                }
                
                const user = await window.AuthService.getUser();
                console.log("Admin user:", user);
                
                const oProfileModel = this.getView().getModel("profile");
                oProfileModel.setProperty("/email", user.email || "");
                oProfileModel.setProperty("/name", user.name || user.nickname || "Admin User");
                
            } catch (error) {
                console.error("Failed to load admin profile:", error);
                this._handleError(error, "load admin profile");
            }
        },

        _loadStudents: async function () {
            const oStudentTable = this.byId("studentTable");
            
            try {
                console.log("Loading students...");
                
                if (oStudentTable) {
                    oStudentTable.setBusy(true);
                }
                
                const token = await window.AuthService.getToken();
                const response = await fetch("/admin/Students?$expand=department", {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
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
                console.log("Students loaded:", data);
                
                // Update students model
                const oStudentsModel = this.getView().getModel("students");
                oStudentsModel.setProperty("/students", data.value || []);
                
                // Render charts
                this._renderStudentCharts(data.value);
                
            } catch (error) {
                console.error("Failed to load students:", error);
                this._handleError(error, "load students");
            } finally {
                if (oStudentTable) {
                    oStudentTable.setBusy(false);
                }
            }
        },

        _loadInstructors: async function () {
            console.log("_loadInstructors called");
            const oInstructorTable = this.byId("instructorTable");
            console.log("Instructor table found:", !!oInstructorTable);
            
            try {
                console.log("Loading instructors...");
                
                if (oInstructorTable) {
                    oInstructorTable.setBusy(true);
                }
                
                const token = await window.AuthService.getToken();
                const response = await fetch("/admin/Instructors?$expand=department", {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
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
                console.log("Instructors loaded:", data);
                
                // Update instructors model
                const oInstructorsModel = this.getView().getModel("instructors");
                oInstructorsModel.setProperty("/instructors", data.value || []);
                
                // Render charts
                this._renderInstructorCharts(data.value);
                
            } catch (error) {
                console.error("Failed to load instructors:", error);
                this._handleError(error, "load instructors");
            } finally {
                if (oInstructorTable) {
                    oInstructorTable.setBusy(false);
                }
            }
        },

        _loadCourses: async function () {
            const oCourseTable = this.byId("courseTable");
            
            try {
                console.log("Loading courses...");
                
                if (oCourseTable) {
                    oCourseTable.setBusy(true);
                }
                
                const token = await window.AuthService.getToken();
                const response = await fetch("/admin/Courses?$expand=department,instructor", {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
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
                console.log("Courses loaded:", data);
                
                // Update courses model
                const oCoursesModel = this.getView().getModel("courses");
                oCoursesModel.setProperty("/courses", data.value || []);
                
                // Render charts
                this._renderCourseCharts(data.value);
                
            } catch (error) {
                console.error("Failed to load courses:", error);
                this._handleError(error, "load courses");
            } finally {
                if (oCourseTable) {
                    oCourseTable.setBusy(false);
                }
            }
        },

        _loadEnrollments: async function () {
            const oEnrollmentTable = this.byId("enrollmentTable");
            
            try {
                console.log("Loading enrollments...");
                
                if (oEnrollmentTable) {
                    oEnrollmentTable.setBusy(true);
                }
                
                const token = await window.AuthService.getToken();
                const response = await fetch("/admin/Enrollments?$expand=student,course", {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
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
                
                // Update enrollments model
                const oEnrollmentsModel = this.getView().getModel("enrollments");
                oEnrollmentsModel.setProperty("/enrollments", data.value || []);
                
                // Render charts
                this._renderEnrollmentCharts(data.value);
                
            } catch (error) {
                console.error("Failed to load enrollments:", error);
                this._handleError(error, "load enrollments");
            } finally {
                if (oEnrollmentTable) {
                    oEnrollmentTable.setBusy(false);
                }
            }
        },

        // ==================== CHART RENDERING ====================
        
        _renderStudentCharts: function(students) {
            this._chartData.students = students;
            setTimeout(() => {
                this._renderStudentChartsNow(students);
            }, 800);
        },
        
        _renderStudentChartsNow: function(students) {
            // Department Distribution Chart
            const deptCounts = {};
            students.forEach(student => {
                const dept = student.department?.departmentName || 'Unknown';
                deptCounts[dept] = (deptCounts[dept] || 0) + 1;
            });
            
            this._createPieChart('studentDeptChart', 'Students by Department', deptCounts);
            
            // ECTS Limit Distribution
            const ectsRanges = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
            students.forEach(student => {
                const ects = student.ectsLimit || 0;
                if (ects <= 30) ectsRanges['0-30']++;
                else if (ects <= 60) ectsRanges['31-60']++;
                else if (ects <= 90) ectsRanges['61-90']++;
                else ectsRanges['90+']++;
            });
            
            this._createBarChart('studentStatsChart', 'ECTS Limit Distribution', ectsRanges);
        },
        
        _renderInstructorCharts: function(instructors) {
            this._chartData.instructors = instructors;
            setTimeout(() => {
                this._renderInstructorChartsNow(instructors);
            }, 1000);
        },
        
        _renderInstructorChartsNow: function(instructors) {
            console.log("Rendering instructor charts with", instructors.length, "instructors");
            
            // Department Distribution Chart
            const deptCounts = {};
            instructors.forEach(instructor => {
                const dept = instructor.department?.departmentName || 'Unknown';
                deptCounts[dept] = (deptCounts[dept] || 0) + 1;
            });
            
            console.log("Instructor dept counts:", deptCounts);
            this._createPieChart('instructorDeptChart', 'Instructors by Department', deptCounts);
            
            // Total count by faculty
            const facultyCounts = {};
            instructors.forEach(instructor => {
                const faculty = instructor.department?.faculty || 'Unknown';
                facultyCounts[faculty] = (facultyCounts[faculty] || 0) + 1;
            });
            
            console.log("Instructor faculty counts:", facultyCounts);
            this._createBarChart('instructorStatsChart', 'Instructors by Faculty', facultyCounts);
        },
        
        _renderCourseCharts: function(courses) {
            this._chartData.courses = courses;
            setTimeout(() => {
                this._renderCourseChartsNow(courses);
            }, 800);
        },
        
        _renderCourseChartsNow: function(courses) {
            // Department Distribution Chart
            const deptCounts = {};
            courses.forEach(course => {
                const dept = course.department?.departmentName || 'Unknown';
                deptCounts[dept] = (deptCounts[dept] || 0) + 1;
            });
            
            this._createPieChart('courseDeptChart', 'Courses by Department', deptCounts);
            
            // Capacity Utilization
            const capacityData = {
                'Full (100%)': 0,
                'High (75-99%)': 0,
                'Medium (50-74%)': 0,
                'Low (<50%)': 0,
                'Empty': 0
            };
            
            courses.forEach(course => {
                const utilization = course.quota > 0 ? (course.enrolled / course.quota) * 100 : 0;
                if (utilization >= 100) capacityData['Full (100%)']++;
                else if (utilization >= 75) capacityData['High (75-99%)']++;
                else if (utilization >= 50) capacityData['Medium (50-74%)']++;
                else if (utilization > 0) capacityData['Low (<50%)']++;
                else capacityData['Empty']++;
            });
            
            this._createBarChart('courseCapacityChart', 'Course Capacity Utilization', capacityData);
        },
        
        _renderEnrollmentCharts: function(enrollments) {
            this._chartData.enrollments = enrollments;
            setTimeout(() => {
                this._renderEnrollmentChartsNow(enrollments);
            }, 800);
        },
        
        _renderEnrollmentChartsNow: function(enrollments) {
            // Status Distribution Chart with custom colors
            const statusCounts = {};
            enrollments.forEach(enrollment => {
                const status = enrollment.status || 'Unknown';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            
            // Define color mapping for each status
            const statusColorMap = {
                'ENROLLED': '#0070F2',      // Blue
                'EXCELLENT': '#107E3E',     // Dark Green
                'VERY_GOOD': '#2B7D2B',     // Green
                'GOOD': '#10B981',          // Light Green
                'SATISFACTORY': '#F59E0B',  // Orange
                'PASSED': '#E9730C',        // Dark Orange
                'FAILED': '#D04343',        // Red
                'COMPLETED': '#107E3E',     // Dark Green
                'DROPPED': '#5B738B'        // Gray
            };
            
            // Build colors array based on actual statuses present
            const colors = Object.keys(statusCounts).map(status => statusColorMap[status] || '#999999');
            
            this._createPieChartWithColors('enrollmentStatusChart', 'Enrollments by Status', statusCounts, colors);
            
            // Grade Distribution (for completed enrollments)
            const gradeRanges = { 'A (18-20)': 0, 'B (15-17.9)': 0, 'C (12-14.9)': 0, 'D (10-11.9)': 0, 'F (<10)': 0, 'No Grade': 0 };
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
            
            this._createBarChart('enrollmentTrendChart', 'Grade Distribution', gradeRanges);
        },
        
        _createPieChart: function(elementId, title, data) {
            const canvas = document.getElementById(elementId);
            if (!canvas) {
                console.warn(`Canvas element ${elementId} not found`);
                return;
            }
            
            // Destroy existing chart
            if (this._charts[elementId]) {
                this._charts[elementId].destroy();
            }
            
            const ctx = canvas.getContext('2d');
            this._charts[elementId] = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: Object.keys(data),
                    datasets: [{
                        data: Object.values(data),
                        backgroundColor: [
                            '#0070F2', '#E9730C', '#107E3E', '#C0399F', '#5B738B',
                            '#D04343', '#2B7D2B', '#8B5CF6', '#F59E0B', '#10B981'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: title,
                            font: { size: 14 }
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        },
        
        _createPieChartWithColors: function(elementId, title, data, colors) {
            const canvas = document.getElementById(elementId);
            if (!canvas) {
                console.warn(`Canvas element ${elementId} not found`);
                return;
            }
            
            // Destroy existing chart
            if (this._charts[elementId]) {
                this._charts[elementId].destroy();
            }
            
            const ctx = canvas.getContext('2d');
            this._charts[elementId] = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: Object.keys(data),
                    datasets: [{
                        data: Object.values(data),
                        backgroundColor: colors
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: title,
                            font: { size: 14 }
                        },
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });
        },
        
        _createBarChart: function(elementId, title, data) {
            const canvas = document.getElementById(elementId);
            if (!canvas) {
                console.warn(`Canvas element ${elementId} not found`);
                return;
            }
            
            // Destroy existing chart
            if (this._charts[elementId]) {
                this._charts[elementId].destroy();
            }
            
            const ctx = canvas.getContext('2d');
            this._charts[elementId] = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: Object.keys(data),
                    datasets: [{
                        label: 'Count',
                        data: Object.values(data),
                        backgroundColor: '#0070F2'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: title,
                            font: { size: 14 }
                        },
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                stepSize: 1
                            }
                        }
                    }
                }
            });
        },

        // ==================== STUDENT CRUD ====================
        
        onAddStudent: async function() {
            await this._loadDepartments();
            
            // Generate next student number
            const nextStudentNumber = await this._generateNextStudentNumber();
            
            const oDialogModel = new JSONModel({
                title: "Add New Student",
                mode: "create",
                studentNumber: nextStudentNumber,
                firstName: "",
                lastName: "",
                email: "",
                ectsLimit: 60,
                department_ID: null
            });
            
            this._openStudentDialog(oDialogModel);
        },
        
        _generateNextStudentNumber: async function() {
            try {
                const token = await window.AuthService.getToken();
                const response = await fetch("/admin/Students?$orderby=studentNumber desc&$top=1", {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                if (!response.ok) {
                    throw new Error("Failed to fetch students");
                }
                
                const data = await response.json();
                
                if (data.value && data.value.length > 0) {
                    const lastStudentNumber = data.value[0].studentNumber;
                    // Extract number from STU001 format
                    const match = lastStudentNumber.match(/STU(\d+)/);
                    if (match) {
                        const nextNumber = parseInt(match[1]) + 1;
                        return `STU${String(nextNumber).padStart(3, '0')}`;
                    }
                }
                
                // Default if no students exist
                return "STU001";
                
            } catch (error) {
                console.error("Failed to generate student number:", error);
                return "STU001";
            }
        },
        
        onEditStudent: async function(oEvent) {
            const oItem = oEvent.getSource().getParent().getParent();
            const oContext = oItem.getBindingContext("students");
            const student = oContext.getObject();
            
            await this._loadDepartments();
            
            const oDialogModel = new JSONModel({
                title: "Edit Student",
                mode: "edit",
                ID: student.ID,
                studentNumber: student.studentNumber,
                firstName: student.firstName,
                lastName: student.lastName,
                email: student.email,
                ectsLimit: student.ectsLimit,
                department_ID: student.department_ID
            });
            
            this._openStudentDialog(oDialogModel);
        },
        
        _openStudentDialog: async function(oDialogModel) {
            if (!this._studentDialog) {
                this._studentDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.view.StudentDialog",
                    controller: this
                });
                this.getView().addDependent(this._studentDialog);
            }
            
            this._studentDialog.setModel(oDialogModel, "dialogModel");
            
            // Set departments model - ensure it exists
            if (this._departmentsModel) {
                this._studentDialog.setModel(this._departmentsModel, "departments");
            } else {
                console.error("Departments model not loaded!");
            }
            
            this._studentDialog.open();
        },
        
        onSaveStudent: async function() {
            const oDialogModel = this._studentDialog.getModel("dialogModel");
            const data = oDialogModel.getData();
            
            // Validation
            if (!data.studentNumber || !data.firstName || !data.lastName || !data.email || !data.department_ID) {
                MessageBox.error("Please fill in all required fields");
                return;
            }
            
            try {
                const token = await window.AuthService.getToken();
                const url = data.mode === "create" ? "/admin/Students" : `/admin/Students(${data.ID})`;
                const method = data.mode === "create" ? "POST" : "PATCH";
                
                const payload = {
                    studentNumber: data.studentNumber,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    ectsLimit: parseInt(data.ectsLimit),
                    department_ID: parseInt(data.department_ID)
                };
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                MessageToast.show(data.mode === "create" ? "Student created successfully" : "Student updated successfully");
                this._studentDialog.close();
                this.getView().getModel().refresh();
                
            } catch (error) {
                console.error("Failed to save student:", error);
                MessageBox.error("Failed to save student. Please try again.");
            }
        },
        
        onDeleteStudent: async function(oEvent) {
            const oItem = oEvent.getSource().getParent().getParent();
            const oContext = oItem.getBindingContext("students");
            const student = oContext.getObject();
            
            try {
                // Check for cascade effects
                const token = await window.AuthService.getToken();
                const enrollmentsResponse = await fetch(`/admin/Enrollments?$filter=student_ID eq ${student.ID}&$expand=course`, {
                    headers: { "Authorization": "Bearer " + token }
                });
                
                if (!enrollmentsResponse.ok) {
                    throw new Error("Failed to check enrollments");
                }
                
                const enrollmentsData = await enrollmentsResponse.json();
                const enrollments = enrollmentsData.value || [];
                
                let warningMessage = `Are you sure you want to delete student "${student.firstName} ${student.lastName}"?`;
                
                if (enrollments.length > 0) {
                    warningMessage += `\n\n⚠️ CASCADE DELETE WARNING:\n\nThis will also delete ${enrollments.length} enrollment(s):\n`;
                    enrollments.slice(0, 5).forEach(e => {
                        warningMessage += `\n• ${e.course?.courseName || 'Unknown Course'} (${e.status})`;
                    });
                    if (enrollments.length > 5) {
                        warningMessage += `\n... and ${enrollments.length - 5} more`;
                    }
                }
                
                MessageBox.warning(warningMessage, {
                    title: "Confirm Delete",
                    actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.DELETE,
                    onClose: async (sAction) => {
                        if (sAction === MessageBox.Action.DELETE) {
                            await this._deleteStudent(student.ID);
                        }
                    }
                });
                
            } catch (error) {
                console.error("Error checking cascade effects:", error);
                MessageBox.error("Failed to check related records. Please try again.");
            }
        },
        
        _deleteStudent: async function(studentId) {
            try {
                const token = await window.AuthService.getToken();
                const response = await fetch(`/admin/Students(${studentId})`, {
                    method: 'DELETE',
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                MessageToast.show("Student deleted successfully");
                this.getView().getModel().refresh();
                
            } catch (error) {
                console.error("Failed to delete student:", error);
                MessageBox.error("Failed to delete student. Please try again.");
            }
        },
        
        // ==================== INSTRUCTOR CRUD ====================
        
        onAddInstructor: async function() {
            await this._loadDepartments();
            
            // Generate next instructor ID
            const nextInstructorId = await this._generateNextInstructorId();
            
            const oDialogModel = new JSONModel({
                title: "Add New Instructor",
                mode: "create",
                instructorId: nextInstructorId,
                firstName: "",
                lastName: "",
                email: "",
                department_ID: null
            });
            
            this._openInstructorDialog(oDialogModel);
        },
        
        _generateNextInstructorId: async function() {
            try {
                const token = await window.AuthService.getToken();
                const response = await fetch("/admin/Instructors?$orderby=instructorId desc&$top=1", {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                if (!response.ok) {
                    throw new Error("Failed to fetch instructors");
                }
                
                const data = await response.json();
                
                if (data.value && data.value.length > 0) {
                    const lastInstructorId = data.value[0].instructorId;
                    // Extract number from INS001 format
                    const match = lastInstructorId.match(/INS(\d+)/);
                    if (match) {
                        const nextNumber = parseInt(match[1]) + 1;
                        return `INS${String(nextNumber).padStart(3, '0')}`;
                    }
                }
                
                // Default if no instructors exist
                return "INS001";
                
            } catch (error) {
                console.error("Failed to generate instructor ID:", error);
                return "INS001";
            }
        },
        
        onEditInstructor: async function(oEvent) {
            const oItem = oEvent.getSource().getParent().getParent();
            const oContext = oItem.getBindingContext("instructors");
            const instructor = oContext.getObject();
            
            await this._loadDepartments();
            
            const oDialogModel = new JSONModel({
                title: "Edit Instructor",
                mode: "edit",
                ID: instructor.ID,
                instructorId: instructor.instructorId,
                firstName: instructor.firstName,
                lastName: instructor.lastName,
                email: instructor.email,
                department_ID: instructor.department_ID
            });
            
            this._openInstructorDialog(oDialogModel);
        },
        
        _openInstructorDialog: async function(oDialogModel) {
            if (!this._instructorDialog) {
                this._instructorDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.view.InstructorDialog",
                    controller: this
                });
                this.getView().addDependent(this._instructorDialog);
            }
            
            this._instructorDialog.setModel(oDialogModel, "dialogModel");
            
            // Set departments model - ensure it exists
            if (this._departmentsModel) {
                this._instructorDialog.setModel(this._departmentsModel, "departments");
            } else {
                console.error("Departments model not loaded!");
            }
            
            this._instructorDialog.open();
        },
        
        onSaveInstructor: async function() {
            const oDialogModel = this._instructorDialog.getModel("dialogModel");
            const data = oDialogModel.getData();
            
            // Validation
            if (!data.instructorId || !data.firstName || !data.lastName || !data.email || !data.department_ID) {
                MessageBox.error("Please fill in all required fields");
                return;
            }
            
            try {
                const token = await window.AuthService.getToken();
                const url = data.mode === "create" ? "/admin/Instructors" : `/admin/Instructors(${data.ID})`;
                const method = data.mode === "create" ? "POST" : "PATCH";
                
                const payload = {
                    instructorId: data.instructorId,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                    department_ID: parseInt(data.department_ID)
                };
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                MessageToast.show(data.mode === "create" ? "Instructor created successfully" : "Instructor updated successfully");
                this._instructorDialog.close();
                this.getView().getModel().refresh();
                
            } catch (error) {
                console.error("Failed to save instructor:", error);
                MessageBox.error("Failed to save instructor. Please try again.");
            }
        },
        
        onDeleteInstructor: async function(oEvent) {
            const oItem = oEvent.getSource().getParent().getParent();
            const oContext = oItem.getBindingContext("instructors");
            const instructor = oContext.getObject();
            
            try {
                // Check for cascade effects
                const token = await window.AuthService.getToken();
                const coursesResponse = await fetch(`/admin/Courses?$filter=instructor_ID eq ${instructor.ID}`, {
                    headers: { "Authorization": "Bearer " + token }
                });
                
                if (!coursesResponse.ok) {
                    throw new Error("Failed to check courses");
                }
                
                const coursesData = await coursesResponse.json();
                const courses = coursesData.value || [];
                
                let warningMessage = `Are you sure you want to delete instructor "${instructor.firstName} ${instructor.lastName}"?`;
                
                if (courses.length > 0) {
                    warningMessage += `\n\n⚠️ CASCADE DELETE WARNING:\n\nThis instructor teaches ${courses.length} course(s):\n`;
                    courses.slice(0, 5).forEach(c => {
                        warningMessage += `\n• ${c.courseCode}: ${c.courseName}`;
                    });
                    if (courses.length > 5) {
                        warningMessage += `\n... and ${courses.length - 5} more`;
                    }
                    warningMessage += `\n\nThese courses will have no instructor assigned.`;
                }
                
                MessageBox.warning(warningMessage, {
                    title: "Confirm Delete",
                    actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.DELETE,
                    onClose: async (sAction) => {
                        if (sAction === MessageBox.Action.DELETE) {
                            await this._deleteInstructor(instructor.ID);
                        }
                    }
                });
                
            } catch (error) {
                console.error("Error checking cascade effects:", error);
                MessageBox.error("Failed to check related records. Please try again.");
            }
        },
        
        _deleteInstructor: async function(instructorId) {
            try {
                const token = await window.AuthService.getToken();
                const response = await fetch(`/admin/Instructors(${instructorId})`, {
                    method: 'DELETE',
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                MessageToast.show("Instructor deleted successfully");
                this.getView().getModel().refresh();
                
            } catch (error) {
                console.error("Failed to delete instructor:", error);
                MessageBox.error("Failed to delete instructor. Please try again.");
            }
        },

        // ==================== COURSE CRUD ====================
        
        onAddCourse: async function() {
            await this._loadDepartments();
            await this._loadInstructorsForDropdown();
            
            const oDialogModel = new JSONModel({
                title: "Add New Course",
                mode: "create",
                courseCode: "",
                courseName: "",
                description: "",
                ects: 6,
                semester: "Fall 2025",
                quota: 30,
                enrolled: 0,
                isActive: true,
                department_ID: null,
                instructor_ID: null
            });
            
            this._openCourseDialog(oDialogModel);
        },
        
        onEditCourse: async function(oEvent) {
            const oItem = oEvent.getSource().getParent().getParent();
            const oContext = oItem.getBindingContext("courses");
            const course = oContext.getObject();
            
            await this._loadDepartments();
            await this._loadInstructorsForDropdown();
            
            const oDialogModel = new JSONModel({
                title: "Edit Course",
                mode: "edit",
                ID: course.ID,
                courseCode: course.courseCode,
                courseName: course.courseName,
                description: course.description,
                ects: course.ects,
                semester: course.semester,
                quota: course.quota,
                enrolled: course.enrolled,
                isActive: course.isActive,
                department_ID: course.department_ID,
                instructor_ID: course.instructor_ID
            });
            
            this._openCourseDialog(oDialogModel);
        },
        
        _openCourseDialog: async function(oDialogModel) {
            if (!this._courseDialog) {
                this._courseDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.view.CourseDialog",
                    controller: this
                });
                this.getView().addDependent(this._courseDialog);
            }
            
            this._courseDialog.setModel(oDialogModel, "dialogModel");
            
            // Set departments model - ensure it exists
            if (this._departmentsModel) {
                this._courseDialog.setModel(this._departmentsModel, "departments");
            } else {
                console.error("Departments model not loaded!");
            }
            
            // Set instructors model - ensure it exists
            if (this._instructorsModel) {
                this._courseDialog.setModel(this._instructorsModel, "instructors");
            } else {
                console.error("Instructors model not loaded!");
            }
            
            this._courseDialog.open();
        },
        
        onCourseDepartmentChange: async function(oEvent) {
            const selectedDeptId = oEvent.getParameter("selectedItem").getKey();
            const oDialogModel = this._courseDialog.getModel("dialogModel");
            
            if (oDialogModel.getProperty("/mode") === "create") {
                // Generate course code for the selected department
                const courseCode = await this._generateNextCourseCode(selectedDeptId);
                oDialogModel.setProperty("/courseCode", courseCode);
            }
        },
        
        _generateNextCourseCode: async function(departmentId) {
            try {
                const token = await window.AuthService.getToken();
                
                // Get department prefix
                const deptResponse = await fetch(`/admin/Departments(${departmentId})`, {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                if (!deptResponse.ok) {
                    throw new Error("Failed to fetch department");
                }
                
                const dept = await deptResponse.json();
                const deptName = dept.departmentName;
                
                // Map department names to prefixes
                const prefixMap = {
                    "Computer Science": "CS",
                    "Business Administration": "BA",
                    "Mathematics": "MATH",
                    "Psychology": "PSY",
                    "Mechanical Engineering": "ME"
                };
                
                const prefix = prefixMap[deptName] || deptName.substring(0, 3).toUpperCase();
                
                // Get last course code for this department
                const coursesResponse = await fetch(`/admin/Courses?$filter=department_ID eq ${departmentId}&$orderby=courseCode desc&$top=1`, {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                if (!coursesResponse.ok) {
                    throw new Error("Failed to fetch courses");
                }
                
                const data = await coursesResponse.json();
                
                if (data.value && data.value.length > 0) {
                    const lastCourseCode = data.value[0].courseCode;
                    // Extract number from CS101, BA201, etc.
                    const match = lastCourseCode.match(/\d+$/);
                    if (match) {
                        const nextNumber = parseInt(match[0]) + 1;
                        return `${prefix}${nextNumber}`;
                    }
                }
                
                // Default first course for department
                return `${prefix}101`;
                
            } catch (error) {
                console.error("Failed to generate course code:", error);
                return "COURSE101";
            }
        },
        
        onSaveCourse: async function() {
            const oDialogModel = this._courseDialog.getModel("dialogModel");
            const data = oDialogModel.getData();
            
            // Validation
            if (!data.courseCode || !data.courseName || !data.department_ID || !data.instructor_ID) {
                MessageBox.error("Please fill in all required fields");
                return;
            }
            
            try {
                const token = await window.AuthService.getToken();
                const url = data.mode === "create" ? "/admin/Courses" : `/admin/Courses(${data.ID})`;
                const method = data.mode === "create" ? "POST" : "PATCH";
                
                const payload = {
                    courseCode: data.courseCode,
                    courseName: data.courseName,
                    description: data.description || "",
                    ects: parseInt(data.ects),
                    semester: data.semester,
                    quota: parseInt(data.quota),
                    enrolled: data.mode === "create" ? 0 : parseInt(data.enrolled),
                    isActive: data.isActive,
                    department_ID: parseInt(data.department_ID),
                    instructor_ID: parseInt(data.instructor_ID)
                };
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                MessageToast.show(data.mode === "create" ? "Course created successfully" : "Course updated successfully");
                this._courseDialog.close();
                this.getView().getModel().refresh();
                
            } catch (error) {
                console.error("Failed to save course:", error);
                MessageBox.error("Failed to save course. Please try again.");
            }
        },
        
        onDeleteCourse: async function(oEvent) {
            const oItem = oEvent.getSource().getParent().getParent();
            const oContext = oItem.getBindingContext("courses");
            const course = oContext.getObject();
            
            try {
                // Check for cascade effects
                const token = await window.AuthService.getToken();
                const enrollmentsResponse = await fetch(`/admin/Enrollments?$filter=course_ID eq ${course.ID}&$expand=student`, {
                    headers: { "Authorization": "Bearer " + token }
                });
                
                if (!enrollmentsResponse.ok) {
                    throw new Error("Failed to check enrollments");
                }
                
                const enrollmentsData = await enrollmentsResponse.json();
                const enrollments = enrollmentsData.value || [];
                
                let warningMessage = `Are you sure you want to delete course "${course.courseCode}: ${course.courseName}"?`;
                
                if (enrollments.length > 0) {
                    warningMessage += `\n\n⚠️ CASCADE DELETE WARNING:\n\nThis will also delete ${enrollments.length} enrollment(s):\n`;
                    
                    const statusCounts = {};
                    enrollments.forEach(e => {
                        statusCounts[e.status] = (statusCounts[e.status] || 0) + 1;
                    });
                    
                    Object.keys(statusCounts).forEach(status => {
                        warningMessage += `\n• ${statusCounts[status]} ${status} enrollment(s)`;
                    });
                    
                    warningMessage += `\n\nAffected students:\n`;
                    enrollments.slice(0, 5).forEach(e => {
                        warningMessage += `\n• ${e.student?.firstName || ''} ${e.student?.lastName || 'Unknown'}`;
                    });
                    if (enrollments.length > 5) {
                        warningMessage += `\n... and ${enrollments.length - 5} more`;
                    }
                }
                
                MessageBox.warning(warningMessage, {
                    title: "Confirm Delete",
                    actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.DELETE,
                    onClose: async (sAction) => {
                        if (sAction === MessageBox.Action.DELETE) {
                            await this._deleteCourse(course.ID);
                        }
                    }
                });
                
            } catch (error) {
                console.error("Error checking cascade effects:", error);
                MessageBox.error("Failed to check related records. Please try again.");
            }
        },
        
        _deleteCourse: async function(courseId) {
            try {
                const token = await window.AuthService.getToken();
                const response = await fetch(`/admin/Courses(${courseId})`, {
                    method: 'DELETE',
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                MessageToast.show("Course deleted successfully");
                this.getView().getModel().refresh();
                
            } catch (error) {
                console.error("Failed to delete course:", error);
                MessageBox.error("Failed to delete course. Please try again.");
            }
        },
        
        // ==================== ENROLLMENT CRUD ====================
        
        onAddEnrollment: async function() {
            // Load students and courses
            await this._loadStudentsForEnrollment();
            await this._loadCoursesForEnrollment();
            
            const oDialogModel = new JSONModel({
                student_ID: null,
                course_ID: null,
                status: "ENROLLED",
                grade: null,
                studentEctsInfo: "Select a student to see ECTS information",
                courseCapacityInfo: "Select a course to see capacity information",
                validationMessage: "",
                validationType: "Information",
                showValidation: false,
                canEnroll: false,
                selectedStudentData: null,
                selectedCourseData: null
            });
            
            this._openAddEnrollmentDialog(oDialogModel);
        },
        
        _loadStudentsForEnrollment: async function() {
            try {
                const token = await window.AuthService.getToken();
                const response = await fetch("/admin/Students?$expand=department", {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                if (!response.ok) {
                    throw new Error("Failed to load students");
                }
                
                const data = await response.json();
                this._studentsModel = new JSONModel(data.value);
                
            } catch (error) {
                console.error("Failed to load students:", error);
                MessageBox.error("Failed to load students");
            }
        },
        
        _loadCoursesForEnrollment: async function() {
            try {
                const token = await window.AuthService.getToken();
                const response = await fetch("/admin/Courses?$expand=department,instructor&$filter=isActive eq true", {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                if (!response.ok) {
                    throw new Error("Failed to load courses");
                }
                
                const data = await response.json();
                this._coursesModel = new JSONModel(data.value);
                
            } catch (error) {
                console.error("Failed to load courses:", error);
                MessageBox.error("Failed to load courses");
            }
        },
        
        _openAddEnrollmentDialog: async function(oDialogModel) {
            if (!this._addEnrollmentDialog) {
                this._addEnrollmentDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.view.AddEnrollmentDialog",
                    controller: this
                });
                this.getView().addDependent(this._addEnrollmentDialog);
            }
            
            this._addEnrollmentDialog.setModel(oDialogModel, "dialogModel");
            
            // Set students and courses models
            if (this._studentsModel) {
                this._addEnrollmentDialog.setModel(this._studentsModel, "students");
            }
            if (this._coursesModel) {
                this._addEnrollmentDialog.setModel(this._coursesModel, "courses");
            }
            
            this._addEnrollmentDialog.open();
        },
        
        onEnrollmentStudentChange: async function(oEvent) {
            const selectedKey = oEvent.getParameter("selectedItem").getKey();
            const oDialogModel = this._addEnrollmentDialog.getModel("dialogModel");
            
            if (!selectedKey) {
                oDialogModel.setProperty("/studentEctsInfo", "Select a student to see ECTS information");
                oDialogModel.setProperty("/selectedStudentData", null);
                this._validateEnrollment();
                return;
            }
            
            try {
                const token = await window.AuthService.getToken();
                
                // Get student details
                const studentResponse = await fetch(`/admin/Students(${selectedKey})`, {
                    headers: { "Authorization": "Bearer " + token }
                });
                
                if (!studentResponse.ok) {
                    throw new Error("Failed to fetch student details");
                }
                
                const student = await studentResponse.json();
                
                // Get student's current enrollments to calculate used ECTS
                const enrollmentsResponse = await fetch(`/admin/Enrollments?$filter=student_ID eq ${selectedKey} and status eq 'ENROLLED'&$expand=course`, {
                    headers: { "Authorization": "Bearer " + token }
                });
                
                if (!enrollmentsResponse.ok) {
                    throw new Error("Failed to fetch student enrollments");
                }
                
                const enrollmentsData = await enrollmentsResponse.json();
                const enrollments = enrollmentsData.value || [];
                
                // Calculate used ECTS
                const usedEcts = enrollments.reduce((sum, e) => sum + (e.course?.ects || 0), 0);
                const availableEcts = student.ectsLimit - usedEcts;
                
                oDialogModel.setProperty("/studentEctsInfo", 
                    `ECTS: ${usedEcts} / ${student.ectsLimit} used (${availableEcts} available)`);
                oDialogModel.setProperty("/selectedStudentData", {
                    ...student,
                    usedEcts: usedEcts,
                    availableEcts: availableEcts
                });
                
                this._validateEnrollment();
                
            } catch (error) {
                console.error("Failed to load student info:", error);
                MessageBox.error("Failed to load student information");
            }
        },
        
        onEnrollmentCourseChange: async function(oEvent) {
            const selectedKey = oEvent.getParameter("selectedItem").getKey();
            const oDialogModel = this._addEnrollmentDialog.getModel("dialogModel");
            
            if (!selectedKey) {
                oDialogModel.setProperty("/courseCapacityInfo", "Select a course to see capacity information");
                oDialogModel.setProperty("/selectedCourseData", null);
                this._validateEnrollment();
                return;
            }
            
            try {
                const token = await window.AuthService.getToken();
                
                // Get course details
                const courseResponse = await fetch(`/admin/Courses(${selectedKey})`, {
                    headers: { "Authorization": "Bearer " + token }
                });
                
                if (!courseResponse.ok) {
                    throw new Error("Failed to fetch course details");
                }
                
                const course = await courseResponse.json();
                const availableSeats = course.quota - course.enrolled;
                
                oDialogModel.setProperty("/courseCapacityInfo", 
                    `Capacity: ${course.enrolled} / ${course.quota} enrolled (${availableSeats} seats available)`);
                oDialogModel.setProperty("/selectedCourseData", course);
                
                this._validateEnrollment();
                
            } catch (error) {
                console.error("Failed to load course info:", error);
                MessageBox.error("Failed to load course information");
            }
        },
        
        _validateEnrollment: function() {
            const oDialogModel = this._addEnrollmentDialog.getModel("dialogModel");
            const studentData = oDialogModel.getProperty("/selectedStudentData");
            const courseData = oDialogModel.getProperty("/selectedCourseData");
            
            // Reset validation
            oDialogModel.setProperty("/showValidation", false);
            oDialogModel.setProperty("/canEnroll", false);
            
            if (!studentData || !courseData) {
                return; // Not enough data to validate
            }
            
            // Check if course is full
            if (courseData.enrolled >= courseData.quota) {
                oDialogModel.setProperty("/validationMessage", "Course is full! No seats available.");
                oDialogModel.setProperty("/validationType", "Error");
                oDialogModel.setProperty("/showValidation", true);
                return;
            }
            
            // Check if student has enough ECTS
            if (studentData.availableEcts < courseData.ects) {
                oDialogModel.setProperty("/validationMessage", 
                    `Student doesn't have enough ECTS! Needs ${courseData.ects} ECTS but only has ${studentData.availableEcts} available.`);
                oDialogModel.setProperty("/validationType", "Error");
                oDialogModel.setProperty("/showValidation", true);
                return;
            }
            
            // Check if student is already enrolled in this course
            this._checkDuplicateEnrollment(studentData.ID, courseData.ID);
        },
        
        _checkDuplicateEnrollment: async function(studentId, courseId) {
            const oDialogModel = this._addEnrollmentDialog.getModel("dialogModel");
            
            try {
                const token = await window.AuthService.getToken();
                const response = await fetch(`/admin/Enrollments?$filter=student_ID eq ${studentId} and course_ID eq ${courseId}`, {
                    headers: { "Authorization": "Bearer " + token }
                });
                
                if (!response.ok) {
                    throw new Error("Failed to check existing enrollments");
                }
                
                const data = await response.json();
                
                if (data.value && data.value.length > 0) {
                    oDialogModel.setProperty("/validationMessage", 
                        "Student is already enrolled in this course!");
                    oDialogModel.setProperty("/validationType", "Error");
                    oDialogModel.setProperty("/showValidation", true);
                    oDialogModel.setProperty("/canEnroll", false);
                } else {
                    // All validations passed
                    oDialogModel.setProperty("/validationMessage", 
                        "All checks passed. Ready to enroll!");
                    oDialogModel.setProperty("/validationType", "Success");
                    oDialogModel.setProperty("/showValidation", true);
                    oDialogModel.setProperty("/canEnroll", true);
                }
                
            } catch (error) {
                console.error("Failed to check duplicate enrollment:", error);
            }
        },
        
        onEnrollmentGradeChange: function(oEvent) {
            const oDialogModel = this._addEnrollmentDialog.getModel("dialogModel");
            const gradeValue = oEvent.getParameter("value");
            
            // Update status based on grade
            if (!gradeValue || gradeValue.trim() === "") {
                // No grade = ENROLLED status
                oDialogModel.setProperty("/status", "ENROLLED");
            } else {
                const grade = parseFloat(gradeValue);
                
                if (isNaN(grade)) {
                    oDialogModel.setProperty("/status", "ENROLLED");
                    return;
                }
                
                // Determine status based on grade (same logic as instructor)
                let status;
                if (grade >= 18) {
                    status = "EXCELLENT";
                } else if (grade >= 16) {
                    status = "VERY_GOOD";
                } else if (grade >= 14) {
                    status = "GOOD";
                } else if (grade >= 12) {
                    status = "SATISFACTORY";
                } else if (grade >= 10) {
                    status = "PASSED";
                } else {
                    status = "FAILED";
                }
                
                oDialogModel.setProperty("/status", status);
            }
        },
        
        onSaveNewEnrollment: async function() {
            const oDialogModel = this._addEnrollmentDialog.getModel("dialogModel");
            const data = oDialogModel.getData();
            
            // Validation
            if (!data.student_ID || !data.course_ID) {
                MessageBox.error("Please select both student and course");
                return;
            }
            
            if (!data.canEnroll) {
                MessageBox.error("Cannot enroll. Please check validation messages.");
                return;
            }
            
            // Validate and compute status based on grade
            let finalStatus = "ENROLLED";
            let finalGrade = null;
            
            if (data.grade !== null && data.grade !== undefined && data.grade !== "") {
                const grade = parseFloat(data.grade);
                if (isNaN(grade)) {
                    MessageBox.error("Grade must be a valid number");
                    return;
                }
                if (grade < 0 || grade > 20) {
                    MessageBox.error("Grade must be between 0 and 20");
                    return;
                }
                
                finalGrade = grade;
                
                // Determine status based on grade
                if (grade >= 18) {
                    finalStatus = "EXCELLENT";
                } else if (grade >= 16) {
                    finalStatus = "VERY_GOOD";
                } else if (grade >= 14) {
                    finalStatus = "GOOD";
                } else if (grade >= 12) {
                    finalStatus = "SATISFACTORY";
                } else if (grade >= 10) {
                    finalStatus = "PASSED";
                } else {
                    finalStatus = "FAILED";
                }
            }
            
            try {
                const token = await window.AuthService.getToken();
                
                const payload = {
                    student_ID: parseInt(data.student_ID),
                    course_ID: parseInt(data.course_ID),
                    status: finalStatus,
                    enrollmentDate: new Date().toISOString()
                };
                
                // Only include grade if it has a value
                if (finalGrade !== null) {
                    payload.grade = finalGrade;
                }
                
                const response = await fetch("/admin/Enrollments", {
                    method: "POST",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                
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
                
                MessageToast.show(`Student enrolled successfully with status: ${finalStatus}`);
                this._addEnrollmentDialog.close();
                this.getView().getModel().refresh();
                
                // Refresh enrollments tab if it's loaded
                if (this._tabsLoaded.enrollments) {
                    this._loadEnrollments();
                }
                
            } catch (error) {
                console.error("Failed to create enrollment:", error);
                MessageBox.error(`Failed to create enrollment: ${error.message}`);
            }
        },
        
        onEditEnrollment: async function(oEvent) {
            const oItem = oEvent.getSource().getParent().getParent();
            const oContext = oItem.getBindingContext("enrollments");
            const enrollment = oContext.getObject();
            
            const studentName = `${enrollment.student?.firstName || ''} ${enrollment.student?.lastName || ''}`.trim();
            const courseName = enrollment.course?.courseName || 'Unknown Course';
            
            const oDialogModel = new JSONModel({
                title: "Edit Enrollment",
                ID: enrollment.ID,
                studentName: studentName,
                courseName: courseName,
                status: enrollment.status,
                grade: enrollment.grade,
                course_ID: enrollment.course_ID
            });
            
            this._openEnrollmentDialog(oDialogModel);
        },
        
        _openEnrollmentDialog: async function(oDialogModel) {
            if (!this._enrollmentDialog) {
                this._enrollmentDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "admin.view.EnrollmentDialog",
                    controller: this
                });
                this.getView().addDependent(this._enrollmentDialog);
            }
            
            this._enrollmentDialog.setModel(oDialogModel, "dialogModel");
            this._enrollmentDialog.open();
        },
        
        onSaveEnrollment: async function() {
            const oDialogModel = this._enrollmentDialog.getModel("dialogModel");
            const data = oDialogModel.getData();
            
            // Validate grade if provided
            if (data.grade !== null && data.grade !== undefined && data.grade !== "") {
                const grade = parseFloat(data.grade);
                if (isNaN(grade)) {
                    MessageBox.error("Grade must be a valid number");
                    return;
                }
                if (grade < 0 || grade > 20) {
                    MessageBox.error("Grade must be between 0 and 20");
                    return;
                }
            }
            
            try {
                const token = await window.AuthService.getToken();
                
                const payload = {};
                
                // Only include grade if it has a value
                // Status will be automatically set by the backend based on the grade
                if (data.grade !== null && data.grade !== undefined && data.grade !== "") {
                    payload.grade = parseFloat(data.grade);
                }
                
                const response = await fetch(`/admin/Enrollments(${data.ID})`, {
                    method: "PATCH",
                    headers: {
                        "Authorization": "Bearer " + token,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });
                
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
                
                MessageToast.show("Enrollment updated successfully. Status automatically set based on grade.");
                this._enrollmentDialog.close();
                this.getView().getModel().refresh();
                
                // Refresh enrollments tab if it's loaded
                if (this._tabsLoaded.enrollments) {
                    this._loadEnrollments();
                }
                
            } catch (error) {
                console.error("Failed to save enrollment:", error);
                MessageBox.error("Failed to save enrollment. Please try again.");
            }
        },
        
        onDeleteEnrollment: async function(oEvent) {
            const oItem = oEvent.getSource().getParent().getParent();
            const oContext = oItem.getBindingContext("enrollments");
            const enrollment = oContext.getObject();
            
            const studentName = `${enrollment.student?.firstName || ''} ${enrollment.student?.lastName || 'Unknown'}`;
            const courseName = enrollment.course?.courseName || 'Unknown Course';
            
            MessageBox.warning(
                `Are you sure you want to delete this enrollment?\n\nStudent: ${studentName}\nCourse: ${courseName}\nStatus: ${enrollment.status}`,
                {
                    title: "Confirm Delete",
                    actions: [MessageBox.Action.DELETE, MessageBox.Action.CANCEL],
                    emphasizedAction: MessageBox.Action.DELETE,
                    onClose: async (sAction) => {
                        if (sAction === MessageBox.Action.DELETE) {
                            await this._deleteEnrollment(enrollment.ID);
                        }
                    }
                }
            );
        },
        
        _deleteEnrollment: async function(enrollmentId) {
            try {
                const token = await window.AuthService.getToken();
                const response = await fetch(`/admin/Enrollments(${enrollmentId})`, {
                    method: 'DELETE',
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                MessageToast.show("Enrollment deleted successfully");
                
                // Refresh the OData model to update all data
                this.getView().getModel().refresh();
                
                // Refresh enrollments tab if loaded
                if (this._tabsLoaded.enrollments) {
                    this._loadEnrollments();
                }
                
                // Refresh courses tab if loaded (to update enrolled counts)
                if (this._tabsLoaded.courses) {
                    this._loadCourses();
                }
                
            } catch (error) {
                console.error("Failed to delete enrollment:", error);
                MessageBox.error("Failed to delete enrollment. Please try again.");
            }
        },

        // ==================== FORMATTER FUNCTIONS ====================
        
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

        formatActiveText: function (isActive) {
            return isActive ? "Active" : "Inactive";
        },

        formatActiveState: function (isActive) {
            return isActive ? "Success" : "None";
        },

        // ==================== HELPER METHODS ====================
        
        _loadDepartments: async function() {
            if (this._departmentsModel) {
                return; // Already loaded
            }
            
            try {
                const token = await window.AuthService.getToken();
                const response = await fetch("/admin/Departments", {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                if (!response.ok) {
                    throw new Error("Failed to load departments");
                }
                
                const data = await response.json();
                this._departmentsModel = new JSONModel(data.value);
                
            } catch (error) {
                console.error("Failed to load departments:", error);
                MessageBox.error("Failed to load departments");
            }
        },
        
        _loadInstructorsForDropdown: async function() {
            if (this._instructorsModel) {
                return; // Already loaded
            }
            
            try {
                const token = await window.AuthService.getToken();
                const response = await fetch("/admin/Instructors", {
                    headers: {
                        "Authorization": "Bearer " + token
                    }
                });
                
                if (!response.ok) {
                    throw new Error("Failed to load instructors");
                }
                
                const data = await response.json();
                this._instructorsModel = new JSONModel(data.value);
                
            } catch (error) {
                console.error("Failed to load instructors:", error);
                MessageBox.error("Failed to load instructors");
            }
        },
        
        onCancelDialog: function() {
            if (this._studentDialog && this._studentDialog.isOpen()) {
                this._studentDialog.close();
            }
            if (this._instructorDialog && this._instructorDialog.isOpen()) {
                this._instructorDialog.close();
            }
            if (this._courseDialog && this._courseDialog.isOpen()) {
                this._courseDialog.close();
            }
            if (this._enrollmentDialog && this._enrollmentDialog.isOpen()) {
                this._enrollmentDialog.close();
            }
            if (this._addEnrollmentDialog && this._addEnrollmentDialog.isOpen()) {
                this._addEnrollmentDialog.close();
            }
        },
        
        // ==================== ERROR HANDLING ====================
        
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
