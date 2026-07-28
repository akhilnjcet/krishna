const BookingLodge = require('../models/BookingLodge');
const Room = require('../models/Room');
const LodgeBillingSetting = require('../models/LodgeBillingSetting');
const LodgeRentBill = require('../models/LodgeRentBill');

// Helper to calculate next cycle date offset
const getNextCycleDate = (startDate, cycle, customDays = 30) => {
  const date = new Date(startDate);
  if (cycle === 'Daily') date.setDate(date.getDate() + 1);
  else if (cycle === 'Weekly') date.setDate(date.getDate() + 7);
  else if (cycle === 'Monthly') date.setMonth(date.getMonth() + 1);
  else if (cycle === 'Quarterly') date.setMonth(date.getMonth() + 3);
  else if (cycle === 'Half-Yearly') date.setMonth(date.getMonth() + 6);
  else if (cycle === 'Yearly') date.setFullYear(date.getFullYear() + 1);
  else if (cycle === 'Custom') date.setDate(date.getDate() + customDays);
  return date;
};

// Main Run Task Engine
const runBillingCheck = async () => {
  try {
    // Get settings
    let setting = await LodgeBillingSetting.findOne();
    if (!setting) {
      setting = new LodgeBillingSetting({});
      await setting.save();
    }

    const today = new Date();
    
    // Find all active bookings
    const activeBookings = await BookingLodge.find({ status: 'active' }).populate('roomId');
    
    for (const booking of activeBookings) {
      const room = booking.roomId;
      if (!room) continue;

      let periodStart = new Date(booking.checkIn);
      const cycle = setting.defaultBillingCycle;
      const customDays = setting.customBillingDays;

      // Loop through cycles starting from checkIn until we cross today's date
      while (periodStart < today) {
        const periodEnd = getNextCycleDate(periodStart, cycle, customDays);
        
        // If the period end has occurred (or is today), check/generate the bill
        if (periodEnd <= today) {
          // Check if bill already exists for this period
          const existingBill = await LodgeRentBill.findOne({
            bookingId: booking._id,
            billingPeriodStart: { $gte: new Date(periodStart.setHours(0,0,0,0)), $lte: new Date(periodStart.setHours(23,59,59,999)) }
          });

          if (!existingBill) {
            // Generate unique bill number
            const billCount = await LodgeRentBill.countDocuments();
            const billNumber = `BLG-${today.getFullYear()}-${String(billCount + 1001)}`;

            // Calculate tax
            const rentAmount = room.price || 0;
            const taxAmount = parseFloat(((rentAmount * setting.taxPercent) / 100).toFixed(2));
            const totalAmount = rentAmount + taxAmount;

            // Calculate Due Date
            const dueDate = new Date(periodEnd);
            dueDate.setDate(dueDate.getDate() + setting.dueDaysCalculation);

            const newBill = new LodgeRentBill({
              billNumber,
              roomId: room._id,
              bookingId: booking._id,
              userId: booking.userId,
              billingPeriodStart: periodStart,
              billingPeriodEnd: periodEnd,
              billingCycle: cycle,
              rentAmount,
              taxAmount,
              totalAmount,
              dueDate,
              status: 'Due',
              outstandingAmount: totalAmount
            });

            await newBill.save();
            console.log(`[Auto-Billing] Generated bill ${billNumber} for Room ${room.type}`);
          }
        }
        
        // Move to next period cycle
        periodStart = periodEnd;
      }
    }

    // Apply Overdue Late Fees
    const overdueBills = await LodgeRentBill.find({
      status: 'Due',
      dueDate: { $lt: today },
      lateFeeApplied: 0 // Only apply once
    });

    for (const bill of overdueBills) {
      // Calculate grace period
      const graceEnd = new Date(bill.dueDate);
      graceEnd.setDate(graceEnd.getDate() + setting.gracePeriodDays);

      if (today > graceEnd) {
        let lateFee = 0;
        if (setting.lateFeeType === 'Fixed') {
          lateFee = setting.lateFeeAmount;
        } else {
          lateFee = parseFloat(((bill.rentAmount * setting.lateFeePercent) / 100).toFixed(2));
        }

        bill.lateFeeApplied = lateFee;
        bill.totalAmount += lateFee;
        bill.outstandingAmount += lateFee;
        await bill.save();
        console.log(`[Auto-Billing] Applied late fee of ₹${lateFee} to overdue bill ${bill.billNumber}`);
      }
    }

  } catch (err) {
    console.error('[Auto-Billing] Engine execution failure:', err);
  }
};

// Start background task (interval set to check every hour)
const startBillingScheduler = () => {
  // Initial check
  runBillingCheck();
  // Hourly check
  setInterval(runBillingCheck, 60 * 60 * 1000);
};

module.exports = {
  startBillingScheduler,
  runBillingCheck
};
