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
        if (req.user.role !== 'admin') {
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
        const invoice = await Invoice.findById(req.params.id);
        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        // Enforce ownership: only admin or the invoice owner can update payment
        if (req.user.role !== 'admin' && invoice.customerId.toString() !== req.user.id.toString()) {
            return res.status(403).json({ message: 'Access denied: You do not own this invoice.' });
        }

        if (req.body.paymentStatus !== undefined) {
            // Non-admin can only mark as pending or pass valid gateway ID
            if (req.user.role !== 'admin' && !req.body.stripePaymentId && req.body.paymentStatus === 'paid') {
                return res.status(400).json({ message: 'Verification required to mark invoice as paid.' });
            }
            invoice.paymentStatus = req.body.paymentStatus;
        }
        if (req.body.stripePaymentId) {
            invoice.stripePaymentId = req.body.stripePaymentId;
        }

        await invoice.save();
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
