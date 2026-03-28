require('dotenv').config();
const mongoose = require('mongoose');
const BlogPost = require('../models/BlogPost');

const readyMadeBlogs = [
    {
        title: 'Advanced Techniques in Industrial TIG Welding',
        content: 'Structural TIG welding (Tungsten Inert Gas) is the pinnacle of engineering precision. At Krishna Engineering, we utilize specialized tungsten alloys to create joints that exceed international load-bearing standards. This process requires a controlled atmospheric environment to prevent oxidation in heavy gauge steel.',
        excerpt: 'The ultimate guide to structural integrity in high-pressure welding environments.',
        category: 'Welding',
        authorName: 'Chief Field Engineer',
        image: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=800'
    },
    {
        title: 'Structural Auditor Protocols for 2026',
        content: 'Modern industrial buildings require frequent structural audits to ensure the molecular integrity of the steel hasn\'t been compromised by environmental stress. Our auditing process involves ultrasonic thickness gauging and non-destructive testing (NDT).',
        excerpt: 'Standard operating procedures for maintaining zero-failure industrial complexes.',
        category: 'Structural',
        authorName: 'Audit Division',
        image: 'https://images.unsplash.com/photo-1513828583688-c52646db42da?q=80&w=800'
    },
    {
        title: 'The Evolution of Industrial Roofing Systems',
        content: 'Moving beyond simple corrugated sheets, modern industrial roofing now integrates thermal barrier layers and aerodynamic wind-resistant fasteners. We use 0.50mm to 0.60mm TCT (Total Coated Thickness) Galvalume materials.',
        excerpt: 'How Galvalume technology is redefining durability for large-scale manufacturing plants.',
        category: 'Maintenance',
        authorName: 'Roofing Lead',
        image: 'https://images.pexels.com/photos/9327076/pexels-photo-9327076.jpeg?auto=compress&cs=tinysrgb&w=800'
    },
    {
        title: 'Heavy Duty Staircase Engineering for Safety',
        content: 'Industrial staircases aren\'t just about moving people between floors; they are critical safety components. We design our staircases to sustain extreme loads and include non-slip grating patterns suitable for oily or wet factory floors.',
        excerpt: 'Designing fire escapes and industrial walkways that save lives.',
        category: 'Fabrication',
        authorName: 'Structural Team',
        image: 'https://images.unsplash.com/photo-1621259182978-f09e5e2ca1ff?q=80&w=800'
    },
    {
        title: 'Cold Storage Truss Solutions',
        content: 'Building for sub-zero temperatures requires steel that doesn\'t become brittle. Our cold storage truss solutions use specially treated alloys that maintain structural ductility even at -40 degrees Celsius.',
        excerpt: 'Temperature-resistant engineering for specialized logistics hubs.',
        category: 'Structural',
        authorName: 'Logistics Liaison',
        image: 'https://images.unsplash.com/photo-1586528116311-ad86d6540674?q=80&w=800'
    },
    {
        title: 'Plasma vs Laser Cutting for Heavy Plate',
        content: 'When dealing with plates thicker than 20mm, plasma cutting often provides a more cost-effective and structurally sound edge than laser. We break down the technical differences and why we choose plasma for heavy structural brackets.',
        excerpt: 'A technical comparison of secondary steel processing techniques.',
        category: 'Fabrication',
        authorName: 'Tech Division',
        image: 'https://images.unsplash.com/photo-1565615833231-e8c91a38a012?q=80&w=800'
    }
];

const seedDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to Database for Expanded Seeding...');
        
        await BlogPost.deleteMany({});
        await BlogPost.insertMany(readyMadeBlogs);
        console.log('Successfully synchronized 6 Industry Intel Reports with synchronized industrial photos.');
        
        mongoose.connection.close();
    } catch (error) {
        console.error('Seeding Protocol Failure:', error);
        process.exit(1);
    }
};

seedDB();
