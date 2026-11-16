const mongoose = require('mongoose');

const careerContactSettingSchema = new mongoose.Schema({
    whatsappNumber: { 
        type: String, 
        default: '+91 9447940835' 
    },
    phoneNumber: { 
        type: String, 
        default: '+91 9447940835' 
    },
    email: { 
        type: String, 
        default: 'contact@krishnaengg.com' 
    },
    walkInAddress: { 
        type: String, 
        default: 'Krishna Engineering Works, Industrial Area, Thiruvazhiyode, Palakkad.' 
    },
    headingNote: { 
        type: String, 
        default: 'Reach our hiring desk directly via WhatsApp, Phone, or Email with your resume.' 
    },
    updatedAt: { 
        type: Date, 
        default: Date.now 
    },
    updatedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    }
});

module.exports = mongoose.model('CareerContactSetting', careerContactSettingSchema);
