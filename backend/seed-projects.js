const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

const projectsToCreate = [
  {
    title: "Heavy Structure Fabrication",
    customerId: "69ce29fdfb32bdf5fdd7035e", // Akhil
    serviceType: "Fabrication",
    status: "in-progress",
    progress: 45,
    budget: 150000
  },
  {
    title: "Commercial Building Welding",
    customerId: "69ce29fdfb32bdf5fdd7035e", // Akhil
    serviceType: "Welding",
    status: "pending",
    progress: 0,
    budget: 85000
  },
  {
    title: "Industrial Conveyor Repair",
    customerId: "69c8cbebaa4c669732be9d9e", // Rohini
    serviceType: "Repair",
    status: "completed",
    progress: 100,
    budget: 42000
  }
];

async function seedProjects() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB...');
    
    // Check existing projects
    const count = await Project.countDocuments();
    console.log(`Current project count: ${count}`);
    
    if (count === 0) {
      console.log('Seeding projects...');
      await Project.insertMany(projectsToCreate);
      console.log('Projects seeded successfully.');
    } else {
      console.log('Projects already exist. No seeding performed.');
    }
    
    mongoose.connection.close();
  } catch (err) {
    console.error('Error seeding projects:', err);
  }
}

seedProjects();
