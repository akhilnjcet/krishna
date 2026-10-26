const LodgeBillingSetting = require('../models/LodgeBillingSetting');
const LodgeRentBill = require('../models/LodgeRentBill');
const Room = require('../models/Room');
const BookingLodge = require('../models/BookingLodge');
const User = require('../models/User');

// Get current billing settings
exports.getSettings = async (req, res) => {
  try {
    let setting = await LodgeBillingSetting.findOne();
    if (!setting) {
      setting = new LodgeBillingSetting({});
      await setting.save();
    }
    res.status(200).json(setting);
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving billing settings.', error: err.message });
  }
};

// Update billing settings
exports.saveSettings = async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized. Admins only.' });
    }

    let setting = await LodgeBillingSetting.findOne();
    if (!setting) {
      setting = new LodgeBillingSetting(req.body);
    } else {
      Object.assign(setting, req.body);
    }

    await setting.save();
    res.status(200).json({ message: 'Settings updated successfully.', setting });
  } catch (err) {
    res.status(500).json({ message: 'Error saving billing settings.', error: err.message });
  }
};

// Retrieve Generated Bills
exports.getBills = async (req, res) => {
  try {
    const {
      search,
      status,
      category,
      dateRange,
      sort,
      page = 1,
      limit = 20,
      archived = 'false'
    } = req.query;

    const query = {};

    // Role-based visibility: only admin can view all bills; other users only see their own
    if (req.user.role !== 'admin') {
      query.userId = req.user.id || req.user._id;
    }

    query.archived = archived === 'true';

    if (status) {
      query.status = status;
    }

    // Filter by date ranges
    if (dateRange) {
      const today = new Date();
      today.setHours(0,0,0,0);
      if (dateRange === 'Today') {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        query.createdAt = { $gte: today, $lt: tomorrow };
      } else if (dateRange === 'Yesterday') {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        query.createdAt = { $gte: yesterday, $lt: today };
      } else if (dateRange === 'This Week') {
        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        query.createdAt = { $gte: startOfWeek };
      } else if (dateRange === 'This Month') {
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        query.createdAt = { $gte: startOfMonth };
      } else if (dateRange === 'This Year') {
        const startOfYear = new Date(today.getFullYear(), 0, 1);
        query.createdAt = { $gte: startOfYear };
      }
    }

    // Search query
    if (search) {
      const matchedUsers = await User.find({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { phone: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');
      const userIds = matchedUsers.map(u => u._id);

      query.$or = [
        { billNumber: { $regex: search, $options: 'i' } },
        { userId: { $in: userIds } }
      ];
    }

    // Sorting options
    let sortOption = { createdAt: -1 };
    if (sort) {
      if (sort === 'Oldest First') sortOption = { createdAt: 1 };
      else if (sort === 'Highest Amount') sortOption = { totalAmount: -1 };
      else if (sort === 'Lowest Amount') sortOption = { totalAmount: 1 };
      else if (sort === 'Document Number') sortOption = { billNumber: 1 };
    }

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    const [bills, total] = await Promise.all([
      LodgeRentBill.find(query)
        .populate('roomId', 'roomNumber type price building floor')
        .populate('userId', 'name phone email address')
        .populate('receivedBy', 'name email')
        .sort(sortOption)
        .skip(skip)
        .limit(parsedLimit)
        .lean(),
      LodgeRentBill.countDocuments(query)
    ]);

    res.status(200).json({
      bills,
      total,
      page: parsedPage,
      pages: Math.ceil(total / parsedLimit)
    });
  } catch (err) {
    res.status(500).json({ message: 'Error retrieving bills.', error: err.message });
  }
};

// Record Rent Payment (Process Bill Pay)
exports.payBill = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, transactionId, electricityCharges, waterCharges, maintenanceCharges, extraCharges, discount } = req.body;

    const bill = await LodgeRentBill.findById(id);
    if (!bill) {
      return res.status(404).json({ message: 'Rent bill not found.' });
    }

    // Update optional billing parameters if logged
    if (electricityCharges !== undefined) bill.electricityCharges = electricityCharges;
    if (waterCharges !== undefined) bill.waterCharges = waterCharges;
    if (maintenanceCharges !== undefined) bill.maintenanceCharges = maintenanceCharges;
    if (extraCharges !== undefined) bill.extraCharges = extraCharges;
    if (discount !== undefined) bill.discount = discount;

    // Recalculate totals
    const finalRent = bill.rentAmount + 
                     (bill.electricityCharges || 0) + 
                     (bill.waterCharges || 0) + 
                     (bill.maintenanceCharges || 0) + 
                     (bill.extraCharges || 0) - 
                     (bill.discount || 0) + 
                     bill.taxAmount + 
                     bill.lateFeeApplied;

    bill.totalAmount = finalRent;
    bill.status = 'Paid';
    bill.paymentDate = new Date();
    bill.paymentMethod = paymentMethod || 'Cash';
    bill.transactionId = transactionId || 'TXN-DIRECT';
    bill.receivedBy = req.user.id;
    bill.outstandingAmount = 0;

    await bill.save();
    res.status(200).json({ message: 'Payment recorded successfully.', bill });
  } catch (err) {
    res.status(500).json({ message: 'Error updating payment.', error: err.message });
  }
};

