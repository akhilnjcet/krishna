const mongoose = require('mongoose');

const lodgePaymentSettingSchema = new mongoose.Schema({
  upiId: { type: String, default: 'krishnaengineering@upi' },
  merchantName: { type: String, default: 'Krishna Engineering Works' },
  merchantDisplayName: { type: String, default: 'Krishna Lodge & Complex' },
  bankName: { type: String, default: 'State Bank of India' },
  accountHolder: { type: String, default: 'Krishna Engineering Works' },
  accountNumber: { type: String, default: '39485720194' },
  ifsc: { type: String, default: 'SBIN0001234' },
  branch: { type: String, default: 'Kuttanassery, Palakkad' },
  qrLogoUrl: { type: String, default: '/logo512.png' },
  paymentInstructions: { type: String, default: 'Please mention your Room Number and Booking ID in your UPI notes or payment reference.' },
  allowedAdditionalCharges: {
    type: [String],
    default: [
      'Electricity', 'Water', 'Wi-Fi', 'Internet', 'Maintenance', 'Parking',
      'Laundry', 'Housekeeping', 'Cleaning', 'Food', 'Gas', 'Cable TV',
      'Security Deposit', 'Advance Payment', 'Damage Charges', 'Miscellaneous'
    ]
  }
}, { timestamps: true });

module.exports = mongoose.model('LodgePaymentSetting', lodgePaymentSettingSchema);
