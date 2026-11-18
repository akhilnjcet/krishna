const mongoose = require('mongoose');

const followUpSchema = new mongoose.Schema({
    scheduledDate: {
        type: Date,
        required: true
    },
    followUpType: {
        type: String,
        enum: ['Call', 'Meeting', 'Site Visit', 'WhatsApp', 'Email'],
        default: 'Call'
    },
    notes: {
        type: String,
        default: ''
    },
    ownerName: {
        type: String,
        default: ''
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Overdue', 'Cancelled'],
        default: 'Pending'
    },
    completedAt: {
        type: Date
    },
    outcome: {
        type: String,
        default: ''
    }
}, { timestamps: true });

const LeadSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    phone: {
        type: String,
        required: true,
        trim: true,
        index: true
    },
    email: {
        type: String,
        trim: true,
        default: ''
    },
    location: {
        type: String,
        default: ''
    },
    message: {
        type: String,
        trim: true,
        default: ''
    },
    source: {
        type: String,
        enum: [
            'Website', 
            'Phone calls', 
            'WhatsApp', 
            'Walk-in customers', 
            'Referrals', 
            'Social media', 
            'AI Chatbot', 
            'Other sources'
        ],
        default: 'AI Chatbot',
        index: true
    },
    requiredService: {
        type: String,
        default: 'General Fabrication'
    },
    projectDescription: {
        type: String,
        default: ''
    },
    estimatedBudget: {
        type: Number,
        default: 0
    },
    expectedCompletionDate: {
        type: Date
    },
    pipelineStage: {
        type: String,
        enum: [
            'New Enquiry',
            'Contacted',
            'Site Visit Required',
            'Site Inspection Completed',
            'Quotation Preparation',
            'Quotation Sent',
            'Negotiation',
            'Won',
            'Lost'
        ],
        default: 'New Enquiry',
        index: true
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    },
    assignedToName: {
        type: String,
        default: ''
    },
    notes: {
        type: String,
        default: ''
    },
    attachments: [{
        type: String
    }],
    lostReason: {
        type: String,
        default: ''
    },
    followUps: [followUpSchema],
    nextFollowUpDate: {
        type: Date,
        index: true
    },
    convertedCustomer: {
        isConverted: { type: Boolean, default: false },
        customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        convertedAt: { type: Date },
        quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Quote', default: null },
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null }
    },
    createdAt: {
        type: Date,
        default: Date.now,
        index: true
    }
}, { timestamps: true });

// Pre-save to set nextFollowUpDate automatically from earliest pending follow-up
LeadSchema.pre('save', function() {
    if (Array.isArray(this.followUps) && this.followUps.length > 0) {
        const pending = this.followUps
            .filter(f => f.status === 'Pending')
            .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
        this.nextFollowUpDate = pending.length > 0 ? pending[0].scheduledDate : null;
    }
});

LeadSchema.index({ pipelineStage: 1, createdAt: -1 });

module.exports = mongoose.model('Lead', LeadSchema);