// Toggle Archive status
exports.toggleArchiveBill = async (req, res) => {
  try {
    const { id } = req.params;
    const bill = await LodgeRentBill.findById(id);
    if (!bill) {
      return res.status(404).json({ message: 'Rent bill not found.' });
    }

    bill.archived = !bill.archived;
    await bill.save();

    res.status(200).json({ message: `Bill status ${bill.archived ? 'archived' : 'restored'} successfully.`, bill });
  } catch (err) {
    res.status(500).json({ message: 'Error archiving bill.', error: err.message });
  }
};

// Fetch Dashboard Analytics
exports.getDashboardStats = async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const [
      totalRooms,
      occupiedRooms,
      billsGenerated,
      paidBills,
      dueBills,
      paidBillsThisMonth,
      outstandingBills
    ] = await Promise.all([
      Room.countDocuments({ isActive: true }),
      BookingLodge.countDocuments({ status: 'active' }),
      LodgeRentBill.countDocuments({ archived: false }),
      LodgeRentBill.countDocuments({ status: 'Paid', archived: false }),
      LodgeRentBill.countDocuments({ status: 'Due', archived: false }),
      LodgeRentBill.find({
        status: 'Paid',
        paymentDate: { $gte: startOfMonth },
        archived: false
      }).select('totalAmount').lean(),
      LodgeRentBill.find({
        status: 'Due',
        archived: false
      }).select('outstandingAmount').lean()
    ]);

    const vacantRooms = Math.max(0, totalRooms - occupiedRooms);
    const monthlyRevenue = paidBillsThisMonth.reduce((acc, b) => acc + (b.totalAmount || 0), 0);
    const outstandingAmount = outstandingBills.reduce((acc, b) => acc + (b.outstandingAmount || 0), 0);

    res.status(200).json({
      totalRooms,
      occupiedRooms,
      vacantRooms,
      billsGenerated,
      paidBills,
      dueBills,
      monthlyRevenue,
      outstandingAmount
    });
  } catch (err) {
    res.status(500).json({ message: 'Error loading dashboard metrics.', error: err.message });
  }
};

// Fetch Revenue Reports
exports.getRevenueReport = async (req, res) => {
  try {
    const bills = await LodgeRentBill.find({ status: 'Paid', archived: false })
      .populate('roomId', 'type')
      .populate('userId', 'name');

    res.status(200).json(bills);
  } catch (err) {
    res.status(500).json({ message: 'Error loading revenue reports.', error: err.message });
  }
};

