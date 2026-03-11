const Invoice = require('../models/Invoice');

exports.createInvoice = async (req, res) => {
    try {
        const invoice = await Invoice.create(req.body);
        res.status(201).json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getInvoices = async (req, res) => {
    try {
        let filter = {};
        if (req.user.role === 'customer') {
            filter.customerId = req.user.id;
        }
        const invoices = await Invoice.find(filter).populate('customerId', 'name email').populate('projectId', 'title');
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateInvoicePayment = async (req, res) => {
    try {
        const invoice = await Invoice.findByIdAndUpdate(
            req.params.id,
            { paymentStatus: req.body.paymentStatus, stripePaymentId: req.body.stripePaymentId },
            { new: true }
        );
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
