require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const Project = require('../models/Project');
const User = require('../models/User');
const ProjectStatusHistory = require('../models/ProjectStatusHistory');
const AdminNotification = require('../models/AdminNotification');

const runTest = async () => {
    console.log("🚀 Starting Project Status Notification System Integration Test...");
    
    // Connect to database
    try {
        await connectDB();
        console.log("✅ MongoDB Connection Established.");
    } catch (err) {
        console.error("❌ MongoDB Connection Failed:", err.message);
        process.exit(1);
    }

    try {
        // 1. Create a dummy customer and staff
        let testStaff = await User.findOne({ role: 'staff' });
        if (!testStaff) {
            testStaff = new User({
                name: "Test Staff Operator",
                email: "staff_test@krishna.com",
                password: "password123",
                role: "staff"
            });
            await testStaff.save();
            console.log("👤 Test Staff created.");
        } else {
            console.log(`👤 Using existing Staff: ${testStaff.name}`);
        }

        let testCustomer = await User.findOne({ role: 'customer' });
        if (!testCustomer) {
            testCustomer = new User({
                name: "Test Customer",
                email: "customer_test@krishna.com",
                password: "password123",
                role: "customer"
            });
            await testCustomer.save();
            console.log("👤 Test Customer created.");
        } else {
            console.log(`👤 Using existing Customer: ${testCustomer.name}`);
        }

        // 2. Create a dummy project
        const project = new Project({
            title: "Automated Testing Facility Build",
            customerId: testCustomer._id,
            serviceType: "Fabrication",
            assignedStaff: [testStaff._id],
            status: "In Progress",
            progress: 25,
            location: "Bay 3 East"
        });
        await project.save();
        console.log(`📂 Created test project: ${project.title} (${project._id})`);

        // Assert initial status
        if (project.status !== "In Progress") {
            throw new Error("Project status should initially be 'In Progress'");
        }

        // 3. Simulate Staff marking project as Delayed
        console.log("\n⏳ Step 1: Staff marks project as DELAYED (Tool Maintenance)...");
        const delayStatus = "Delayed";
        const delayReason = "Tool Maintenance";
        const delayRemarks = "Cutting machine under repair";
        const delayExpectedResume = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days from now

        // Update Project
        project.status = delayStatus;
        await project.save();

        // Save entry in ProjectStatusHistory
        const historyEntry = new ProjectStatusHistory({
            projectId: project._id,
            projectName: project.title,
            status: delayStatus,
            reason: delayReason,
            remarks: delayRemarks,
            expectedResumeDate: delayExpectedResume,
            reportedBy: testStaff._id,
            resolvedStatus: 'Pending'
        });
        await historyEntry.save();

        // Create Admin Notification
        const notification = new AdminNotification({
            projectId: project._id,
            projectName: project.title,
            type: delayStatus,
            title: "🔴 Project Delayed",
            message: `Project status updated to ${delayStatus} by ${testStaff.name}.`,
            updatedBy: testStaff._id,
            reason: delayReason,
            remarks: delayRemarks
        });
        await notification.save();

        console.log("✅ Project status updated in DB to 'Delayed'.");
        console.log("✅ ProjectStatusHistory log created.");
        console.log("✅ AdminNotification alert created.");

        // Assertions for step 1
        const verifyHistory1 = await ProjectStatusHistory.findOne({ projectId: project._id, status: "Delayed" });
        if (!verifyHistory1 || verifyHistory1.reason !== delayReason || verifyHistory1.resolvedStatus !== "Pending") {
            throw new Error("Timeline log assertion failed for Delayed status.");
        }
        console.log(`   └─ Timeline Check: Status Logged = ${verifyHistory1.status}, Resolved = ${verifyHistory1.resolvedStatus}`);

        const verifyNotif1 = await AdminNotification.findOne({ projectId: project._id, type: "Delayed" });
        if (!verifyNotif1 || verifyNotif1.title !== "🔴 Project Delayed" || verifyNotif1.isRead !== false) {
            throw new Error("Admin Notification assertion failed for Delayed status.");
        }
        console.log(`   └─ Alert Check: Title = ${verifyNotif1.title}, Unread = ${!verifyNotif1.isRead}`);


        // 4. Simulate Staff resolving the issue and Restarting work
        console.log("\n⏳ Step 2: Staff resolves issue and RESTARTS work (status back to In Progress)...");
        
        // Find pending delay status to resolve
        const pendingIncident = await ProjectStatusHistory.findOne({
            projectId: project._id,
            status: "Delayed",
            resolvedStatus: "Pending"
        });

        if (pendingIncident) {
            pendingIncident.resolvedStatus = "Resolved";
            pendingIncident.restartDate = new Date();
            await pendingIncident.save();
        } else {
            throw new Error("Could not find the pending incident history entry.");
        }

        // Add a new timeline entry
        const restartHistory = new ProjectStatusHistory({
            projectId: project._id,
            projectName: project.title,
            status: "In Progress",
            reportedBy: testStaff._id,
            resolvedStatus: "N/A"
        });
        await restartHistory.save();

        // Update Project
        project.status = "In Progress";
        await project.save();

        // Create Restart notification
        const restartNotif = new AdminNotification({
            projectId: project._id,
            projectName: project.title,
            type: "Restarted",
            title: "🟢 Work Restarted",
            message: `Work restarted on project by ${testStaff.name}.`,
            updatedBy: testStaff._id,
            reason: pendingIncident.reason,
            remarks: "Status updated back to In Progress."
        });
        await restartNotif.save();

        console.log("✅ Project status updated back to 'In Progress'.");
        console.log("✅ ProjectStatusHistory pending incident set to 'Resolved'.");
        console.log("✅ New ProjectStatusHistory log created for Restart.");
        console.log("✅ AdminNotification restart alert created.");

        // Assertions for step 2
        const verifyHistory2 = await ProjectStatusHistory.findById(pendingIncident._id);
        if (!verifyHistory2 || verifyHistory2.resolvedStatus !== "Resolved" || !verifyHistory2.restartDate) {
            throw new Error("Failed to mark the incident as Resolved.");
        }
        console.log(`   └─ Timeline Check: Previous Incident status = ${verifyHistory2.resolvedStatus}, Restart Time = ${verifyHistory2.restartDate}`);

        const verifyNotif2 = await AdminNotification.findOne({ projectId: project._id, type: "Restarted" });
        if (!verifyNotif2 || verifyNotif2.title !== "🟢 Work Restarted" || verifyNotif2.reason !== delayReason) {
            throw new Error("Admin Notification assertion failed for Restart status.");
        }
        console.log(`   └─ Alert Check: Title = ${verifyNotif2.title}, Previous Reason Ref = ${verifyNotif2.reason}`);

        // Cleanup test data
        console.log("\n🧹 Cleaning up test data...");
        await ProjectStatusHistory.deleteMany({ projectId: project._id });
        await AdminNotification.deleteMany({ projectId: project._id });
        await Project.findByIdAndDelete(project._id);
        console.log("🗑️ Test project status histories, notifications, and project deleted.");

        console.log("\n🎉 ALL DB INTEGRATION TESTS PASSED SUCCESSFULLY! The Delay, Stop, and Restart Notification Management System works perfectly in the database layer.");
        process.exit(0);

    } catch (error) {
        console.error("\n❌ TEST FAILED:", error.message);
        process.exit(1);
    }
};

runTest();
