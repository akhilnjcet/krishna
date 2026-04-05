const mongoose = require('mongoose');
const FAQ = require('./models/FAQ');
require('dotenv').config();

const officialFAQs = [
    { question: "hi hello hey", answer: "Hello! I am the Krishna Engineering AI assistant. How can I help you today? Do you need a quote or have questions about our services?" },
    { question: "Who is Krishna Engineering?", answer: "Krishna Engineering Works is a leading provider of industrial fabrication, structural engineering, and precision welding services based in Kochi, Kerala." },
    { question: "What services do you provide?", answer: "We offer specialized services in heavy fabrication, industrial metal works, structural engineering design, and expert welding solutions." },
    { question: "How can I contact you?", answer: "You can reach us at our Kochi office at +91 94460 00000 or email us at krishnaengineeringworks0715@gmail.com." },
    { question: "Where is your location?", answer: "Our main fabrication unit is located in Kochi, Kerala, India." },
    { question: "How to get a quote?", answer: "To request a quotation, please share your project details and contact number here, or email us your drawings." }
];

async function replace() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        await FAQ.deleteMany({});
        await FAQ.insertMany(officialFAQs);
        console.log('SUCCESS: FAQs updated with greetings.');
        mongoose.connection.close();
    } catch (err) { console.error(err); }
}
replace();