// Create and Save a Generated Bill
exports.createBill = async (req, res) => {
  try {
    const {
      roomId,
      bookingId,
      userId,
      billNumber,
      rentAmount,
      electricityCharges,
      waterCharges,
      maintenanceCharges,
      extraCharges,
      additionalCharges,
      discount,
      tax,
      taxAmount,
      grandTotal,
      totalAmount,
      outstandingAmount,
      status,
      dueDate,
      billingPeriodStart,
      billingPeriodEnd,
      billingCycle,
      paymentMethod,
      transactionId,
      paymentDate
    } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: 'Room ID is required.' });
    }

    // Resolve booking and user if not explicitly passed
    let resolvedBookingId = bookingId;
    let resolvedUserId = userId;

    if (!resolvedBookingId || !resolvedUserId) {
      const activeBooking = await BookingLodge.findOne({ roomId, status: 'active' });
      if (activeBooking) {
        if (!resolvedBookingId) resolvedBookingId = activeBooking._id;
        if (!resolvedUserId) resolvedUserId = activeBooking.userId;
      }
    }

    // If still no user, use authenticated user
    if (!resolvedUserId && req.user) {
      resolvedUserId = req.user.id || req.user._id;
    }

    // Calculate charges and totals
    const finalRentAmount = Number(rentAmount) || 0;
    const finalTaxAmount = taxAmount !== undefined ? Number(taxAmount) : (tax !== undefined ? Number(tax) : 0);
    const finalDiscount = Number(discount) || 0;

    let sumAdditional = Number(extraCharges) || 0;
    if (Array.isArray(additionalCharges)) {
      sumAdditional += additionalCharges.reduce((acc, c) => acc + (Number(c.amount) || 0), 0);
    }

    const calculatedTotal = totalAmount !== undefined
      ? Number(totalAmount)
      : (grandTotal !== undefined ? Number(grandTotal) : (finalRentAmount + sumAdditional + finalTaxAmount - finalDiscount));

    // Normalize Status
    let normalizedStatus = 'Due';
    if (status === 'Paid') {
      normalizedStatus = 'Paid';
    } else if (status === 'Partially Paid') {
      normalizedStatus = 'Partially Paid';
    } else {
      normalizedStatus = 'Due';
    }

    const finalOutstanding = normalizedStatus === 'Paid'
      ? 0
      : (outstandingAmount !== undefined ? Number(outstandingAmount) : calculatedTotal);

    // Bill Number generation
    let finalBillNumber = billNumber;
    if (!finalBillNumber) {
      finalBillNumber = `INV-${Date.now().toString().slice(-6)}`;
    }

    // Ensure unique billNumber
    const existing = await LodgeRentBill.findOne({ billNumber: finalBillNumber });
    if (existing) {
      finalBillNumber = `INV-${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 10)}`;
    }

    const startDate = billingPeriodStart ? new Date(billingPeriodStart) : new Date();
    const endDate = billingPeriodEnd ? new Date(billingPeriodEnd) : (() => {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + 1);
      return d;
    })();

    const finalDueDate = dueDate ? new Date(dueDate) : (() => {
      const d = new Date();
      d.setDate(d.getDate() + 7);
      return d;
    })();

    const newBill = new LodgeRentBill({
      billNumber: finalBillNumber,
      roomId,
      bookingId: resolvedBookingId,
      userId: resolvedUserId,
      billingPeriodStart: startDate,
      billingPeriodEnd: endDate,
      billingCycle: billingCycle || 'Monthly',
      rentAmount: finalRentAmount,
      electricityCharges: Number(electricityCharges) || 0,
      waterCharges: Number(waterCharges) || 0,
      maintenanceCharges: Number(maintenanceCharges) || 0,
      extraCharges: sumAdditional,
      additionalCharges: Array.isArray(additionalCharges) ? additionalCharges : [],
      discount: finalDiscount,
      taxAmount: finalTaxAmount,
      totalAmount: calculatedTotal,
      dueDate: finalDueDate,
      status: normalizedStatus,
      outstandingAmount: finalOutstanding,
      paymentDate: normalizedStatus === 'Paid' ? (paymentDate ? new Date(paymentDate) : new Date()) : undefined,
      paymentMethod: normalizedStatus === 'Paid' ? (paymentMethod || 'Cash') : undefined,
      transactionId: transactionId || undefined,
      receivedBy: req.user ? req.user.id || req.user._id : undefined
    });

    await newBill.save();

    res.status(201).json({
      message: 'Bill created and saved successfully.',
      bill: newBill
    });
  } catch (err) {
    console.error('Error creating lodge rent bill:', err);
    res.status(500).json({ message: 'Error saving bill to database.', error: err.message });
  }
};
