const mongoose = require('mongoose');
const FAQ = require('./models/FAQ');
require('dotenv').config();

const sampleFAQs = [
    { question: "Contact Information", answer: "You can contact Krishna Engineering Works at +91 94460 00000 or email us at krishnaengineeringworks0715@gmail.com. We are located in Kochi, Kerala." },
    { question: "Services Offered", answer: "We specialize in precision fabrication, industrial welding, structural engineering, and customized metal works for industrial clients." },
    { question: "Business Hours", answer: "We are open Monday to Saturday, from 9:00 AM to 6:00 PM." },
    { question: "Quote Request", answer: "To get a quote, please share your requirements and phone number. Our engineers will get back to you within 24 hours." },
    { question: "Location", answer: "Our workshop is located in Kochi, Kerala, India." }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');
        
        // Only seed if empty
        const count = await FAQ.countDocuments();
        if (count === 0) {
            await FAQ.insertMany(sampleFAQs);
            console.log('FAQs Seeded Successfully!');
        } else {
            console.log(`DB already has ${count} FAQs. Skipping seeding.`);
        }
        
        mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
}

seed();
