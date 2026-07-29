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
  autoPdfGeneration: { type: Boolean, default: true },
  rentPaymentPolicy: { type: String, default: 'Rent must be paid strictly on or before the due date of every billing cycle.' },
  latePaymentPolicy: { type: String, default: 'A late fee will be applicable after the grace period of 5 days.' },
  visitorPolicy: { type: String, default: 'Visitors are permitted between 9:00 AM and 8:00 PM with front desk registration.' },
  damagePolicy: { type: String, default: 'Tenants are liable for any damages to room furniture, appliances, or fixtures.' },
  cancellationPolicy: { type: String, default: 'Cancellations before check-in date will receive refunds per lodge policy terms.' },
  securityDepositPolicy: { type: String, default: 'Security deposit is refundable upon clearance of all dues and inspection.' },
  maintenancePolicy: { type: String, default: 'Routine maintenance requests must be logged through the tenant support portal.' },
  vacatingPolicy: { type: String, default: 'A 15-day prior written notice is mandatory before vacating the room unit.' }
}, { timestamps: true });

module.exports = mongoose.model('LodgeBillingSetting', lodgeBillingSettingSchema);
