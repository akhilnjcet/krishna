require('dotenv').config();
const mongoose = require('mongoose');
const BlogPost = require('./models/BlogPost');
const connectDB = require('./config/database');

const blogs = [
    {
        title: "The Future of Heavy Structural Fabrication in Kerala",
        excerpt: "Exploring how modern engineering techniques are transforming the industrial landscape of Kerala through innovative steel fabrication.",
        content: "Structural fabrication is the backbone of modern industrial development. In Kerala, where the climate and terrain present unique challenges, Krishna Engineering Works has pioneered the use of high-grade corrosive-resistant steel and advanced welding protocols. From massive factory shells to delicate bridge supports, the future lies in precision, sustainability, and 'Unyielding Integrity'. We are moving towards fully automated assembly lines while maintaining the handcrafted quality our clients expect.",
        category: "Structural",
        image: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?q=80&w=1200",
        authorName: "Chief Engineer"
    },
    {
        title: "Why Industrial Metal Roofing is the Best Choice for Factories",
        excerpt: "A deep dive into why metal roofing outlasts traditional materials in heavy industrial environments.",
        content: "Industrial roofing is not just about covering a building; it's about protecting assets, ensuring insulation, and providing structural rigidity. At Krishna Engineering Works, we specialize in multi-layered metal roofing systems that offer superior thermal performance and zero leakage guarantees. Our roofing solutions are designed to withstand the heavy monsoon seasons of South India without compromise.",
        category: "Roofing",
        image: "https://images.unsplash.com/photo-1541888946425-d81bb1930060?q=80&w=1200",
        authorName: "Structural Specialist"
    },
    {
        title: "The Importance of Precision TIG Welding in Infrastructure",
        excerpt: "Understanding why TIG welding is essential for components that require maximum strength and cleanliness.",
        content: "Tungsten Inert Gas (TIG) welding is an art form as much as a science. When dealing with critical structural components, the quality of the weld can be the difference between a lifetime of service and catastrophic failure. We utilize precision TIG welding for high-stress joints, ensuring a clean, strong, and visually superior finish that meets international safety standards.",
        category: "Welding",
        image: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=1200",
        authorName: "Welding Supervisor"
    },
    {
        title: "Structural Safety: How We Build Unyielding Industrial Sheds",
        excerpt: "An overview of our zero-tolerance safety protocols during the construction of industrial workspaces.",
        content: "Building an industrial shed requires more than just steel—it requires a commitment to safety. Our process involves rigorous load-bearing analysis, seismic-resistant designs, and multi-point quality checks. Every truss and column we install at Krishna Engineering Works is tested to exceed the required stress limits, ensuring that your workforce and machinery are protected by the best engineering Kerala has to offer.",
        category: "Construction",
        image: "https://images.unsplash.com/photo-1517089534706-3d5efebb2442?q=80&w=1200",
        authorName: "Safety Director"
    },
    {
        title: "Modernizing Warehouse Construction with Sustainable Steel",
        excerpt: "How eco-friendly steel practices are making warehouse construction faster and more affordable.",
        content: "Sustainability in engineering is no longer optional. By using recycled high-tensile steel and optimizing our fabrication process to minimize waste, we are providing clients with 'Green Warehousing' solutions. These structures are not only better for the environment but are also more cost-effective due to their modular design and reduced maintenance requirements.",
        category: "Sustainable",
        image: "https://images.unsplash.com/photo-1586528116311-ad86d6f54dfc?q=80&w=1200",
        authorName: "Design Lead"
    },
    {
        title: "The Role of Pre-Engineered Buildings (PEB) in Rapid Expansion",
        excerpt: "Why PEB is the go-to solution for businesses looking to scale their physical footprint quickly.",
        content: "Time is money in the business world. Pre-Engineered Buildings (PEB) allow for rapid on-site assembly without sacrificing structural integrity. Our PEB solutions are custom-designed in-house at Krishna Engineering Works and delivered as ready-to-install components, cutting construction time by up to 50% compared to traditional methods.",
        category: "PEB",
        image: "https://images.unsplash.com/photo-1581094288338-2314dddb7ecb?q=80&w=1200",
        authorName: "Project Manager"
    },
    {
        title: "Corrosion Prevention: Extending the Life of Steel Structures",
        excerpt: "Expert tips on coatings and finishes that protect your steel assets from the elements.",
        content: "External factors like humidity and acidic rain can devastate steel structures over time. We implement a multi-stage coating process, including hot-dip galvanization and high-performance epoxy primers. This ensures that every piece of steel leaving our workshop is armored against corrosion, drastically reducing long-term maintenance costs for our clients.",
        category: "Maintenance",
        image: "https://images.unsplash.com/photo-1533035353720-f1c6a75cd8ab?q=80&w=1200",
        authorName: "Coating Specialist"
    },
    {
        title: "Custom Gate Fabrication: Combining Security with Aesthetics",
        excerpt: "Designing industrial and residential gates that don't just look good but provide maximum security.",
        content: "A gate is the first line of defense and the first impression of your property. We specialize in custom heavy-duty motorized gates that incorporate modern aesthetics with heavy-gauge steel security. Whether for a large factory entrance or a private estate, our fabrication team ensures a perfect blend of form and function.",
        category: "Fabrication",
        image: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1200",
        authorName: "Artistic Lead"
    },
    {
        title: "The Art of Crane Supportive Truss Systems",
        excerpt: "The technical challenges of building trusses that can handle the dynamic loads of industrial cranes.",
        content: "Installing overhead cranes requires a truss system that can handle immense static and dynamic weight. We calculate the deflection and stress distribution with pinpoint accuracy, ensuring that the supportive structures remain stable even under maximum load operations. At Krishna Engineering Works, we 'Reinforce the Backbone' of your factory.",
        category: "Mechanical",
        image: "https://images.unsplash.com/photo-1535136029864-cf955a8db06d?q=80&w=1200",
        authorName: "Structural Engineer"
    },
    {
        title: "Efficiency in Industrial Workspace Design: An Engineering Perspective",
        excerpt: "How the layout of your steel structure can improve workflow and productivity.",
        content: "Engineering isn't just about putting beams together; it's about optimizing space. A well-designed industrial layout considers airflow, machinery placement, and worker safety. Our design consultants work closely with architects to ensure that the skeletal structure of your building enhances, rather than hinders, your daily operations.",
        category: "Consulting",
        image: "https://images.unsplash.com/photo-1503387762-592dea58ef23?q=80&w=1200",
        authorName: "Industrial Consultant"
    }
];

const seedDB = async () => {
    try {
        await connectDB();
        await BlogPost.deleteMany({}); // Optional: Clear existing blogs first
        await BlogPost.insertMany(blogs);
        console.log("Database Seeded with 10 Professional Articles!");
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

seedDB();
