const FAQ = require('../models/FAQ');

exports.getFAQs = async (req, res) => {
    try {
        const faqs = await FAQ.find().sort({ createdAt: -1 });
        res.json(faqs);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

exports.addFAQ = async (req, res) => {
    try {
        const { question, answer } = req.body;
        const newFAQ = new FAQ({ question, answer });
        await newFAQ.save();
        res.status(201).json(newFAQ);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

exports.deleteFAQ = async (req, res) => {
    try {
        await FAQ.findByIdAndDelete(req.params.id);
        res.json({ message: "FAQ deleted" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};
