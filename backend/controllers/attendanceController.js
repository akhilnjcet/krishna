const Attendance = require('../models/Attendance');

exports.getAttendanceLogs = async (req, res) => {
    try {
        const { staff_id, date, status, type } = req.query;
        let query = {};

        if (staff_id) query.staff_id = staff_id;
        if (date) query.date = date;
        if (status) query.status = status;
        if (type) query.type = type;

        const logs = await Attendance.find(query)
            .populate('staff_id', 'staff_id name email department designation base_salary')
            .sort({ login_time: -1 });
            
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.getStaffLogs = async (req, res) => {
    try {
        const logs = await Attendance.find({ staff_id: req.user.id })
            .sort({ login_time: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.deleteLog = async (req, res) => {
    try {
        const log = await Attendance.findById(req.params.id);
        if (!log) return res.status(404).json({ message: 'Log not found' });
        await log.deleteOne();
        res.json({ message: 'Log deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateLog = async (req, res) => {
    try {
        const { login_time, check_out } = req.body;
        const log = await Attendance.findById(req.params.id);
        
        if (!log) return res.status(404).json({ message: 'Log not found' });
        
        if (login_time) log.login_time = new Date(login_time);
        if (check_out) log.check_out = new Date(check_out);
        
        if (log.login_time && log.check_out) {
            log.duration_minutes = Math.round((log.check_out - log.login_time) / 60000);
            log.type = 'OUT';
        }
        
        await log.save();
        res.json(log);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
