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

    // Role-based visibility
    if (req.user.role === 'customer') {
      query.userId = req.user.id;
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

    const bills = await LodgeRentBill.find(query)
      .populate('roomId')
      .populate('userId', 'name phone email address')
      .populate('receivedBy', 'name email')
      .sort(sortOption)
      .skip(skip)
      .limit(parsedLimit);

    const total = await LodgeRentBill.countDocuments(query);

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
    const totalRooms = await Room.countDocuments({ isActive: true });
    
    // Find active bookings count
    const occupiedRooms = await BookingLodge.countDocuments({ status: 'active' });
    const vacantRooms = Math.max(0, totalRooms - occupiedRooms);

    // Bills status counts
    const billsGenerated = await LodgeRentBill.countDocuments({ archived: false });
    const paidBills = await LodgeRentBill.countDocuments({ status: 'Paid', archived: false });
    const dueBills = await LodgeRentBill.countDocuments({ status: 'Due', archived: false });

    // Monthly revenue totals
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0,0,0,0);

    const paidBillsThisMonth = await LodgeRentBill.find({
      status: 'Paid',
      paymentDate: { $gte: startOfMonth },
      archived: false
    });
    const monthlyRevenue = paidBillsThisMonth.reduce((acc, b) => acc + b.totalAmount, 0);

    const outstandingBills = await LodgeRentBill.find({
      status: 'Due',
      archived: false
    });
    const outstandingAmount = outstandingBills.reduce((acc, b) => acc + b.outstandingAmount, 0);

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
