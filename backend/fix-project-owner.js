const mongoose = require('mongoose');
const Project = require('./models/Project');
require('dotenv').config();

const myUserId = "69ce29fdfb32bdf5fdd7035e"; // Akhil

async function fixProject() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    
    const existing = await Project.findOne({});
    if (existing) {
      console.log(`Updating existing project "${existing.title}" to match user ${myUserId}`);
      existing.customerId = myUserId;
      await existing.save();
      console.log("Updated!");
    } else {
      console.log("No projects found to update.");
    }
    
    mongoose.connection.close();
  } catch (err) {
    console.error(err);
  }
}

fixProject();
