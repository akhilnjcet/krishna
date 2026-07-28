const mongoose = require('mongoose');

const lodgeBillingSettingSchema = new mongoose.Schema({
  defaultBillingCycle: { 
    type: String, 
    enum: ['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'Custom'], 
    default: 'Monthly' 
  },
  customBillingDays: { type: Number, default: 30 },
  generationTime: { type: Number, default: 8 }, // Hour of the day (0-23)
  gracePeriodDays: { type: Number, default: 5 },
  lateFeeAmount: { type: Number, default: 200 },
  lateFeePercent: { type: Number, default: 2 }, // If calculating by percentage
  lateFeeType: { type: String, enum: ['Fixed', 'Percentage'], default: 'Fixed' },
  currency: { type: String, default: 'INR' },
  taxPercent: { type: Number, default: 18 },
  dueDaysCalculation: { type: Number, default: 7 }, // Days allowed to pay
  autoNotificationChannels: [{ type: String, enum: ['WhatsApp', 'Email'] }],
  autoPdfGeneration: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('LodgeBillingSetting', lodgeBillingSettingSchema);
