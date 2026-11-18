const mongoose = require('mongoose');
const MachineLog = require('../models/MachineLog');
const InventoryItem = require('../models/InventoryItem');
const ToolRepair = require('../models/ToolRepair');

// ─── LIST MACHINE LOGS (OPERATIONS & DOWNTIME) ───────────────────────
exports.getMachineLogs = async (req, res) => {
    try {
        const { machineId, logType, startDate, endDate, downtimeReason } = req.query;
        const query = {};

        if (machineId) query.machineId = machineId;
        if (logType && logType !== 'All') query.logType = logType;
        if (downtimeReason && downtimeReason !== 'All') query.downtimeReason = downtimeReason;

        if (startDate || endDate) {
            query.date = {};
            if (startDate) query.date.$gte = new Date(startDate);
            if (endDate) query.date.$lte = new Date(endDate);
        }

        const logs = await MachineLog.find(query)
            .populate('machineId', 'name code brand status currentAssignment')
            .populate('operatorId', 'name email phone')
            .populate('projectId', 'title')
            .sort({ date: -1, startTime: -1 });

        res.json({ success: true, count: logs.length, logs });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── RECORD MACHINE LOG (OPERATION OR BREAKDOWN/DOWNTIME) ───────────
exports.recordMachineLog = async (req, res) => {
    try {
        const {
            machineId,
            logType,
            date = new Date(),
            startTime,
            endTime,
            plannedHours = 8,
            operatorId,
            projectId,
            productionPlanId,
            stageName,
            downtimeReason,
            downtimeDescription,
            productionImpact,
            maintenanceCost = 0,
            notes
        } = req.body;

        if (!machineId || !logType || !startTime || !endTime) {
            return res.status(400).json({ success: false, message: 'Machine, log type, start time, and end time are required.' });
        }

        const machine = await InventoryItem.findById(machineId);
        if (!machine) return res.status(404).json({ success: false, message: 'Machine / Tool not found.' });

        const start = new Date(startTime).getTime();
        const end = new Date(endTime).getTime();
        const durationHours = Math.max(0, parseFloat(((end - start) / (1000 * 60 * 60)).toFixed(2)));

        let operatorName = '';
        if (operatorId) {
            const User = require('../models/User');
            const op = await User.findById(operatorId);
            if (op) operatorName = op.name;
        }

        // Create log entry
        const log = new MachineLog({
            machineId: machine._id,
            machineName: machine.name,
            machineCode: machine.code || '',
            logType,
            date: new Date(date),
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            durationHours,
            plannedHours: parseFloat(plannedHours) || 8,
            operatorId: operatorId || null,
            operatorName,
            projectId: projectId || null,
            productionPlanId: productionPlanId || null,
            stageName: stageName || '',
            downtimeReason: logType === 'DOWNTIME' ? (downtimeReason || 'Other') : 'None',
            downtimeDescription: downtimeDescription || '',
            productionImpact: productionImpact || 'None',
            maintenanceCost: parseFloat(maintenanceCost) || 0,
            notes: notes || '',
            recordedBy: req.user?._id,
            recordedByName: req.user?.name || 'Supervisor'
        });

        // If it was a breakdown / downtime with repair cost, link/create ToolRepair if requested
        if (logType === 'DOWNTIME' && parseFloat(maintenanceCost) > 0) {
            const repair = new ToolRepair({
                toolId: machine._id,
                toolName: machine.name,
                toolCode: machine.code || '',
                reportedBy: req.user?.name || 'Supervisor',
                reportedDate: new Date(date),
                issueDescription: downtimeDescription || `Downtime: ${downtimeReason}`,
                repairCost: parseFloat(maintenanceCost),
                status: 'Repaired',
                outcome: 'Repaired',
                completionDate: new Date(endTime),
                resolutionNotes: notes || 'Logged via Machine Downtime tracker'
            });
            await repair.save();
            log.toolRepairId = repair._id;
        }

        // Update machine status if it is currently in downtime
        if (logType === 'DOWNTIME' && new Date(endTime) >= new Date()) {
            machine.status = 'In Repair';
            await machine.save();
        } else if (logType === 'OPERATION' && machine.status === 'In Repair') {
            machine.status = 'Available';
            await machine.save();
        }

        await log.save();
        res.status(201).json({ success: true, message: 'Machine log recorded successfully', log });
    } catch (err) {
        console.error('recordMachineLog error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

// ─── DASHBOARD ANALYTICS & EFFICIENCY METRICS ───────────────────────
exports.getMachineAnalytics = async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query; // '7d' | '30d' | '90d' | 'all'
        let startDate = new Date();
        if (timeframe === '7d') startDate.setDate(startDate.getDate() - 7);
        else if (timeframe === '90d') startDate.setDate(startDate.getDate() - 90);
        else if (timeframe === 'all') startDate = new Date(2020, 0, 1);
        else startDate.setDate(startDate.getDate() - 30); // 30d default

        // Fetch all tool/machinery items
        const machines = await InventoryItem.find({ type: 'tool' });
        const machineIds = machines.map(m => m._id);

        // Fetch logs within timeframe
        const logs = await MachineLog.find({
            machineId: { $in: machineIds },
            date: { $gte: startDate }
        });

        // Fetch maintenance/repair records
        const repairs = await ToolRepair.find({
            toolId: { $in: machineIds },
            createdAt: { $gte: startDate }
        });

        // Aggregate machine-wise metrics
        const machineMetricsMap = {};
        machines.forEach(m => {
            machineMetricsMap[String(m._id)] = {
                id: m._id,
                name: m.name,
                code: m.code || 'EQP-N/A',
                brand: m.brand || 'Industrial',
                status: m.status,
                totalOperatingHours: 0,
                totalDowntimeHours: 0,
                totalIdleHours: 0,
                plannedHours: 0,
                breakdownCount: 0,
                maintenanceCost: 0,
                downtimeReasons: {}
            };
        });

        logs.forEach(l => {
            const mId = String(l.machineId);
            if (machineMetricsMap[mId]) {
                const metric = machineMetricsMap[mId];
                metric.plannedHours += (l.plannedHours || 8);
                if (l.logType === 'OPERATION') {
                    metric.totalOperatingHours += (l.durationHours || 0);
                } else if (l.logType === 'DOWNTIME') {
                    metric.totalDowntimeHours += (l.durationHours || 0);
                    metric.breakdownCount += 1;
                    metric.maintenanceCost += (l.maintenanceCost || 0);
                    const reason = l.downtimeReason || 'Other';
                    metric.downtimeReasons[reason] = (metric.downtimeReasons[reason] || 0) + (l.durationHours || 0);
                } else if (l.logType === 'IDLE') {
                    metric.totalIdleHours += (l.durationHours || 0);
                } else if (l.logType === 'MAINTENANCE') {
                    metric.totalDowntimeHours += (l.durationHours || 0);
                    metric.maintenanceCost += (l.maintenanceCost || 0);
                }
            }
        });

        // Add repair costs from ToolRepair
        repairs.forEach(r => {
            const mId = String(r.toolId);
            if (machineMetricsMap[mId]) {
                // If not already counted in logs
                machineMetricsMap[mId].maintenanceCost += (r.repairCost || 0);
            }
        });

        const machineMetricsList = Object.values(machineMetricsMap).map(m => {
            const totalRecordedHours = m.totalOperatingHours + m.totalDowntimeHours + m.totalIdleHours;
            const effectiveBaseHours = m.plannedHours > 0 ? m.plannedHours : (totalRecordedHours || 1);
            
            // Availability % = (Planned Hours - Downtime Hours) / Planned Hours * 100
            const availabilityPct = Math.max(0, Math.min(100, Math.round(((effectiveBaseHours - m.totalDowntimeHours) / effectiveBaseHours) * 100)));
            // Utilization % = Operating Hours / Planned Hours * 100
            const utilizationPct = Math.max(0, Math.min(100, Math.round((m.totalOperatingHours / effectiveBaseHours) * 100)));

            return {
                ...m,
                availabilityPct,
                utilizationPct,
                totalOperatingHours: parseFloat(m.totalOperatingHours.toFixed(1)),
                totalDowntimeHours: parseFloat(m.totalDowntimeHours.toFixed(1)),
                totalIdleHours: parseFloat(m.totalIdleHours.toFixed(1)),
                maintenanceCost: Math.round(m.maintenanceCost)
            };
        });

        // Top utilized machines
        const mostUtilized = [...machineMetricsList].sort((a, b) => b.totalOperatingHours - a.totalOperatingHours).slice(0, 5);
        // Machines with maximum downtime
        const maxDowntime = [...machineMetricsList].sort((a, b) => b.totalDowntimeHours - a.totalDowntimeHours).slice(0, 5);
        // Highest maintenance cost machines
        const highestMaintenanceCost = [...machineMetricsList].sort((a, b) => b.maintenanceCost - a.maintenanceCost).slice(0, 5);

        // Global KPI Aggregation
        const totalMachines = machines.length;
        const availableMachines = machines.filter(m => m.status === 'Available').length;
        const inRepairMachines = machines.filter(m => m.status === 'In Repair').length;
        const totalOperatingHoursAll = machineMetricsList.reduce((s, m) => s + m.totalOperatingHours, 0);
        const totalDowntimeHoursAll = machineMetricsList.reduce((s, m) => s + m.totalDowntimeHours, 0);
        const totalMaintenanceCostAll = machineMetricsList.reduce((s, m) => s + m.maintenanceCost, 0);
        const avgAvailabilityPct = machineMetricsList.length > 0
            ? Math.round(machineMetricsList.reduce((s, m) => s + m.availabilityPct, 0) / machineMetricsList.length)
            : 100;

        res.json({
            success: true,
            timeframe,
            summary: {
                totalMachines,
                availableMachines,
                inRepairMachines,
                totalOperatingHoursAll: parseFloat(totalOperatingHoursAll.toFixed(1)),
                totalDowntimeHoursAll: parseFloat(totalDowntimeHoursAll.toFixed(1)),
                totalMaintenanceCostAll,
                avgAvailabilityPct
            },
            mostUtilized,
            maxDowntime,
            highestMaintenanceCost,
            machines: machineMetricsList
        });
    } catch (err) {
        console.error('getMachineAnalytics error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};
