require('dotenv').config();
const mongoose = require('mongoose');
const BlogPost = require('../models/BlogPost');

const readyMadeBlogs = [
    {
        title: 'Advanced Techniques in Industrial TIG Welding',
        content: 'Structural TIG welding (Tungsten Inert Gas) is the pinnacle of engineering precision. At Krishna Engineering, we utilize specialized tungsten alloys to create joints that exceed international load-bearing standards. This process requires a controlled atmospheric environment to prevent oxidation in heavy gauge steel. Success in this field depends on steady-hand electrode movement combined with foot-controlled current modulation.',
        excerpt: 'The ultimate guide to structural integrity in high-pressure welding environments.',
        category: 'Welding',
        authorName: 'Chief Field Engineer',
        image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=800'
    },
    {
        title: 'Structural Auditor Protocols for 2026',
        content: 'Modern industrial buildings require frequent structural audits to ensure the molecular integrity of the steel hasn\'t been compromised by environmental stress. Our auditing process involves ultrasonic thickness gauging and non-destructive testing (NDT). We look for thermal expansion differentials in large-span trusses and verify torque levels on all primary structural bolts. Regular audits can extend the lifespan of a warehouse by up to 25 years.',
        excerpt: 'Standard operating procedures for maintaining zero-failure industrial complexes.',
        category: 'Structural',
        authorName: 'Audit Division',
        image: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?q=80&w=800'
    },
    {
        title: 'The Evolution of Industrial Roofing Systems',
        content: 'Moving beyond simple corrugated sheets, modern industrial roofing now integrates thermal barrier layers and aerodynamic wind-resistant fasteners. We use 0.50mm to 0.60mm TCT (Total Coated Thickness) Galvalume materials with high-tensile strength. The installation requires precision lap-joint sealing and heavy-duty drilling into the purlins to withstand high-velocity wind events common in tropical climates.',
        excerpt: 'How Galvalume technology is redefining durability for large-scale manufacturing plants.',
        category: 'Maintenance',
        authorName: 'Roofing Lead',
        image: 'https://images.pexels.com/photos/9327076/pexels-photo-9327076.jpeg?auto=compress&cs=tinysrgb&w=800'
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to Database for Seeding...');
        
        await BlogPost.deleteMany({});
        await BlogPost.insertMany(readyMadeBlogs);
        console.log('Successfully synchronized 3 Industry Intel Reports with valid industrial photos.');
        
        mongoose.connection.close();
    } catch (error) {
        console.error('Seeding Protocol Failure:', error);
        process.exit(1);
    }
};

seedDB();
