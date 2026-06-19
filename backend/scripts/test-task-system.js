require('dotenv').config();
const mongoose = require('mongoose');
const Task = require('../models/Task');
const User = require('../models/User');
const Project = require('../models/Project');

const testTaskSystem = async () => {
    try {
        console.log("🚀 Initializing Task System Verification...");
        const dbUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/krishna-erp';
        await mongoose.connect(dbUri);
        console.log("✅ Connected to database: " + dbUri);

        // 1. Get or create test users & projects
        let admin = await User.findOne({ role: 'admin' });
        if (!admin) {
            console.log("Creating dummy admin...");
            admin = await User.create({
                staff_id: 'TEST-ADM-999',
                name: 'Test Administrator',
                phone: '+91 00000 00000',
                email: 'test_admin@krishnaengg.com',
                department: 'IT',
                designation: 'Test Admin',
                username: 'testadmin',
                password: 'hashedpassword',
                role: 'admin',
                status: 'active'
            });
        }

        let staff = await User.findOne({ role: 'staff' });
        if (!staff) {
            console.log("Creating dummy staff...");
            staff = await User.create({
                staff_id: 'TEST-STF-999',
                name: 'Test Staff Member',
                phone: '+91 11111 11111',
                email: 'test_staff@krishnaengg.com',
                department: 'Engineering',
                designation: 'Field Officer',
                username: 'teststaff',
                password: 'hashedpassword',
                role: 'staff',
                status: 'active'
            });
        }

        let customer = await User.findOne({ role: 'customer' });
        if (!customer) {
            console.log("Creating dummy customer...");
            customer = await User.create({
                name: 'Test Client Customer',
                phone: '+91 22222 22222',
                email: 'test_customer@acme.com',
                username: 'testcustomer',
                password: 'hashedpassword',
                role: 'customer'
            });
        }

        let project = await Project.findOne();
        if (!project) {
            console.log("Creating dummy project...");
            project = await Project.create({
                title: 'Test Operational Project',
                description: 'For verifying the task and delay modules.',
                customerId: customer._id,
                serviceType: 'Structural Design',
                status: 'In Progress'
            });
        }

        // Clean up previous test tasks to keep it fresh
        await Task.deleteMany({ title: /\[Test Task\]/ });

        // 2. Create Task with expanded schema
        console.log("\n📦 Step 1: Creating a test task...");
        const testTask = await Task.create({
            title: '[Test Task] Install Solar Panel Frames',
            description: 'Install structural frame components on roof unit 4B.',
            projectId: project._id,
            projectName: project.title,
            priority: 'High',
            status: 'Pending',
            assignedStaff: [staff._id],
            assignedBy: admin._id,
            startDate: new Date(),
            dueDate: new Date(Date.now() + 86400000 * 3), // 3 days from now
            estimatedHours: 12,
            remarks: 'Requires safety harness and gloves.',
            attachments: ['https://example.com/reference-doc.pdf'],
            progressPercentage: 0,
            workNotes: [],
            workPhotos: []
        });

        console.log("✅ Task created successfully!");
        console.log("   ID:", testTask._id);
        console.log("   Assigned Staff IDs:", testTask.assignedStaff.map(id => id.toString()));
        console.log("   Project Name:", testTask.projectName);
        console.log("   Priority:", testTask.priority);
        console.log("   Status:", testTask.status);

        // 3. Update Progress (Staff updates status to In Progress, sets 25% progress, adds note/photo)
        console.log("\n⚡ Step 2: Simulating Staff progress update...");
        
        testTask.status = 'In Progress';
        testTask.progressPercentage = 25;
        testTask.workNotes.push({
            note: 'Operational update: Started drilling alignment holes.',
            staffId: staff._id,
            staffName: staff.name,
            createdAt: new Date()
        });
        testTask.workPhotos.push('https://example.com/uploaded-photo-1.jpg');
        await testTask.save();

        let updatedTask = await Task.findById(testTask._id);
        console.log("✅ Progress updated successfully!");
        console.log("   New Status:", updatedTask.status);
        console.log("   New Progress Percentage:", updatedTask.progressPercentage);
        console.log("   Work Notes Count:", updatedTask.workNotes.length);
        console.log("   First Note:", updatedTask.workNotes[0].note);
        console.log("   Work Photos Count:", updatedTask.workPhotos.length);

        if (updatedTask.status !== 'In Progress' || updatedTask.progressPercentage !== 25) {
            throw new Error("Progress update assertions failed!");
        }

        // 4. Report Delay (Staff hits delay route)
        console.log("\n🚨 Step 3: Simulating Delay incident logging...");
        updatedTask.status = 'Delayed';
        updatedTask.delayReason = 'Material Shortage';
        updatedTask.delayRemarks = 'Waiting for 10mm steel bolts from warehouse.';
        updatedTask.workNotes.push({
            note: `[Delay Reported] Reason: Material Shortage. Notes: Waiting for 10mm steel bolts from warehouse.`,
            staffId: staff._id,
            staffName: staff.name,
            createdAt: new Date()
        });
        await updatedTask.save();

        let delayedTask = await Task.findById(testTask._id);
        console.log("✅ Delay reported and logged successfully!");
        console.log("   New Status:", delayedTask.status);
        console.log("   Delay Reason:", delayedTask.delayReason);
        console.log("   Delay Remarks:", delayedTask.delayRemarks);
        console.log("   Updated Notes Count:", delayedTask.workNotes.length);
        console.log("   Latest Note:", delayedTask.workNotes[delayedTask.workNotes.length - 1].note);

        if (delayedTask.status !== 'Delayed' || delayedTask.delayReason !== 'Material Shortage') {
            throw new Error("Delay report assertions failed!");
        }

        // 5. Complete Task (Set to Completed / 100%)
        console.log("\n🏁 Step 4: Simulating completion of task...");
        delayedTask.status = 'Completed';
        delayedTask.progressPercentage = 100;
        delayedTask.workNotes.push({
            note: 'Operational update: Framework completed and inspected.',
            staffId: staff._id,
            staffName: staff.name,
            createdAt: new Date()
        });
        await delayedTask.save();

        let finalTask = await Task.findById(testTask._id);
        console.log("✅ Task completed successfully!");
        console.log("   Final Status:", finalTask.status);
        console.log("   Final Progress Percentage:", finalTask.progressPercentage);
        console.log("   Final Notes Count:", finalTask.workNotes.length);

        if (finalTask.status !== 'Completed' || finalTask.progressPercentage !== 100) {
            throw new Error("Task completion assertions failed!");
        }

        console.log("\n🎉 ALL TASKS CHECKLIST VERIFICATION PASSED SUCCESSFULLY!");
        process.exit(0);
    } catch (err) {
        console.error("\n❌ VERIFICATION TEST FAILED:", err);
        process.exit(1);
    }
};

testTaskSystem();
